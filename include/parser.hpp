#pragma once

#include <cstdint>
#include <string_view>
#include <vector>

namespace md {

struct ParsedLevel {
  int64_t price_fp{0};
  int64_t qty_fp{0};
  uint64_t ts_exchange_ns{0};
};

struct DepthSnapshot {
  std::vector<ParsedLevel> bids;
  std::vector<ParsedLevel> asks;
};

class KrakenDepthParser {
 public:
  DepthSnapshot Parse(std::string_view json_text) const;
};

}  // namespace md
