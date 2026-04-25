package main

import (
	"testing"
	"time"
)

func TestRateLimiter_AllowsUnderCapacity(t *testing.T) {
	rl := newRateLimiter(60, 60) // 60/min, capacity 60
	for i := 0; i < 60; i++ {
		if !rl.allow("ip1") {
			t.Fatalf("request %d should be allowed", i+1)
		}
	}
}

func TestRateLimiter_BlocksWhenExhausted(t *testing.T) {
	rl := newRateLimiter(5, 5) // capacity 5
	for i := 0; i < 5; i++ {
		rl.allow("ip2")
	}
	if rl.allow("ip2") {
		t.Error("6th request should be blocked")
	}
}

func TestRateLimiter_IsolatesIPs(t *testing.T) {
	rl := newRateLimiter(1, 1) // capacity 1
	rl.allow("ipA")
	if !rl.allow("ipB") {
		t.Error("different IP should not be affected")
	}
}

func TestRateLimiter_RefillsOverTime(t *testing.T) {
	rl := newRateLimiter(60, 1) // 1/sec, capacity 1
	rl.allow("ip3")
	if rl.allow("ip3") {
		t.Error("immediate second request should be blocked")
	}
	time.Sleep(1100 * time.Millisecond)
	if !rl.allow("ip3") {
		t.Error("request after 1s refill should be allowed")
	}
}
