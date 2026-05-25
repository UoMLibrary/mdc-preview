FROM node:20-alpine AS build

WORKDIR /app

ENV NODE_OPTIONS=--max-old-space-size=4096

COPY package.json package-lock.json ./
RUN npm ci --no-audit

COPY . .
RUN npm run build


FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV BODY_SIZE_LIMIT=64M
# Set ORIGIN, or trusted proxy headers, at deployment time to match the public URL.

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit && npm cache clean --force

COPY --from=build /app/build ./build
COPY healthcheck.mjs ./

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=2s --start-period=15s \
	CMD ["node", "healthcheck.mjs"]

CMD ["node", "build/index.js"]
