# Single-stage Dockerfile for Next.js production deploy.
# Simple and reliable; image is ~600MB. Optimize to multi-stage later if size matters.

FROM node:22-alpine
WORKDIR /app

# Install deps first so they're cached when only source changes
COPY package*.json ./
RUN npm ci

# Bring in the rest of the source and build
COPY . .
RUN npm run build

# Runtime config — these match fly.toml's [env] section
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

EXPOSE 8080
CMD ["npm", "start"]
