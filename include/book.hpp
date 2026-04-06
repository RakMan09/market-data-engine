#pragma once

#include <cstddef>
#include <cstdint>
#include <functional>
#include <map>
#include <vector>

#include "market_event.hpp"

namespace md {

struct PriceLevel {
  int64_t price_fp{0};
  int64_t qty_fp{0};
};

struct TopOfBook {
  PriceLevel bid{};
  PriceLevel ask{};

  [[nodiscard]] bool IsCrossed() const { return bid.price_fp > 0 && ask.price_fp > 0 && bid.price_fp >= ask.price_fp; }
};

class L2Book {
 public:
  void Apply(const MarketEvent& event);
  [[nodiscard]] TopOfBook Top() const;
  [[nodiscard]] std::vector<PriceLevel> TopLevels(Side side, size_t n) const;
  [[nodiscard]] uint64_t StateHash(size_t top_n = 20) const;
  [[nodiscard]] bool InvariantNoCross() const;
  [[nodiscard]] size_t BidLevels() const { return bids_.size(); }
  [[nodiscard]] size_t AskLevels() const { return asks_.size(); }

 private:
  std::map<int64_t, int64_t, std::greater<>> bids_;
  std::map<int64_t, int64_t, std::less<>> asks_;
};

}  // namespace md
