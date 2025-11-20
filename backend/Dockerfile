FROM node:18

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build
RUN npm run build

# Expose port (8080 is standard for Cloud Run)
EXPOSE 8080

# Set NODE_ENV
ENV NODE_ENV=production

# Start
CMD ["node", "dist/main"]
