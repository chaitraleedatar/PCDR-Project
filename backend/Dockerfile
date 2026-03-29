FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Serve frontend static files from /app/public
# (frontend/ directory is mounted as public/ via docker-compose volume)

EXPOSE 3000

CMD ["node", "src/server.js"]
