package main

import "strings"

var allowedDomains = []string{
	"shikimori.one", "shikimori.io", "myanimelist.net",
	"discordapp.com", "googleusercontent.com", "animego.org",
	"imgur.com", "anilibria.tv", "aniboom.one", "animevost.org",
	"rutube.ru", "kodik.info", "kodik.biz", "kodik.cc",
	"kodikapi.com", "kodik-api.com", "kodikplayer.com",
	"kodikonline.com", "kodikres.com", "bd.kodikres.com",
	"jikan.moe", "yandex.net", "yandex.ru", "kinopoisk.ru",
}

var allowedWidths = map[int]bool{
	120: true, 240: true, 280: true,
	480: true, 720: true, 1200: true,
}

func isAllowedHostname(hostname string) bool {
	if hostname == "" {
		return false
	}
	for _, domain := range allowedDomains {
		if hostname == domain || strings.HasSuffix(hostname, "."+domain) {
			return true
		}
	}
	return false
}

func isAllowedWidth(w int) bool {
	return allowedWidths[w]
}
