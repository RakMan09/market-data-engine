#include <gtest/gtest.h>

#include "book.hpp"

TEST(L2Book, AppliesSnapshotAndDelta) {
  md::L2Book book;

  md::MarketEvent e1;
  e1.flags = md::EventFlags::SnapshotStart;
  e1.event_type = md::EventType::Snapshot;
  e1.side = md::Side::Bid;
  e1.price_fp = 1000;
  e1.qty_fp = 10;
  book.Apply(e1);

  md::MarketEvent e2;
  e2.event_type = md::EventType::Snapshot;
  e2.side = md::Side::Ask;
  e2.price_fp = 1010;
  e2.qty_fp = 20;
  book.Apply(e2);

  auto top = book.Top();
  EXPECT_EQ(top.bid.price_fp, 1000);
  EXPECT_EQ(top.ask.price_fp, 1010);
  EXPECT_TRUE(book.InvariantNoCross());

  md::MarketEvent del;
  del.event_type = md::EventType::Delta;
  del.side = md::Side::Bid;
  del.price_fp = 1000;
  del.qty_fp = 0;
  book.Apply(del);

  EXPECT_EQ(book.BidLevels(), 0u);
}
