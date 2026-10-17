# 本番用（Railway）。Next.js standalone 出力を node で起動する。
# ローカル開発は Dockerfile.dev（next dev）。docs/04

# ---- deps: 依存だけ先に入れてレイヤーキャッシュを効かせる ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: next build（standalone を出力） ----
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# ビルド時に必要な値。Railway のサービス変数がビルド引数として渡る。
# API_URL … トップ等の静的プリレンダーがビルド中に Laravel を叩くため。
#           Railway 内部 DNS はビルド時に解決できないので backend の「公開 URL」を渡す。
# R4: R3 にあった NEXT_PUBLIC_SITE_URL はコードで使っていないので外した
ARG API_URL
ENV API_URL=$API_URL \
    NEXT_TELEMETRY_DISABLED=1
# public/ が空だと git 経由のビルドコンテキストに含まれず run ステージの COPY が失敗する保険
RUN mkdir -p public && npm run build

# ---- run: standalone サーバー（server.js + 最小 node_modules） ----
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
