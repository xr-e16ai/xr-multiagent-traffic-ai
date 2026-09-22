# Use official Node.js LTS slim image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy pre-built Vite output and server-side files
# (build happens in CI/CD before docker build, not inside the container)
COPY dist/ ./dist/
COPY server.js ./
COPY admin-backend.js ./
COPY send-email.js ./

# Do NOT copy:
#   service-account-key.json  (use Cloud Run attached service account instead)
#   .env files                (use Cloud Run environment variables instead)
#   src/                      (frontend source — already compiled into dist/)
#   node_modules/             (installed fresh above)

# Expose Cloud Run default port
EXPOSE 8080

# Start the production server
CMD ["node", "server.js"]
