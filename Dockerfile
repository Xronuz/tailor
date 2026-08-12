# --- build the app ------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app

# Dependencies first, so a source-only change reuses this layer.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- run it -------------------------------------------------------------
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    DB_PATH=/data/tailor.db

# The server uses only Node built-ins (node:http, node:sqlite), so nothing is
# installed here — just the built app and the one server file.
COPY --from=build /app/dist ./dist
COPY --from=build /app/server/index.mjs ./server/index.mjs

# Orders live on a mounted volume, never inside the image.
RUN mkdir -p /data && chown -R node:node /data /app
VOLUME ["/data"]
USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.mjs"]
