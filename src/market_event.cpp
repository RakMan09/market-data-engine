#include "market_event.hpp"

#include <charconv>
#include <stdexcept>
#include <string>

namespace md {

int64_t ToFixed(std::string_view value, int64_t scale) {
  if (value.empty()) {
    throw std::runtime_error("empty decimal");
  }

  bool neg = false;
  size_t i = 0;
  if (value[i] == '-') {
    neg = true;
    ++i;
  }

  int64_t int_part = 0;
  while (i < value.size() && value[i] != '.') {
    if (value[i] < '0' || value[i] > '9') {
      throw std::runtime_error("invalid decimal");
    }
    int_part = int_part * 10 + (value[i] - '0');
    ++i;
  }

  int64_t frac_part = 0;
  int64_t frac_scale = 1;
  if (i < value.size() && value[i] == '.') {
    ++i;
    while (i < value.size() && frac_scale < scale) {
      if (value[i] < '0' || value[i] > '9') {
        throw std::runtime_error("invalid decimal frac");
      }
      frac_part = frac_part * 10 + (value[i] - '0');
      frac_scale *= 10;
      ++i;
    }
  }

  while (frac_scale < scale) {
    frac_part *= 10;
    frac_scale *= 10;
  }

  int64_t out = int_part * scale + frac_part;
  return neg ? -out : out;
}

uint64_t SymbolIdFromString(std::string_view symbol) {
  uint64_t hash = 1469598103934665603ULL;
  for (unsigned char c : symbol) {
    hash ^= c;
    hash *= 1099511628211ULL;
  }
  return hash;
}

}  // namespace md
