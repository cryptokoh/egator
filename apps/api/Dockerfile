# Build stage - build dependency packages only
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/adapters/package.json ./packages/adapters/
COPY packages/ai/package.json ./packages/ai/

# Install ALL workspace dependencies (including devDeps for tsx)
RUN npm ci --include-workspace-root

# Copy source files
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages ./packages

# Build dependency packages
RUN npm run build --workspace=@aiegator/shared
RUN npm run build --workspace=@aiegator/database
RUN npm run build --workspace=@aiegator/adapters || true

# Production stage - run server.ts with tsx
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy everything from builder (need source + deps for tsx)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.base.json ./

EXPOSE 3000

CMD ["npx", "tsx", "apps/api/src/server.ts"]
