#include "metrics.hpp"

#include <algorithm>
#include <array>
#include <chrono>
#include <ctime>
#include <cstdio>
#include <fstream>
#include <iomanip>
#include <numeric>
#include <sstream>
#include <stdexcept>

namespace md {

LatencyRecorder::LatencyRecorder(size_t reserve) {
  if (reserve > 0) {
    samples_.reserve(reserve);
  }
}

void LatencyRecorder::Record(uint64_t ns) { samples_.push_back(ns); }

LatencySummary LatencyRecorder::Summarize() const {
  LatencySummary out;
  if (samples_.empty()) {
    return out;
  }

  std::vector<uint64_t> sorted = samples_;
  std::sort(sorted.begin(), sorted.end());

  out.count = sorted.size();
  out.min_ns = sorted.front();
  out.max_ns = sorted.back();
  out.p50_ns = sorted[sorted.size() * 50 / 100];
  out.p95_ns = sorted[sorted.size() * 95 / 100];
  out.p99_ns = sorted[sorted.size() * 99 / 100];
  out.mean_ns = std::accumulate(sorted.begin(), sorted.end(), 0.0) / sorted.size();
  return out;
}

namespace {

std::string ExecCapture(const std::string& cmd) {
  std::array<char, 256> buf{};
  std::string out;
  FILE* pipe = popen(cmd.c_str(), "r");
  if (pipe == nullptr) {
    return {};
  }
  while (fgets(buf.data(), static_cast<int>(buf.size()), pipe) != nullptr) {
    out += buf.data();
  }
  pclose(pipe);
  while (!out.empty() && (out.back() == '\n' || out.back() == '\r' || out.back() == ' ')) {
    out.pop_back();
  }
  return out;
}

}  // namespace

std::string UtcNowIso8601() {
  const auto now = std::chrono::system_clock::now();
  const std::time_t t = std::chrono::system_clock::to_time_t(now);
  std::tm tm{};
#if defined(_WIN32)
  gmtime_s(&tm, &t);
#else
  gmtime_r(&t, &tm);
#endif
  std::ostringstream oss;
  oss << std::put_time(&tm, "%Y-%m-%dT%H:%M:%SZ");
  return oss.str();
}

std::string Sha256File(const std::string& path) {
  std::string out = ExecCapture("sha256sum '" + path + "' 2>/dev/null | awk '{print $1}'");
  if (!out.empty()) {
    return out;
  }
  out = ExecCapture("shasum -a 256 '" + path + "' 2>/dev/null | awk '{print $1}'");
  return out;
}

std::string TryGitSha() {
  auto sha = ExecCapture("git rev-parse HEAD 2>/dev/null");
  if (sha.empty()) {
    return "unknown";
  }
  return sha;
}

}  // namespace md
