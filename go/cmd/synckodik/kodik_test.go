package main

import (
	"encoding/json"
	"testing"

	"animeview/go/internal/kodik"
)

func TestPickCanonical_PrefersMoreEpisodes(t *testing.T) {
	items := []kodik.Result{
		{ShikimoriID: json.Number("1"), EpisodesCount: 12},
		{ShikimoriID: json.Number("1"), EpisodesCount: 24},
		{ShikimoriID: json.Number("1"), EpisodesCount: 6},
	}
	got := pickCanonical(items)
	if got.EpisodesCount != 24 {
		t.Errorf("EpisodesCount = %d, want 24", got.EpisodesCount)
	}
}

func TestPickCanonical_PrefersSeasons(t *testing.T) {
	items := []kodik.Result{
		{ShikimoriID: json.Number("2"), EpisodesCount: 100},
		{ShikimoriID: json.Number("2"), EpisodesCount: 12,
			Seasons: map[string]kodik.SeasonData{"1": {}}},
	}
	got := pickCanonical(items)
	if len(got.Seasons) == 0 {
		t.Error("canonical should have seasons")
	}
}

func TestPickCanonical_PrefersMaterialData(t *testing.T) {
	items := []kodik.Result{
		{ShikimoriID: json.Number("3"), EpisodesCount: 12},
		{ShikimoriID: json.Number("3"), EpisodesCount: 12,
			MaterialData: &kodik.MaterialData{Title: "With MD"}},
	}
	got := pickCanonical(items)
	if got.MaterialData == nil {
		t.Error("canonical should have material_data")
	}
}

func TestBuildAnimeRow_CoreFields(t *testing.T) {
	item := kodik.Result{
		ShikimoriID:   json.Number("20"),
		Title:         "Naruto",
		TitleOrig:     "Naruto",
		Type:          "anime-serial",
		EpisodesCount: 220,
		MaterialData: &kodik.MaterialData{
			Title:       "Наруто",
			AnimeKind:   "tv",
			AnimeGenres: []string{"action", "adventure"},
		},
	}
	row := buildAnimeRow(item)

	if row["shikimori_id"] != 20 {
		t.Errorf("shikimori_id = %v, want 20", row["shikimori_id"])
	}
	if row["title"] != "Наруто" {
		t.Errorf("title = %v, want Наруто (from material_data)", row["title"])
	}
	if row["anime_kind"] != "tv" {
		t.Errorf("anime_kind = %v, want tv", row["anime_kind"])
	}
	genres, ok := row["genres"].([]string)
	if !ok || len(genres) != 2 {
		t.Errorf("genres = %v, want [action adventure]", row["genres"])
	}
}

func TestBuildAnimeRow_FallsBackToKodikTitle(t *testing.T) {
	item := kodik.Result{
		ShikimoriID: json.Number("21"),
		Title:       "One Piece",
		TitleOrig:   "One Piece",
		Type:        "anime-serial",
	}
	row := buildAnimeRow(item)
	if row["title"] != "One Piece" {
		t.Errorf("title = %v, want One Piece", row["title"])
	}
}
