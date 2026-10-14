FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates ripgrep && rm -rf /var/lib/apt/lists/*
RUN npm install -g @openai/codex@0.162.1 opencode-ai@1.19.0
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY server ./server
COPY src/design/*.json ./src/design/
COPY dist ./dist
COPY deploy/runtime/run.mjs ./deploy/runtime/run.mjs
USER node
ENV HOME=/home/node CODEX_HOME=/home/node/.codex WENDLER_DATA_DIR=/data WENDLER_VAULT_KEY_FILE=/run/secrets/vault.key WENDLER_BROWSER_ENDPOINT=ws://127.0.0.1:9223/session WENDLER_BROWSER_DESKTOP_URL=/computer/ WENDLER_PORT=5274 WENDLER_UI_PORT=5273
CMD ["node","deploy/runtime/run.mjs"]
HEALTHCHECK --interval=30s --timeout=6s --start-period=60s --retries=3 CMD ["node","-e","fetch('http://127.0.0.1:5274/api/health',{signal:AbortSignal.timeout(5000)}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
