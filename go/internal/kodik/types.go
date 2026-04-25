package kodik

import "encoding/json"

type MaterialData struct {
	Title            string   `json:"title"`
	TitleEn          string   `json:"title_en"`
	AnimeKind        string   `json:"anime_kind"`
	AnimeStatus      string   `json:"anime_status"`
	AllStatus        string   `json:"all_status"`
	ShikimoriRating  float64  `json:"shikimori_rating"`
	ShikimoriVotes   int      `json:"shikimori_votes"`
	KinopoiskRating  float64  `json:"kinopoisk_rating"`
	KinopoiskVotes   int      `json:"kinopoisk_votes"`
	ImdbRating       float64  `json:"imdb_rating"`
	ImdbVotes        int      `json:"imdb_votes"`
	PosterURL        string   `json:"poster_url"`
	AnimePosterURL   string   `json:"anime_poster_url"`
	AnimeGenres      []string `json:"anime_genres"`
	AllGenres        []string `json:"all_genres"`
	Genres           []string `json:"genres"`
	AnimeStudios     []string `json:"anime_studios"`
	Countries        []string `json:"countries"`
	AnimeDescription string   `json:"anime_description"`
	Description      string   `json:"description"`
	Duration         *int     `json:"duration"`
	RatingMpaa       string   `json:"rating_mpaa"`
	MinimalAge       *int     `json:"minimal_age"`
	Year             *int     `json:"year"`
}

type EpisodeData struct {
	Title       *string  `json:"title"`
	Screenshots []string `json:"screenshots"`
	Link        string   `json:"link"`
}

type SeasonData struct {
	Episodes map[string]EpisodeData `json:"episodes"`
}

// Result mirrors KodikResult from src/lib/api/kodik/types.ts.
// ShikimoriID uses json.Number because Kodik returns it as string or number.
type Result struct {
	ID               string                `json:"id"`
	Type             string                `json:"type"`
	Year             *int                  `json:"year"`
	Title            string                `json:"title"`
	TitleOrig        string                `json:"title_orig"`
	OtherTitle       string                `json:"other_title"`
	ShikimoriID      json.Number           `json:"shikimori_id"`
	KinopoiskID      *string               `json:"kinopoisk_id"`
	ImdbID           *string               `json:"imdb_id"`
	WorldartLink     *string               `json:"worldart_link"`
	LastSeason       *int                  `json:"last_season"`
	LastEpisode      *int                  `json:"last_episode"`
	EpisodesCount    int                   `json:"episodes_count"`
	Seasons          map[string]SeasonData `json:"seasons"`
	Screenshots      []string              `json:"screenshots"`
	UpdatedAt        string                `json:"updated_at"`
	BlockedCountries []string              `json:"blocked_countries"`
	MaterialData     *MaterialData         `json:"material_data"`
}

// ShikimoriIDInt converts ShikimoriID (string or number in JSON) to int.
func (r *Result) ShikimoriIDInt() (int, bool) {
	if r.ShikimoriID == "" {
		return 0, false
	}
	n, err := r.ShikimoriID.Int64()
	if err != nil {
		return 0, false
	}
	return int(n), true
}

type ListResponse struct {
	Total    int      `json:"total"`
	Results  []Result `json:"results"`
	NextPage string   `json:"next_page"`
}
