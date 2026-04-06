#include <filesystem>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <string>

#include <fmt/format.h>
#include <nlohmann/json.hpp>
#include <spdlog/spdlog.h>

#include "binlog.hpp"
#include "book.hpp"
#include "metrics.hpp"
#include "replay_engine.hpp"

namespace {

struct Args {
  std::string binlog{"artifacts/captured.binlog"};
  std::string artifacts{"artifacts"};
  bool pace{false};
  double speed{1.0};
  size_t sample_interval{10};
};

Args ParseArgs(int argc, char** argv) {
  Args args;
  for (int i = 1; i < argc; ++i) {
    std::string t = argv[i];
    if (t == "--binlog" && i + 1 < argc) {
      args.binlog = argv[++i];
    } else if (t == "--artifacts" && i + 1 < argc) {
      args.artifacts = argv[++i];
    } else if (t == "--pace") {
      args.pace = true;
    } else if (t == "--speed" && i + 1 < argc) {
      args.speed = std::stod(argv[++i]);
    } else if (t == "--sample-interval" && i + 1 < argc) {
      args.sample_interval = static_cast<size_t>(std::stoull(argv[++i]));
    }
  }
  return args;
}

void WriteSamplesHeader(const std::filesystem::path& p) {
  std::ofstream out(p, std::ios::trunc);
  out << "event_index,bid_price_fp,bid_qty_fp,ask_price_fp,ask_qty_fp\n";
}

void AppendSample(const std::filesystem::path& p, size_t idx, const md::TopOfBook& top) {
  std::ofstream out(p, std::ios::app);
  out << idx << ',' << top.bid.price_fp << ',' << top.bid.qty_fp << ',' << top.ask.price_fp << ','
      << top.ask.qty_fp << '\n';
}

}  // namespace

int main(int argc, char** argv) {
  try {
    const auto run_started = md::UtcNowIso8601();
    const Args args = ParseArgs(argc, argv);

    std::filesystem::create_directories(args.artifacts);
    const auto sample_csv = std::filesystem::path(args.artifacts) / "book_samples.csv";
    WriteSamplesHeader(sample_csv);

    auto data = md::Binlog::Read(args.binlog);

    md::ReplayConfig cfg;
    cfg.pace_to_wall_clock = args.pace;
    cfg.speed_multiplier = args.speed;
    cfg.sample_interval = args.sample_interval;

    md::ReplayEngine engine;

    md::L2Book first_book;
    auto first = engine.Replay(data.events, first_book, cfg,
                               [&](size_t i, const md::TopOfBook& top) { AppendSample(sample_csv, i, top); });

    md::L2Book second_book;
    auto second = engine.Replay(data.events, second_book, cfg);

    const bool deterministic = first.state_hash == second.state_hash;
    const double throughput = first.replay_wall_ns > 0
                                  ? (1e9 * static_cast<double>(first.events_processed) /
                                     static_cast<double>(first.replay_wall_ns))
                                  : 0.0;

    nlohmann::json metrics = {
        {"events", first.events_processed},
        {"throughput_msgs_per_sec", throughput},
        {"replay_wall_ns", first.replay_wall_ns},
        {"deterministic", deterministic},
        {"book_state_hash", first.state_hash},
        {"latency",
         {{"count", first.apply_latency.count},
          {"min_ns", first.apply_latency.min_ns},
          {"p50_ns", first.apply_latency.p50_ns},
          {"p95_ns", first.apply_latency.p95_ns},
          {"p99_ns", first.apply_latency.p99_ns},
          {"max_ns", first.apply_latency.max_ns},
          {"mean_ns", first.apply_latency.mean_ns}}}};

    {
      std::ofstream out(std::filesystem::path(args.artifacts) / "metrics.json", std::ios::trunc);
      out << metrics.dump(2) << '\n';
    }

    nlohmann::json metadata = {
        {"git_sha", md::TryGitSha()},
        {"build", {{"compiler", "c++20"}, {"mode", "release"}}},
        {"config",
         {{"pace", args.pace},
          {"speed_multiplier", args.speed},
          {"sample_interval", args.sample_interval}}},
        {"dataset", {{"source", "kraken_depth_rest"}, {"binlog", args.binlog}}},
        {"dataset_hashes", {{"binlog_sha256", md::Sha256File(args.binlog)}}},
        {"run_started_utc", run_started},
        {"run_finished_utc", md::UtcNowIso8601()}};

    {
      std::ofstream out(std::filesystem::path(args.artifacts) / "metadata.json", std::ios::trunc);
      out << metadata.dump(2) << '\n';
    }

    {
      std::ofstream out(std::filesystem::path(args.artifacts) / "report.md", std::ios::trunc);
      out << fmt::format("# Replay Report\n\n"
                         "- events: {}\n"
                         "- deterministic: {}\n"
                         "- throughput_msgs_per_sec: {:.2f}\n"
                         "- p50_ns: {}\n"
                         "- p95_ns: {}\n"
                         "- p99_ns: {}\n"
                         "- state_hash: {}\n",
                         first.events_processed, deterministic ? "true" : "false", throughput,
                         first.apply_latency.p50_ns, first.apply_latency.p95_ns,
                         first.apply_latency.p99_ns, first.state_hash);
    }

    spdlog::info("Replay complete events={} deterministic={} throughput={:.2f}",
                 first.events_processed, deterministic ? "true" : "false", throughput);

    return deterministic ? 0 : 2;
  } catch (const std::exception& ex) {
    std::cerr << "replay failed: " << ex.what() << '\n';
    return 1;
  }
}
