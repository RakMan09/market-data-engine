#include <benchmark/benchmark.h>

#include "book.hpp"

static void BM_L2BookApply(benchmark::State& state) {
  md::L2Book book;
  md::MarketEvent ev;
  ev.event_type = md::EventType::Delta;
  ev.side = md::Side::Bid;
  ev.price_fp = 5000000000;
  ev.qty_fp = 100000000;

  uint64_t i = 0;
  for (auto _ : state) {
    ev.side = (i++ % 2 == 0) ? md::Side::Bid : md::Side::Ask;
    ev.price_fp += static_cast<int64_t>(i % 16);
    book.Apply(ev);
    benchmark::DoNotOptimize(book.Top());
  }
}

BENCHMARK(BM_L2BookApply);
BENCHMARK_MAIN();
