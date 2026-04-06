SHELL := /bin/bash
BUILD_DIR := build
CMAKE := cmake
CAPTURE_SECONDS ?= 60
CAPTURE_INTERVAL_MS ?= 1000
SYMBOL ?= XBTUSD
DEPTH ?= 25
BINLOG ?= artifacts/captured.binlog

.PHONY: build test bench capture replay demo clean

build:
	$(CMAKE) -S . -B $(BUILD_DIR) -GNinja -DCMAKE_BUILD_TYPE=Release
	$(CMAKE) --build $(BUILD_DIR) -j

test: build
	ctest --test-dir $(BUILD_DIR) --output-on-failure

bench: build
	mkdir -p artifacts
	./$(BUILD_DIR)/bench_book --benchmark_out=artifacts/bench_book.json --benchmark_out_format=json --benchmark_min_time=0.03s
	./$(BUILD_DIR)/bench_replay --benchmark_out=artifacts/bench_replay.json --benchmark_out_format=json --benchmark_min_time=0.03s

capture: build
	mkdir -p artifacts
	./$(BUILD_DIR)/capture --symbol $(SYMBOL) --duration-sec $(CAPTURE_SECONDS) --interval-ms $(CAPTURE_INTERVAL_MS) --depth $(DEPTH) --binlog $(BINLOG)

replay: build
	mkdir -p artifacts
	./$(BUILD_DIR)/replay --binlog $(BINLOG) --artifacts artifacts

demo: capture replay bench

clean:
	rm -rf $(BUILD_DIR) artifacts/*.json artifacts/*.txt artifacts/*.csv artifacts/*.binlog artifacts/*.data artifacts/*.svg artifacts/report.md
