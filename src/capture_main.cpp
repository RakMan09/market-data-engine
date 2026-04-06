#include <chrono>
#include <cstdint>
#include <filesystem>
#include <algorithm>
#include <iostream>
#include <map>
#include <stdexcept>
#include <string>
#include <thread>
#include <vector>

#include <curl/curl.h>
#include <fmt/format.h>
#include <spdlog/spdlog.h>

#include "binlog.hpp"
#include "market_event.hpp"
#include "parser.hpp"

namespace {

struct Args {
  std::string symbol{"XBTUSD"};
  int duration_sec{60};
  int interval_ms{1000};
  int depth{25};
  std::string binlog_out{"artifacts/captured.binlog"};
};

size_t CurlWrite(char* ptr, size_t size, size_t nmemb, void* userdata) {
  auto* out = static_cast<std::string*>(userdata);
  out->append(ptr, size * nmemb);
  return size * nmemb;
}

std::string HttpGet(const std::string& url) {
  CURL* curl = curl_easy_init();
  if (curl == nullptr) {
    throw std::runtime_error("curl init failed");
  }

  std::string body;
  curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
  curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
  curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);
  curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, CurlWrite);
  curl_easy_setopt(curl, CURLOPT_WRITEDATA, &body);

  const CURLcode rc = curl_easy_perform(curl);
  long status = 0;
  curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &status);
  curl_easy_cleanup(curl);

  if (rc != CURLE_OK || status != 200) {
    throw std::runtime_error("http get failed");
  }
  return body;
}

Args ParseArgs(int argc, char** argv) {
  Args args;
  for (int i = 1; i < argc; ++i) {
    std::string t = argv[i];
    if (t == "--symbol" && i + 1 < argc) {
      args.symbol = argv[++i];
    } else if (t == "--duration-sec" && i + 1 < argc) {
      args.duration_sec = std::stoi(argv[++i]);
    } else if (t == "--interval-ms" && i + 1 < argc) {
      args.interval_ms = std::stoi(argv[++i]);
    } else if (t == "--depth" && i + 1 < argc) {
      args.depth = std::stoi(argv[++i]);
    } else if (t == "--binlog" && i + 1 < argc) {
      args.binlog_out = argv[++i];
    }
  }
  return args;
}

using SideBook = std::map<int64_t, int64_t>;

void EmitDiffEvents(const SideBook& prev,
                    const SideBook& curr,
                    md::Side side,
                    uint32_t symbol_id,
                    uint64_t recv_ts_ns,
                    uint64_t& seq,
                    std::vector<md::MarketEvent>& events,
                    bool snapshot_start) {
  for (const auto& [px, qty] : curr) {
    auto it = prev.find(px);
    if (it == prev.end() || it->second != qty) {
      md::MarketEvent ev;
      ev.ts_exchange_ns = recv_ts_ns;
      ev.ts_recv_ns = recv_ts_ns;
      ev.seq = seq++;
      ev.price_fp = px;
      ev.qty_fp = qty;
      ev.symbol_id = symbol_id;
      ev.event_type = snapshot_start ? md::EventType::Snapshot : md::EventType::Delta;
      ev.side = side;
      ev.flags = snapshot_start && events.empty() ? md::EventFlags::SnapshotStart : md::EventFlags::None;
      events.push_back(ev);
    }
  }

  for (const auto& [px, _] : prev) {
    if (curr.find(px) == curr.end()) {
      md::MarketEvent ev;
      ev.ts_exchange_ns = recv_ts_ns;
      ev.ts_recv_ns = recv_ts_ns;
      ev.seq = seq++;
      ev.price_fp = px;
      ev.qty_fp = 0;
      ev.symbol_id = symbol_id;
      ev.event_type = snapshot_start ? md::EventType::Snapshot : md::EventType::Delta;
      ev.side = side;
      ev.flags = snapshot_start && events.empty() ? md::EventFlags::SnapshotStart : md::EventFlags::None;
      events.push_back(ev);
    }
  }
}

SideBook ToMap(const std::vector<md::ParsedLevel>& levels) {
  SideBook out;
  for (const auto& l : levels) {
    out[l.price_fp] = l.qty_fp;
  }
  return out;
}

}  // namespace

int main(int argc, char** argv) {
  try {
    const Args args = ParseArgs(argc, argv);
    std::filesystem::create_directories(std::filesystem::path(args.binlog_out).parent_path());

    const uint32_t symbol_id = static_cast<uint32_t>(md::SymbolIdFromString(args.symbol));
    const std::string url = fmt::format("https://api.kraken.com/0/public/Depth?pair={}&count={}",
                                        args.symbol, args.depth);

    md::KrakenDepthParser parser;

    SideBook prev_bids;
    SideBook prev_asks;
    std::vector<md::MarketEvent> events;
    events.reserve(static_cast<size_t>(args.duration_sec) * static_cast<size_t>(args.depth) * 8ULL);

    uint64_t seq = 0;
    const int iterations = std::max(1, (args.duration_sec * 1000) / std::max(1, args.interval_ms));

    spdlog::info("Starting L2 capture symbol={} duration_sec={} interval_ms={} depth={}", args.symbol,
                 args.duration_sec, args.interval_ms, args.depth);

    const auto start = std::chrono::steady_clock::now();
    for (int i = 0; i < iterations; ++i) {
      const auto t0 = std::chrono::steady_clock::now();
      const auto body = HttpGet(url);
      const auto snap = parser.Parse(body);
      const uint64_t recv_ts_ns = static_cast<uint64_t>(
          std::chrono::duration_cast<std::chrono::nanoseconds>(std::chrono::steady_clock::now() - start)
              .count());

      const auto curr_bids = ToMap(snap.bids);
      const auto curr_asks = ToMap(snap.asks);
      const bool first = (i == 0);

      EmitDiffEvents(prev_bids, curr_bids, md::Side::Bid, symbol_id, recv_ts_ns, seq, events, first);
      EmitDiffEvents(prev_asks, curr_asks, md::Side::Ask, symbol_id, recv_ts_ns, seq, events, first);

      prev_bids = curr_bids;
      prev_asks = curr_asks;

      const auto elapsed = std::chrono::steady_clock::now() - t0;
      const auto sleep_for = std::chrono::milliseconds(args.interval_ms) -
                             std::chrono::duration_cast<std::chrono::milliseconds>(elapsed);
      if (sleep_for.count() > 0) {
        std::this_thread::sleep_for(sleep_for);
      }
    }

    md::BinlogHeader header;
    header.symbol_id = symbol_id;
    header.depth_levels = static_cast<uint32_t>(args.depth);

    md::Binlog::Write(args.binlog_out, header, events);
    spdlog::info("Capture complete. events={} binlog={}", events.size(), args.binlog_out);

    std::cout << args.binlog_out << '\n';
    return 0;
  } catch (const std::exception& ex) {
    std::cerr << "capture failed: " << ex.what() << '\n';
    return 1;
  }
}
