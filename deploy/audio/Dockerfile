FROM node:24-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends git cmake build-essential ca-certificates curl && rm -rf /var/lib/apt/lists/*
ARG WHISPER_VERSION=v1.9.5
RUN git clone --depth 1 --branch ${WHISPER_VERSION} https://github.com/ggml-org/whisper.cpp /whisper
RUN cmake -S /whisper -B /whisper/build -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DGGML_NATIVE=ON -DGGML_OPENMP=OFF -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_SERVER=OFF -DWHISPER_CURL=OFF && cmake --build /whisper/build --target whisper-cli -j 2
RUN mkdir /models && curl -fL --retry 2 https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin -o /models/ggml-small.bin

FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /whisper/build/bin/whisper-cli /usr/local/bin/whisper-cli
COPY --from=build /models/ggml-small.bin /models/ggml-small.bin
COPY server/audio-service.mjs /app/audio-service.mjs
USER node
ENV WENDLER_AUDIO_PORT=5275
CMD ["node","/app/audio-service.mjs"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD ["node","-e","fetch('http://127.0.0.1:5275/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

