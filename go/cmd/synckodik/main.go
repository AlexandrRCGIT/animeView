package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"animeview/go/internal/supabase"
)

const (
	lastSyncKey    = "sync:kodik:last_fresh"
	syncedIDsKey   = "sync:kodik:last_synced_ids"
	fallbackWindow = 25 * time.Hour
)

func main() {
	token := os.Getenv("KODIK_TOKEN")
	supabaseURL := os.Getenv("SUPABASE_URL")
	if supabaseURL == "" {
		supabaseURL = os.Getenv("NEXT_PUBLIC_SUPABASE_URL")
	}
	supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	appURL := os.Getenv("NEXT_APP_URL")
	cronSecret := os.Getenv("CRON_SECRET")

	if token == "" || supabaseURL == "" || supabaseKey == "" {
		log.Fatal("KODIK_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY are required")
	}
	if appURL == "" {
		appURL = "http://localhost:3000"
	}

	ctx := context.Background()
	supa := supabase.New(supabaseURL, supabaseKey)

	// 1. Read last sync timestamp
	runStartMs := time.Now().UnixMilli()
	lastSyncMs := time.Now().Add(-fallbackWindow).UnixMilli()

	if cached, err := supa.GetCache(ctx, lastSyncKey); err == nil && cached != nil {
		if ts, ok := cached["ts"].(float64); ok {
			lastSyncMs = int64(ts)
		}
	}

	log.Printf("[synckodik] Syncing since %s", time.UnixMilli(lastSyncMs).UTC().Format(time.RFC3339))

	// 2. Load DMCA blocklist — these IDs must never be re-synced
	dmcaBlocked, err := supa.GetDmcaBlockedIDs(ctx)
	if err != nil {
		log.Printf("[synckodik] warning: could not load DMCA blocklist: %v", err)
		dmcaBlocked = map[int]struct{}{}
	} else if len(dmcaBlocked) > 0 {
		log.Printf("[synckodik] DMCA blocklist: %d IDs", len(dmcaBlocked))
	}

	// 3. Fetch pages via producer-consumer pipeline
	ch, cancel := fetchAllFresh(ctx, token, lastSyncMs)
	defer cancel()

	upserted := 0
	errors := 0
	pages := 0
	var syncedIDs []int

	batch := make([]map[string]any, 0, batchSize)

	flush := func() {
		if len(batch) == 0 {
			return
		}
		if err := supa.BatchUpsert(ctx, "anime", batch); err != nil {
			log.Printf("[synckodik] batch upsert error: %v", err)
			errors += len(batch)
		} else {
			upserted += len(batch)
		}
		batch = batch[:0]
	}

	for result := range ch {
		if result.err != nil {
			log.Printf("[synckodik] fetch error: %v", result.err)
			errors++
			break
		}
		pages++

		for id, canonical := range groupByShikiID(result.items) {
			if _, blocked := dmcaBlocked[id]; blocked {
				continue
			}
			row := buildAnimeRow(canonical)
			batch = append(batch, row)
			syncedIDs = append(syncedIDs, id)
			if len(batch) >= batchSize {
				flush()
			}
		}
	}
	flush()

	log.Printf("[synckodik] Done. Pages: %d, Upserted: %d, Errors: %d", pages, upserted, errors)

	// 3. Save synced IDs for cron/daily enrichRelated
	if len(syncedIDs) > 0 {
		ids := make([]any, len(syncedIDs))
		for i, id := range syncedIDs {
			ids[i] = id
		}
		if err := supa.SetCache(ctx, syncedIDsKey, map[string]any{"ids": ids}); err != nil {
			log.Printf("[synckodik] failed to save synced IDs: %v", err)
		}
	}

	// 4. Save new timestamp (only if sync had some success)
	if errors == 0 || upserted > 0 {
		if err := supa.SetCache(ctx, lastSyncKey, map[string]any{"ts": float64(runStartMs)}); err != nil {
			log.Printf("[synckodik] failed to save timestamp: %v", err)
		}
	}

	// 5. Trigger home cache refresh
	refreshURL := appURL + "/api/refresh-cache"
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, refreshURL, nil)
	if cronSecret != "" {
		req.Header.Set("Authorization", "Bearer "+cronSecret)
	}
	if resp, err := http.DefaultClient.Do(req); err != nil {
		log.Printf("[synckodik] refresh-cache error: %v", err)
	} else {
		resp.Body.Close()
		log.Printf("[synckodik] refresh-cache: %d", resp.StatusCode)
	}

	fmt.Printf("synckodik complete: upserted=%d errors=%d pages=%d\n", upserted, errors, pages)
}
