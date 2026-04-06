#pragma once

#include <cstdint>
#include <string_view>

namespace md {

enum class EventType : uint8_t {
  Snapshot = 1,
  Delta = 2,
};

enum class Side : uint8_t {
  Bid = 1,
  Ask = 2,
};

enum EventFlags : uint32_t {
  None = 0,
  SnapshotStart = 1u << 0,
  GapDetected = 1u << 1,
};

struct MarketEvent {
  uint64_t ts_exchange_ns{0};
  uint64_t ts_recv_ns{0};
  uint64_t seq{0};
  int64_t price_fp{0};
  int64_t qty_fp{0};
  uint32_t symbol_id{0};
  uint32_t flags{EventFlags::None};
  EventType event_type{EventType::Delta};
  Side side{Side::Bid};
  uint8_t reserved[14]{};
};
static_assert(sizeof(MarketEvent) == 64, "MarketEvent must be cacheline sized");

constexpr int64_t kPriceScale = 100000000;
constexpr int64_t kQtyScale = 100000000;

int64_t ToFixed(std::string_view value, int64_t scale);
uint64_t SymbolIdFromString(std::string_view symbol);

template <typename T>
inline uint64_t HashCombine(uint64_t seed, const T& v) {
  const auto as_u64 = static_cast<uint64_t>(v);
  return seed ^ (as_u64 + 0x9e3779b97f4a7c15ULL + (seed << 6U) + (seed >> 2U));
}

}  // namespace md
