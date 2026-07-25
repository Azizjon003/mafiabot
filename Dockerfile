# syntax=docker/dockerfile:1.6

# ===== 1) Deps — faqat prod dependencies =====
FROM node:20-alpine AS deps
WORKDIR /app
# Prisma uchun openssl + libc6-compat
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

# ===== 2) Builder — TS -> JS kompilyatsiya =====
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ===== 3) Runner — minimal prod image =====
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat dumb-init

ENV NODE_ENV=production

# Non-root user — xavfsizlik
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs bot

COPY --from=deps   /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=deps   /app/prisma ./prisma
COPY package.json ./

# Assets papkasi (photos.json) — mavjud bo'lmasa yaratamiz
RUN mkdir -p /app/assets && chown -R bot:nodejs /app

USER bot

# SIGINT/SIGTERM ni dumb-init orqali uzatamiz — graceful shutdown ishlashi uchun
ENTRYPOINT ["dumb-init", "--"]

# Prod'da migration o'rniga `db push` — schema hali migration tarixida yo'q (Config, ConfigAudit, Game.state kabi yangi maydonlar).
# DIQQAT: --accept-data-loss OLIB TASHLANDI. U bilan `db push` ustunlarni jimgina o'chirib yuborishi
# (prod ma'lumot yo'qolishi) mumkin edi. Endi buzg'unchi (destructive) o'zgarish bo'lsa push xato bilan
# to'xtaydi — ma'lumot o'chmaydi.
# TODO: migration tarixi to'liq emas. To'g'ri yechim — `prisma migrate dev --name init` bilan
# migration yaratib, bu yerni `npx prisma migrate deploy` ga o'tkazish.
CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
