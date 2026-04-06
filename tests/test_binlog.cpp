#include <filesystem>

#include <gtest/gtest.h>

#include "binlog.hpp"

TEST(Binlog, RoundTripWithHeader) {
  std::vector<md::MarketEvent> events;
  md::MarketEvent e;
  e.seq = 1;
  e.side = md::Side::Bid;
  e.event_type = md::EventType::Snapshot;
  e.price_fp = 123;
  e.qty_fp = 456;
  e.flags = md::EventFlags::SnapshotStart;
  events.push_back(e);

  md::BinlogHeader hdr;
  hdr.symbol_id = 42;
  hdr.depth_levels = 10;

  const auto path = std::filesystem::temp_directory_path() / "md_binlog_test.bin";
  md::Binlog::Write(path.string(), hdr, events);
  auto out = md::Binlog::Read(path.string());

  ASSERT_EQ(out.events.size(), 1u);
  EXPECT_EQ(out.header.symbol_id, 42u);
  EXPECT_EQ(out.events[0].price_fp, 123);

  std::error_code ec;
  std::filesystem::remove(path, ec);
}
