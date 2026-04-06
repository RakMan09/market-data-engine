#pragma once

#include <cstdint>
#include <string>
#include <vector>

#include "market_event.hpp"

namespace md {

struct BinlogHeader {
  char magic[8]{'M', 'D', 'L', '2', 'L', 'O', 'G', '\0'};
  uint32_t version{1};
  uint8_t endianness{1};
  uint8_t reserved[3]{};
  int64_t px_scale{kPriceScale};
  int64_t qty_scale{kQtyScale};
  uint32_t symbol_id{0};
  uint32_t depth_levels{0};
  uint64_t event_count{0};
};

struct BinlogData {
  BinlogHeader header;
  std::vector<MarketEvent> events;
};

class Binlog {
 public:
  static void Write(const std::string& path, const BinlogHeader& header,
                    const std::vector<MarketEvent>& events);
  static BinlogData Read(const std::string& path);
};

}  // namespace md
