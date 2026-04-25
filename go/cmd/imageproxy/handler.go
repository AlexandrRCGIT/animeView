package main

import (
	"bytes"
	"encoding/json"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/chai2010/webp"
	"github.com/disintegration/imaging"
)

const (
	cacheControl = "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800, immutable"
	userAgent    = "AnimeView/1.0"
	fetchTimeout = 15 * time.Second
)

type handler struct {
	rl     *rateLimiter
	client *http.Client
}

func newHandler(rl *rateLimiter) *handler {
	return &handler{
		rl:     rl,
		client: &http.Client{Timeout: fetchTimeout},
	}
}

func clientIP(r *http.Request) string {
	if xrip := r.Header.Get("X-Real-IP"); xrip != "" {
		return strings.TrimSpace(strings.SplitN(xrip, ",", 2)[0])
	}
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return strings.TrimSpace(strings.SplitN(xff, ",", 2)[0])
	}
	host, _, _ := net.SplitHostPort(r.RemoteAddr)
	if host == "" {
		return r.RemoteAddr
	}
	return host
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func (h *handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if !h.rl.allow(clientIP(r)) {
		jsonError(w, "Too many requests", http.StatusTooManyRequests)
		return
	}

	rawURL := r.URL.Query().Get("url")
	if rawURL == "" {
		jsonError(w, "Missing url", http.StatusBadRequest)
		return
	}

	parsed, err := url.Parse(rawURL)
	if err != nil {
		jsonError(w, "Invalid url", http.StatusBadRequest)
		return
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		jsonError(w, "Invalid protocol", http.StatusBadRequest)
		return
	}
	if !isAllowedHostname(parsed.Hostname()) {
		jsonError(w, "Hostname not allowed", http.StatusForbidden)
		return
	}

	// kodik.biz is a dead CDN domain (NXDOMAIN) — rewrite to kodikres.com
	if strings.HasSuffix(parsed.Hostname(), ".kodik.biz") || parsed.Hostname() == "kodik.biz" {
		parsed.Host = strings.Replace(parsed.Host, "kodik.biz", "kodikres.com", 1)
	}

	var resizeWidth int
	if rawW := r.URL.Query().Get("w"); rawW != "" {
		if n, convErr := strconv.Atoi(rawW); convErr == nil && isAllowedWidth(n) {
			resizeWidth = n
		}
	}

	req, _ := http.NewRequest(http.MethodGet, parsed.String(), nil)
	req.Header.Set("Accept", "image/avif,image/webp,image/apng,image/*,*/*;q=0.8")
	req.Header.Set("User-Agent", userAgent)

	resp, fetchErr := h.client.Do(req)
	if fetchErr != nil {
		jsonError(w, "Fetch failed", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		jsonError(w, "Upstream fetch failed", resp.StatusCode)
		return
	}

	ct := resp.Header.Get("Content-Type")
	if ct == "" {
		ct = "image/jpeg"
	}
	if !strings.HasPrefix(ct, "image/") {
		jsonError(w, "Not an image", http.StatusBadRequest)
		return
	}

	body, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		jsonError(w, "Read failed", http.StatusBadGateway)
		return
	}

	if resizeWidth > 0 {
		if webpBytes, resizeErr := resizeToWebP(body, resizeWidth); resizeErr == nil {
			w.Header().Set("Content-Type", "image/webp")
			w.Header().Set("Cache-Control", cacheControl)
			w.Header().Set("Vary", "Accept")
			_, _ = w.Write(webpBytes)
			return
		}
		// fallback to original if resize fails
	}

	w.Header().Set("Content-Type", ct)
	w.Header().Set("Cache-Control", cacheControl)
	w.Header().Set("Vary", "Accept")
	_, _ = w.Write(body)
}

func resizeToWebP(data []byte, width int) ([]byte, error) {
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	resized := imaging.Resize(img, width, 0, imaging.Lanczos)
	var buf bytes.Buffer
	if encErr := webp.Encode(&buf, resized, &webp.Options{Quality: 82}); encErr != nil {
		return nil, encErr
	}
	return buf.Bytes(), nil
}
