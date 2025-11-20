FROM node:18

WORKDIR /app

# Copy package files from backend
COPY backend/package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy backend source code and config files
COPY backend/src ./src
COPY backend/tsconfig.json ./
COPY backend/tsconfig.build.json ./
COPY backend/nest-cli.json ./
COPY backend/.prettierrc ./

# Copy environment file for production
COPY backend/.env.production .env

# Build
RUN npm run build

# Expose port (8080 is standard for Cloud Run)
EXPOSE 8080

# Set NODE_ENV
ENV NODE_ENV=production

# Listen on PORT env var (Cloud Run sets this)
ENV PORT=8080

# Start
CMD ["node", "dist/main"]
