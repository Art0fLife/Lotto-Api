# Development stage
FROM node:20-alpine AS development

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and scripts
COPY . .

# Make start script executable
RUN chmod +x start.sh

# Expose port
EXPOSE 7001

# Start with migrations
CMD ["./start.sh"]

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built application from development stage
COPY --from=development /app/dist ./dist

# Expose port
EXPOSE 7001

# Start in production mode
CMD ["npm", "run", "start:prod"]
