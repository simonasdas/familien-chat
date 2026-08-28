# syntax=docker/dockerfile:1
FROM node:22-alpine AS base

# ---- Install deps (need build tools for better-sqlite3 native build) ----
FROM base AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm ci

# ---- Build the Next.js app ----
FROM base AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Production image ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Ensure the persistent data dir exists and is writable
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs \
    && mkdir -p /app/data \
    && chown -R nextjs:nodejs /app/data /app/node_modules /app/.next /app/public /app/package.json

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["npm", "run", "start"]
