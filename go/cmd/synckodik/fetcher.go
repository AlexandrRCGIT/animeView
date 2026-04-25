package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"animeview/go/internal/kodik"
)

const (
	kodikAPIBase = "https://kodik-api.com"
	maxPages     = 500
	batchSize    = 50
)

type pageItems struct {
	items []kodik.Result
	err   error
}

// fetchAllFresh fetches Kodik pages sorted by updated_at desc.
// Returns a channel of pageItems batches and a cancel function.
// Producer goroutine runs until allOld, no next_page, maxPages, or ctx cancelled.
// Buffer size 2 allows fetch to be 1 page ahead of processing (pipeline).
func fetchAllFresh(ctx context.Context, token string, cutoffMs int64) (<-chan pageItems, func()) {
	ch := make(chan pageItems, 2)

	ctx, cancel := context.WithCancel(ctx)

	firstURL := fmt.Sprintf(
		"%s/list?token=%s&types=anime,anime-serial&has_field=shikimori_id"+
			"&lgbt=false&with_episodes_data=true&with_material_data=true"+
			"&limit=100&sort=updated_at&order=desc",
		kodikAPIBase, token,
	)

	client := &http.Client{Timeout: 30 * time.Second}

	go func() {
		defer close(ch)
		nextURL := firstURL
		pages := 0

		for pages < maxPages && nextURL != "" {
			items, next, err := fetchPage(ctx, client, nextURL)
			if err != nil {
				select {
				case ch <- pageItems{err: err}:
				case <-ctx.Done():
				}
				return
			}
			pages++

			// Filter to items newer than cutoff; stop if all are old
			fresh := make([]kodik.Result, 0, len(items))
			allOld := true
			for _, item := range items {
				ts, _ := time.Parse(time.RFC3339, item.UpdatedAt)
				if ts.UnixMilli() >= cutoffMs {
					allOld = false
					fresh = append(fresh, item)
				}
			}

			if len(fresh) > 0 {
				select {
				case ch <- pageItems{items: fresh}:
				case <-ctx.Done():
					return
				}
			}

			if allOld || next == "" {
				return
			}
			nextURL = next
		}
	}()

	return ch, cancel
}

func fetchPage(ctx context.Context, client *http.Client, pageURL string) ([]kodik.Result, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, pageURL, nil)
	if err != nil {
		return nil, "", err
	}
	req.Header.Set("User-Agent", "AnimeView/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusTooManyRequests {
		time.Sleep(2 * time.Second)
		return nil, "", fmt.Errorf("rate limited by Kodik (429)")
	}
	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("kodik HTTP %d", resp.StatusCode)
	}

	var data kodik.ListResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, "", fmt.Errorf("decode: %w", err)
	}
	return data.Results, data.NextPage, nil
}

// groupByShikiID groups results by shikimori_id and returns one canonical per ID.
func groupByShikiID(items []kodik.Result) map[int]kodik.Result {
	byID := make(map[int][]kodik.Result)
	for _, item := range items {
		id, ok := item.ShikimoriIDInt()
		if !ok || id == 0 {
			continue
		}
		byID[id] = append(byID[id], item)
	}
	canonical := make(map[int]kodik.Result, len(byID))
	for id, group := range byID {
		canonical[id] = pickCanonical(group)
	}
	return canonical
}
