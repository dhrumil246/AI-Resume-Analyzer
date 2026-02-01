# Build stage for development dependencies
FROM node:20-alpine AS development-dependencies-env
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Build stage for production dependencies
FROM node:20-alpine AS production-dependencies-env
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Build stage
FROM node:20-alpine AS build-env
WORKDIR /app
COPY package.json package-lock.json ./
COPY . .
COPY --from=development-dependencies-env /app/node_modules ./node_modules
RUN npm run build

# Production stage
FROM node:20-alpine

# Add security: create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Copy production dependencies
COPY --from=production-dependencies-env /app/node_modules ./node_modules

# Copy built application
COPY --from=build-env /app/build ./build

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "run", "start"]