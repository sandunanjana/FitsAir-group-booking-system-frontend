# --- Dev image with Vite ---
FROM node:20-alpine

WORKDIR /app

# Install deps first (better caching)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Vite must bind to 0.0.0.0 for Docker networking
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
