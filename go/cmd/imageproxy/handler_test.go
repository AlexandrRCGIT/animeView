package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHandler_MissingURL(t *testing.T) {
	h := newHandler(newRateLimiter(240, 240))
	req := httptest.NewRequest(http.MethodGet, "/image", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d, want 400", w.Code)
	}
}

func TestHandler_DisallowedHostname(t *testing.T) {
	h := newHandler(newRateLimiter(240, 240))
	req := httptest.NewRequest(http.MethodGet, "/image?url=https://evil.com/img.jpg", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden {
		t.Errorf("got %d, want 403", w.Code)
	}
}

func TestHandler_InvalidProtocol(t *testing.T) {
	h := newHandler(newRateLimiter(240, 240))
	req := httptest.NewRequest(http.MethodGet, "/image?url=ftp://shikimori.one/img.jpg", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d, want 400", w.Code)
	}
}

func TestHandler_RateLimit(t *testing.T) {
	// capacity=1: first request passes validation (may fail upstream — that's OK),
	// second request from same IP must get 429.
	h := newHandler(newRateLimiter(1, 1))
	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodGet, "/image?url=https://shikimori.one/img.jpg", nil)
		req.RemoteAddr = "10.0.0.1:1234"
		w := httptest.NewRecorder()
		h.ServeHTTP(w, req)
		if i == 1 && w.Code != http.StatusTooManyRequests {
			t.Errorf("2nd request: got %d, want 429", w.Code)
		}
	}
}
