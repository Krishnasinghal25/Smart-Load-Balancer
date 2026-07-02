# Build context is the repository root (see docker-compose.yml).
FROM node:20-alpine
WORKDIR /app

# Install load-balancer deps
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev --no-audit --no-fund

# The LB auto-spawns the demo backends, so install their deps too
COPY backend-services/package*.json ./backend-services/
RUN cd backend-services && npm install --omit=dev --no-audit --no-fund

# App source
COPY backend ./backend
COPY backend-services ./backend-services

WORKDIR /app/backend
EXPOSE 3030
CMD ["node", "src/server.js"]
