#pragma once

#include <cstddef>
#include <cstdint>
#include <functional>
#include <vector>

#include "book.hpp"
#include "market_event.hpp"
#include "metrics.hpp"

namespace md {

struct ReplayConfig {
  bool pace_to_wall_clock{false};
  double speed_multiplier{1.0};
  size_t sample_interval{1000};
};

struct ReplayResult {
  size_t events_processed{0};
  uint64_t replay_wall_ns{0};
  uint64_t state_hash{0};
  LatencySummary apply_latency{};
};

class ReplayEngine {
 public:
  ReplayResult Replay(const std::vector<MarketEvent>& events,
                      L2Book& book,
                      const ReplayConfig& cfg,
                      const std::function<void(size_t, const TopOfBook&)>& sample_callback = {}) const;
};

}  // namespace md
