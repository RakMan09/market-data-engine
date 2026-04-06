#include <gtest/gtest.h>

#include "parser.hpp"

TEST(KrakenParser, ParsesDepthSnapshot) {
  const char* sample = R"({
    "error": [],
    "result": {
      "XXBTZUSD": {
        "asks": [["50000.1","1.25","1710000000.1000"]],
        "bids": [["49999.9","0.75","1710000000.2000"]]
      },
      "last": "123"
    }
  })";

  md::KrakenDepthParser parser;
  auto snap = parser.Parse(sample);

  ASSERT_EQ(snap.asks.size(), 1u);
  ASSERT_EQ(snap.bids.size(), 1u);
  EXPECT_EQ(snap.asks[0].price_fp, 5000010000000LL);
  EXPECT_EQ(snap.bids[0].qty_fp, 75000000LL);
}
