#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace md {

struct LatencySummary {
  uint64_t count{0};
  uint64_t min_ns{0};
  uint64_t max_ns{0};
  uint64_t p50_ns{0};
  uint64_t p95_ns{0};
  uint64_t p99_ns{0};
  double mean_ns{0.0};
};

class LatencyRecorder {
 public:
  explicit LatencyRecorder(size_t reserve = 0);
  void Record(uint64_t ns);
  [[nodiscard]] LatencySummary Summarize() const;

 private:
  std::vector<uint64_t> samples_;
};

std::string UtcNowIso8601();
std::string Sha256File(const std::string& path);
std::string TryGitSha();

}  // namespace md
