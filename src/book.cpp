#include "book.hpp"

namespace md {

void L2Book::Apply(const MarketEvent& event) {
  if ((event.flags & EventFlags::SnapshotStart) != 0U) {
    bids_.clear();
    asks_.clear();
  }

  auto apply_level = [&](auto& levels) {
    if (event.qty_fp <= 0) {
      levels.erase(event.price_fp);
    } else {
      levels[event.price_fp] = event.qty_fp;
    }
  };

  if (event.side == Side::Bid) {
    apply_level(bids_);
  } else {
    apply_level(asks_);
  }
}

TopOfBook L2Book::Top() const {
  TopOfBook top;
  if (!bids_.empty()) {
    top.bid = PriceLevel{bids_.begin()->first, bids_.begin()->second};
  }
  if (!asks_.empty()) {
    top.ask = PriceLevel{asks_.begin()->first, asks_.begin()->second};
  }
  return top;
}

std::vector<PriceLevel> L2Book::TopLevels(Side side, size_t n) const {
  std::vector<PriceLevel> out;
  out.reserve(n);

  if (side == Side::Bid) {
    for (const auto& [px, qty] : bids_) {
      out.push_back(PriceLevel{px, qty});
      if (out.size() == n) {
        break;
      }
    }
  } else {
    for (const auto& [px, qty] : asks_) {
      out.push_back(PriceLevel{px, qty});
      if (out.size() == n) {
        break;
      }
    }
  }
  return out;
}

uint64_t L2Book::StateHash(size_t top_n) const {
  uint64_t seed = 1469598103934665603ULL;

  size_t c = 0;
  for (const auto& [px, qty] : bids_) {
    seed = HashCombine(seed, px);
    seed = HashCombine(seed, qty);
    if (++c == top_n) {
      break;
    }
  }

  c = 0;
  for (const auto& [px, qty] : asks_) {
    seed = HashCombine(seed, px);
    seed = HashCombine(seed, qty);
    if (++c == top_n) {
      break;
    }
  }

  seed = HashCombine(seed, bids_.size());
  seed = HashCombine(seed, asks_.size());
  return seed;
}

bool L2Book::InvariantNoCross() const {
  if (bids_.empty() || asks_.empty()) {
    return true;
  }
  return bids_.begin()->first < asks_.begin()->first;
}

}  // namespace md
