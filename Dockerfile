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

# Build
RUN npm run build

# Expose port (8080 is standard for Cloud Run)
EXPOSE 8080

# Set NODE_ENV
ENV NODE_ENV=production

# Listen on PORT env var (Cloud Run sets this)
ENV PORT=8080

# Default database settings (will be overridden by Cloud Run environment variables)
ENV DB_HOST=127.0.0.1
ENV DB_PORT=5432
ENV DB_USERNAME=postgres
ENV DB_PASSWORD=postgres
ENV DB_DATABASE=guessly

# Create startup script that logs environment and starts app
RUN echo '#!/bin/sh\necho "Starting Guessly Backend..."\necho "NODE_ENV=$NODE_ENV"\necho "PORT=$PORT"\necho "DB_HOST=$DB_HOST"\necho "API_PREFIX=${API_PREFIX:-api/v1}"\nnode dist/main' > /app/start.sh && chmod +x /app/start.sh

# Start
CMD ["/app/start.sh"]
