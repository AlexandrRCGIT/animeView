package kodik_test

import (
	"testing"

	"animeview/go/internal/kodik"
)

func TestNormalizeURL(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"//kodik.info/serial/123", "https://kodikplayer.com/serial/123"},
		{"https://kodik.biz/video/456", "https://kodikplayer.com/video/456"},
		{"https://www.kodik.cc/embed/789", "https://kodikplayer.com/embed/789"},
		{"https://kodikapi.com/list", "https://kodik-api.com/list"},
		{"https://kodikplayer.com/serial/123", "https://kodikplayer.com/serial/123"},
		{"https://kodik-api.com/list", "https://kodik-api.com/list"},
		{"https://example.com/image.jpg", "https://example.com/image.jpg"},
		{"not-a-url", "not-a-url"},
	}
	for _, tt := range tests {
		got := kodik.NormalizeURL(tt.input)
		if got != tt.want {
			t.Errorf("NormalizeURL(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}
