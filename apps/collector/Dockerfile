# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY apps/collector/package.json ./apps/collector/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/adapters/package.json ./packages/adapters/
COPY packages/ai/package.json ./packages/ai/

# Install dependencies
RUN npm ci --workspace=@aiegator/collector --include-workspace-root

# Copy source files
COPY tsconfig.base.json ./
COPY apps/collector ./apps/collector
COPY packages ./packages

# Build
RUN npm run build --workspace=@aiegator/shared
RUN npm run build --workspace=@aiegator/database
RUN npm run build --workspace=@aiegator/adapters
RUN npm run build --workspace=@aiegator/ai
RUN npm run build --workspace=@aiegator/collector

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 aiegator

# Copy built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/collector/dist ./apps/collector/dist
COPY --from=builder /app/apps/collector/package.json ./apps/collector/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/adapters/dist ./packages/adapters/dist
COPY --from=builder /app/packages/adapters/package.json ./packages/adapters/
COPY --from=builder /app/packages/ai/dist ./packages/ai/dist
COPY --from=builder /app/packages/ai/package.json ./packages/ai/
COPY --from=builder /app/package.json ./

USER aiegator

CMD ["node", "apps/collector/dist/index.js"]
