#include <gtest/gtest.h>

#include "replay_engine.hpp"

TEST(Replay, DeterministicOnSameInput) {
  std::vector<md::MarketEvent> events;
  for (int i = 0; i < 1000; ++i) {
    md::MarketEvent ev;
    ev.ts_exchange_ns = static_cast<uint64_t>(i) * 1000;
    ev.ts_recv_ns = ev.ts_exchange_ns;
    ev.seq = i;
    ev.symbol_id = 7;
    ev.event_type = (i < 20) ? md::EventType::Snapshot : md::EventType::Delta;
    ev.side = (i % 2 == 0) ? md::Side::Bid : md::Side::Ask;
    ev.price_fp = (ev.side == md::Side::Bid) ? (500000 - (i % 100)) : (500100 + (i % 100));
    ev.qty_fp = 100 + i;
    if (i == 0) {
      ev.flags = md::EventFlags::SnapshotStart;
    }
    events.push_back(ev);
  }

  md::ReplayEngine engine;
  md::ReplayConfig cfg;

  md::L2Book a;
  md::L2Book b;
  auto r1 = engine.Replay(events, a, cfg);
  auto r2 = engine.Replay(events, b, cfg);

  EXPECT_EQ(r1.state_hash, r2.state_hash);
  EXPECT_TRUE(a.InvariantNoCross());
}
