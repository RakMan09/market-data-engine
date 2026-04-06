#include "binlog.hpp"

#include <cstring>
#include <fstream>
#include <stdexcept>

namespace md {

void Binlog::Write(const std::string& path,
                   const BinlogHeader& header,
                   const std::vector<MarketEvent>& events) {
  std::ofstream out(path, std::ios::binary | std::ios::trunc);
  if (!out.is_open()) {
    throw std::runtime_error("failed to open binlog for write: " + path);
  }

  BinlogHeader h = header;
  h.event_count = events.size();

  out.write(reinterpret_cast<const char*>(&h), sizeof(h));
  if (!events.empty()) {
    out.write(reinterpret_cast<const char*>(events.data()),
              static_cast<std::streamsize>(events.size() * sizeof(MarketEvent)));
  }
  if (!out.good()) {
    throw std::runtime_error("failed writing binlog: " + path);
  }
}

BinlogData Binlog::Read(const std::string& path) {
  std::ifstream in(path, std::ios::binary);
  if (!in.is_open()) {
    throw std::runtime_error("failed to open binlog for read: " + path);
  }

  BinlogData out;
  in.read(reinterpret_cast<char*>(&out.header), sizeof(out.header));
  if (!in.good()) {
    throw std::runtime_error("failed reading binlog header");
  }

  const char expected_magic[8]{'M', 'D', 'L', '2', 'L', 'O', 'G', '\0'};
  if (std::memcmp(out.header.magic, expected_magic, 8) != 0) {
    throw std::runtime_error("binlog magic mismatch");
  }
  if (out.header.version != 1) {
    throw std::runtime_error("unsupported binlog version");
  }
  if (out.header.endianness != 1) {
    throw std::runtime_error("unsupported endianness");
  }

  out.events.resize(out.header.event_count);
  if (out.header.event_count > 0) {
    in.read(reinterpret_cast<char*>(out.events.data()),
            static_cast<std::streamsize>(out.events.size() * sizeof(MarketEvent)));
    if (!in.good()) {
      throw std::runtime_error("failed reading binlog events");
    }
  }
  return out;
}

}  // namespace md
