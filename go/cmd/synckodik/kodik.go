package main

import (
	"time"

	"animeview/go/internal/kodik"
)

// pickCanonical mirrors pickCanonical from syncFromKodik.ts.
// Priority: has seasons > more episodes > has material_data > newer updated_at.
func pickCanonical(items []kodik.Result) kodik.Result {
	best := items[0]
	for _, cur := range items[1:] {
		bestHasSeasons := len(best.Seasons) > 0
		curHasSeasons := len(cur.Seasons) > 0
		if !bestHasSeasons && curHasSeasons {
			best = cur
			continue
		}
		if cur.EpisodesCount > best.EpisodesCount {
			best = cur
			continue
		}
		if best.MaterialData == nil && cur.MaterialData != nil {
			best = cur
			continue
		}
		bestTs, _ := time.Parse(time.RFC3339, best.UpdatedAt)
		curTs, _ := time.Parse(time.RFC3339, cur.UpdatedAt)
		if curTs.After(bestTs) {
			best = cur
		}
	}
	return best
}

// extractEpisodesInfo mirrors extractEpisodesInfo from syncFromKodik.ts.
func extractEpisodesInfo(seasons map[string]kodik.SeasonData) map[string]map[string]map[string]any {
	result := make(map[string]map[string]map[string]any, len(seasons))
	for sNum, sData := range seasons {
		result[sNum] = make(map[string]map[string]any, len(sData.Episodes))
		for eNum, ep := range sData.Episodes {
			var screenshot any
			if len(ep.Screenshots) > 0 {
				screenshot = ep.Screenshots[0]
			}
			var link any
			if ep.Link != "" {
				link = kodik.NormalizeURL(ep.Link)
			}
			result[sNum][eNum] = map[string]any{
				"title":      ep.Title,
				"screenshot": screenshot,
				"link":       link,
			}
		}
	}
	return result
}

// buildAnimeRow mirrors buildAnimeRow from syncFromKodik.ts.
func buildAnimeRow(item kodik.Result) map[string]any {
	shikiID, _ := item.ShikimoriIDInt()
	md := item.MaterialData

	row := map[string]any{
		"shikimori_id":      shikiID,
		"kinopoisk_id":      item.KinopoiskID,
		"imdb_id":           item.ImdbID,
		"worldart_link":     item.WorldartLink,
		"title":             russianTitle(item),
		"title_orig":        nilIfEmpty(item.TitleOrig),
		"title_jp":          nilIfEmpty(item.OtherTitle),
		"type":              item.Type,
		"year":              item.Year,
		"last_season":       item.LastSeason,
		"last_episode":      item.LastEpisode,
		"episodes_count":    item.EpisodesCount,
		"screenshots":       first5(item.Screenshots),
		"blocked_countries": orEmptySlice(item.BlockedCountries),
		"kodik_updated_at":  nilIfEmpty(item.UpdatedAt),
		"synced_at":         time.Now().UTC().Format(time.RFC3339),
	}

	if len(item.Seasons) > 0 {
		row["episodes_info"] = extractEpisodesInfo(item.Seasons)
	}

	if md != nil {
		row["title_en"] = nilIfEmpty(md.TitleEn)
		row["anime_kind"] = nilIfEmpty(md.AnimeKind)
		row["anime_status"] = nilIfEmpty(coalesce(md.AnimeStatus, md.AllStatus))
		row["shikimori_rating"] = floatOrNil(md.ShikimoriRating)
		row["shikimori_votes"] = intOrNil(md.ShikimoriVotes)
		row["kinopoisk_rating"] = floatOrNil(md.KinopoiskRating)
		row["kinopoisk_votes"] = intOrNil(md.KinopoiskVotes)
		row["imdb_rating"] = floatOrNil(md.ImdbRating)
		row["imdb_votes"] = intOrNil(md.ImdbVotes)
		row["poster_url"] = nilIfEmpty(coalesce(md.PosterURL, md.AnimePosterURL))
		row["genres"] = coalesceSlice(md.AnimeGenres, md.AllGenres, md.Genres)
		row["studios"] = orEmptySlice(md.AnimeStudios)
		row["countries"] = orEmptySlice(md.Countries)
		row["description"] = nilIfEmpty(coalesce(md.AnimeDescription, md.Description))
		row["duration"] = md.Duration
		row["rating_mpaa"] = nilIfEmpty(md.RatingMpaa)
		row["minimal_age"] = md.MinimalAge
		row["material_data"] = md
		if item.Year == nil && md.Year != nil {
			row["year"] = md.Year
		}
	}

	return row
}

func russianTitle(item kodik.Result) string {
	if item.MaterialData != nil && item.MaterialData.Title != "" {
		return item.MaterialData.Title
	}
	if item.Title != "" {
		return item.Title
	}
	return item.TitleOrig
}

func nilIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func coalesce(a, b string) string {
	if a != "" {
		return a
	}
	return b
}

func coalesceSlice(slices ...[]string) []string {
	for _, s := range slices {
		if len(s) > 0 {
			return s
		}
	}
	return []string{}
}

func orEmptySlice(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

func floatOrNil(f float64) any {
	if f == 0 {
		return nil
	}
	return f
}

func intOrNil(n int) any {
	if n == 0 {
		return nil
	}
	return n
}

func first5(ss []string) []string {
	if len(ss) <= 5 {
		return ss
	}
	return ss[:5]
}
