package main

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	limit := 240
	if s := os.Getenv("IMAGE_RATE_LIMIT_PER_MINUTE"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 {
			limit = n
		}
	}

	rl := newRateLimiter(limit, limit)
	h := newHandler(rl)

	mux := http.NewServeMux()
	mux.Handle("/image", h)
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	addr := ":" + port
	fmt.Printf("imageproxy listening on %s (limit=%d req/min)\n", addr, limit)
	if err := http.ListenAndServe(addr, mux); err != nil {
		fmt.Fprintf(os.Stderr, "server error: %v\n", err)
		os.Exit(1)
	}
}
