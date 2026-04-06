#include "replay_engine.hpp"

#include <chrono>
#include <thread>

namespace md {

ReplayResult ReplayEngine::Replay(
    const std::vector<MarketEvent>& events,
    L2Book& book,
    const ReplayConfig& cfg,
    const std::function<void(size_t, const TopOfBook&)>& sample_callback) const {
  ReplayResult out;
  out.events_processed = events.size();

  if (events.empty()) {
    out.state_hash = book.StateHash();
    return out;
  }

  LatencyRecorder recorder(events.size());
  const auto start = std::chrono::steady_clock::now();
  const uint64_t base_event_ns = events.front().ts_exchange_ns;

  for (size_t i = 0; i < events.size(); ++i) {
    if (cfg.pace_to_wall_clock && cfg.speed_multiplier > 0.0) {
      const uint64_t delta_event_ns = events[i].ts_exchange_ns - base_event_ns;
      const uint64_t target_ns = static_cast<uint64_t>(delta_event_ns / cfg.speed_multiplier);
      std::this_thread::sleep_until(start + std::chrono::nanoseconds(target_ns));
    }

    const auto t0 = std::chrono::steady_clock::now();
    book.Apply(events[i]);
    const auto t1 = std::chrono::steady_clock::now();

    recorder.Record(
        static_cast<uint64_t>(std::chrono::duration_cast<std::chrono::nanoseconds>(t1 - t0).count()));

    if (sample_callback && ((i + 1) % cfg.sample_interval == 0 || (i + 1) == events.size())) {
      sample_callback(i + 1, book.Top());
    }
  }

  const auto end = std::chrono::steady_clock::now();
  out.replay_wall_ns =
      static_cast<uint64_t>(std::chrono::duration_cast<std::chrono::nanoseconds>(end - start).count());
  out.state_hash = book.StateHash();
  out.apply_latency = recorder.Summarize();
  return out;
}

}  // namespace md
