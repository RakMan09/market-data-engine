#include <benchmark/benchmark.h>

#include <vector>

#include "replay_engine.hpp"

static std::vector<md::MarketEvent> BuildEvents(size_t n) {
  std::vector<md::MarketEvent> out;
  out.reserve(n);
  for (size_t i = 0; i < n; ++i) {
    md::MarketEvent ev;
    ev.ts_exchange_ns = i * 1000;
    ev.ts_recv_ns = i * 1000;
    ev.seq = i;
    ev.symbol_id = 1;
    ev.event_type = (i < 200) ? md::EventType::Snapshot : md::EventType::Delta;
    ev.side = (i % 2 == 0) ? md::Side::Bid : md::Side::Ask;
    ev.price_fp = 5000000000 + static_cast<int64_t>(i % 1024);
    ev.qty_fp = 100000000 + static_cast<int64_t>(i % 32);
    if (i == 0) {
      ev.flags = md::EventFlags::SnapshotStart;
    }
    out.push_back(ev);
  }
  return out;
}

static void BM_Replay(benchmark::State& state) {
  auto events = BuildEvents(static_cast<size_t>(state.range(0)));
  md::ReplayEngine engine;
  md::ReplayConfig cfg;

  for (auto _ : state) {
    md::L2Book book;
    auto result = engine.Replay(events, book, cfg);
    benchmark::DoNotOptimize(result.state_hash);
  }

  state.SetItemsProcessed(static_cast<int64_t>(state.iterations()) * state.range(0));
}

BENCHMARK(BM_Replay)->Arg(10000)->Arg(100000);
BENCHMARK_MAIN();
