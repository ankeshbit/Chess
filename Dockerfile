# Multi-stage production build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install all dependencies across workspace
RUN npm run install:all

# Copy full source
COPY . .

# Build server and client
RUN npm run build

# Production Runner Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
COPY server/package*.json ./server/

# Install only production dependencies for the server
RUN cd server && npm install --omit=dev

# Copy built artifacts from builder stage
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

# Expose default port
EXPOSE 5000

# Start server
CMD ["node", "server/dist/index.js"]
