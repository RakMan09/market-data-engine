FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake ninja-build git curl ca-certificates \
    python3 unzip pkg-config libcurl4-openssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . /app

RUN cmake -S . -B build -GNinja -DCMAKE_BUILD_TYPE=Release && cmake --build build -j

CMD ["bash", "-lc", "make demo"]
