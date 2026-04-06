#include "parser.hpp"

#include <cmath>
#include <stdexcept>

#include <nlohmann/json.hpp>

#include "market_event.hpp"

namespace md {
namespace {

uint64_t ParseTsNs(const nlohmann::json& item) {
  if (!item.is_string()) {
    return 0;
  }
  const double ts = std::stod(item.get<std::string>());
  return static_cast<uint64_t>(ts * 1e9);
}

ParsedLevel ParseLevel(const nlohmann::json& level) {
  if (!level.is_array() || level.size() < 2) {
    throw std::runtime_error("invalid kraken level shape");
  }
  ParsedLevel out;
  out.price_fp = ToFixed(level[0].get<std::string>(), kPriceScale);
  out.qty_fp = ToFixed(level[1].get<std::string>(), kQtyScale);
  if (level.size() > 2) {
    out.ts_exchange_ns = ParseTsNs(level[2]);
  }
  return out;
}

}  // namespace

DepthSnapshot KrakenDepthParser::Parse(std::string_view json_text) const {
  auto j = nlohmann::json::parse(json_text.begin(), json_text.end());
  if (!j.contains("error") || !j["error"].is_array()) {
    throw std::runtime_error("kraken payload missing error field");
  }
  if (!j["error"].empty()) {
    throw std::runtime_error("kraken returned error");
  }

  const auto& result = j.at("result");
  if (!result.is_object()) {
    throw std::runtime_error("kraken result is not object");
  }

  nlohmann::json book;
  for (auto it = result.begin(); it != result.end(); ++it) {
    if (it.key() == "last") {
      continue;
    }
    book = it.value();
    break;
  }
  if (book.is_null()) {
    throw std::runtime_error("kraken result had no book payload");
  }

  DepthSnapshot snapshot;
  const auto& bids = book.at("bids");
  const auto& asks = book.at("asks");
  snapshot.bids.reserve(bids.size());
  snapshot.asks.reserve(asks.size());

  for (const auto& x : bids) {
    snapshot.bids.push_back(ParseLevel(x));
  }
  for (const auto& x : asks) {
    snapshot.asks.push_back(ParseLevel(x));
  }
  return snapshot;
}

}  // namespace md
