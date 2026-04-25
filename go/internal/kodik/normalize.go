package kodik

import (
	"net/url"
	"strings"
)

var legacyPlayerHosts = map[string]bool{
	"kodik.info":     true,
	"www.kodik.info": true,
	"kodik.biz":      true,
	"www.kodik.biz":  true,
	"kodik.cc":       true,
	"www.kodik.cc":   true,
}

var legacyAPIHosts = map[string]bool{
	"kodikapi.com":     true,
	"www.kodikapi.com": true,
}

var currentPlayerHosts = map[string]bool{
	"kodikplayer.com":     true,
	"www.kodikplayer.com": true,
	"kodikonline.com":     true,
	"www.kodikonline.com": true,
}

var currentAPIHosts = map[string]bool{
	"kodik-api.com":     true,
	"www.kodik-api.com": true,
}

// NormalizeURL mirrors normalizeKodikUrl from src/lib/kodik/domains.ts.
func NormalizeURL(rawURL string) string {
	if strings.HasPrefix(rawURL, "//") {
		rawURL = "https:" + rawURL
	}
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Host == "" {
		return rawURL
	}
	host := strings.ToLower(parsed.Hostname())
	if legacyPlayerHosts[host] || currentPlayerHosts[host] {
		parsed.Scheme = "https"
		parsed.Host = "kodikplayer.com"
		return parsed.String()
	}
	if legacyAPIHosts[host] || currentAPIHosts[host] {
		parsed.Scheme = "https"
		parsed.Host = "kodik-api.com"
		return parsed.String()
	}
	return parsed.String()
}
