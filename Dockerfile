# Generic Remotion render worker (linux/amd64) for Bunny Magic Containers. No story code inside.
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates fonts-noto-color-emoji libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 \
      libxrandr2 libxkbcommon-dev libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && npx remotion browser ensure
COPY server.mjs ./
ENV PORT=8080 CONCURRENCY=8
EXPOSE 8080
CMD ["node", "server.mjs"]
