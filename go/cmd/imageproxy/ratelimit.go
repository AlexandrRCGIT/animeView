package main

import (
	"sync"
	"time"
)

type bucket struct {
	mu       sync.Mutex
	tokens   float64
	lastFill time.Time
}

type rateLimiter struct {
	mu       sync.RWMutex
	buckets  map[string]*bucket
	rate     float64 // tokens per second
	capacity float64
}

func newRateLimiter(perMinute, capacity int) *rateLimiter {
	return &rateLimiter{
		buckets:  make(map[string]*bucket),
		rate:     float64(perMinute) / 60.0,
		capacity: float64(capacity),
	}
}

func (rl *rateLimiter) allow(key string) bool {
	rl.mu.RLock()
	b, ok := rl.buckets[key]
	rl.mu.RUnlock()

	if !ok {
		rl.mu.Lock()
		if b, ok = rl.buckets[key]; !ok {
			b = &bucket{tokens: rl.capacity, lastFill: time.Now()}
			rl.buckets[key] = b
		}
		rl.mu.Unlock()
	}

	b.mu.Lock()
	defer b.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(b.lastFill).Seconds()
	b.tokens += elapsed * rl.rate
	if b.tokens > rl.capacity {
		b.tokens = rl.capacity
	}
	b.lastFill = now

	if b.tokens >= 1 {
		b.tokens--
		return true
	}
	return false
}
