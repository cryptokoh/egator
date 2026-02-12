# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/adapters/package.json ./packages/adapters/
COPY packages/ai/package.json ./packages/ai/

# Install ALL workspace dependencies
RUN npm ci --include-workspace-root

# Copy source files
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages ./packages

# Build packages in dependency order
RUN npm run build --workspace=@aiegator/shared
RUN npm run build --workspace=@aiegator/database
RUN npm run build --workspace=@aiegator/adapters
RUN npm run build --workspace=@aiegator/api

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 aiegator

# Copy built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/public ./apps/api/public
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/adapters/dist ./packages/adapters/dist
COPY --from=builder /app/packages/adapters/package.json ./packages/adapters/
COPY --from=builder /app/package.json ./

USER aiegator

EXPOSE 3000

CMD ["node", "apps/api/dist/server.js"]
