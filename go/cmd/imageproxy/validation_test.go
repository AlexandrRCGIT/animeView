package main

import "testing"

func TestIsAllowedHostname(t *testing.T) {
	tests := []struct {
		hostname string
		want     bool
	}{
		{"shikimori.one", true},
		{"dere.shikimori.one", true},
		{"cdn.myanimelist.net", true},
		{"myanimelist.net", true},
		{"bd.kodikres.com", true},
		{"evil.com", false},
		{"notshikimori.one.evil.com", false},
		{"", false},
	}
	for _, tt := range tests {
		got := isAllowedHostname(tt.hostname)
		if got != tt.want {
			t.Errorf("isAllowedHostname(%q) = %v, want %v", tt.hostname, got, tt.want)
		}
	}
}

func TestIsAllowedWidth(t *testing.T) {
	for _, w := range []int{120, 240, 280, 480, 720, 1200} {
		if !isAllowedWidth(w) {
			t.Errorf("width %d should be allowed", w)
		}
	}
	for _, w := range []int{0, 100, 300, 999} {
		if isAllowedWidth(w) {
			t.Errorf("width %d should not be allowed", w)
		}
	}
}
