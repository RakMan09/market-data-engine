cmake_minimum_required(VERSION 3.24)
project(marketdata_cpp VERSION 0.2.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

option(MARKETDATA_BUILD_TESTS "Build tests" ON)
option(MARKETDATA_BUILD_BENCH "Build benchmarks" ON)

include(FetchContent)

set(FMT_TEST OFF CACHE BOOL "" FORCE)
FetchContent_Declare(
  fmt
  GIT_REPOSITORY https://github.com/fmtlib/fmt.git
  GIT_TAG 11.0.2
)
FetchContent_MakeAvailable(fmt)

set(SPDLOG_BUILD_TESTING OFF CACHE BOOL "" FORCE)
set(SPDLOG_FMT_EXTERNAL ON CACHE BOOL "" FORCE)
FetchContent_Declare(
  spdlog
  GIT_REPOSITORY https://github.com/gabime/spdlog.git
  GIT_TAG v1.14.1
)
FetchContent_MakeAvailable(spdlog)

FetchContent_Declare(
  nlohmann_json
  GIT_REPOSITORY https://github.com/nlohmann/json.git
  GIT_TAG v3.11.3
)
FetchContent_MakeAvailable(nlohmann_json)

find_package(CURL REQUIRED)

add_library(marketdata_core
  src/market_event.cpp
  src/book.cpp
  src/parser.cpp
  src/binlog.cpp
  src/replay_engine.cpp
  src/metrics.cpp
)

target_include_directories(marketdata_core PUBLIC include)
target_link_libraries(marketdata_core
  PUBLIC
    fmt::fmt
    spdlog::spdlog
    nlohmann_json::nlohmann_json
    CURL::libcurl
)
target_compile_options(marketdata_core PRIVATE -Wall -Wextra -Wpedantic)

add_executable(capture src/capture_main.cpp)
target_link_libraries(capture PRIVATE marketdata_core)

add_executable(replay src/replay_main.cpp)
target_link_libraries(replay PRIVATE marketdata_core)

if(MARKETDATA_BUILD_TESTS)
  set(INSTALL_GTEST OFF CACHE BOOL "" FORCE)
  FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG v1.15.2
  )
  FetchContent_MakeAvailable(googletest)
  enable_testing()

  add_executable(test_parser tests/test_parser.cpp)
  target_link_libraries(test_parser PRIVATE marketdata_core GTest::gtest_main)
  add_test(NAME test_parser COMMAND test_parser)

  add_executable(test_book tests/test_book.cpp)
  target_link_libraries(test_book PRIVATE marketdata_core GTest::gtest_main)
  add_test(NAME test_book COMMAND test_book)

  add_executable(test_replay tests/test_replay.cpp)
  target_link_libraries(test_replay PRIVATE marketdata_core GTest::gtest_main)
  add_test(NAME test_replay COMMAND test_replay)

  add_executable(test_binlog tests/test_binlog.cpp)
  target_link_libraries(test_binlog PRIVATE marketdata_core GTest::gtest_main)
  add_test(NAME test_binlog COMMAND test_binlog)
endif()

if(MARKETDATA_BUILD_BENCH)
  set(BENCHMARK_ENABLE_TESTING OFF CACHE BOOL "" FORCE)
  set(BENCHMARK_ENABLE_GTEST_TESTS OFF CACHE BOOL "" FORCE)
  FetchContent_Declare(
    benchmark
    GIT_REPOSITORY https://github.com/google/benchmark.git
    GIT_TAG v1.8.4
  )
  FetchContent_MakeAvailable(benchmark)

  add_executable(bench_book bench/bench_book.cpp)
  target_link_libraries(bench_book PRIVATE marketdata_core benchmark::benchmark)

  add_executable(bench_replay bench/bench_replay.cpp)
  target_link_libraries(bench_replay PRIVATE marketdata_core benchmark::benchmark)
endif()
