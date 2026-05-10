# Single-stage Dockerfile for Next.js production deploy.
# Simple and reliable; image is ~600MB. Optimize to multi-stage later if size matters.

FROM node:22-alpine
WORKDIR /app

# Install deps first so they're cached when only source changes
COPY package*.json ./
RUN npm ci

# Build-time public env vars. NEXT_PUBLIC_* must be present during `next build`
# because Next.js inlines them into the client bundle at compile time —
# runtime Fly secrets won't apply to the static JS chunks.
ARG NEXT_PUBLIC_PLAUSIBLE_DOMAIN
ARG NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_PLAUSIBLE_DOMAIN=$NEXT_PUBLIC_PLAUSIBLE_DOMAIN
ENV NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL=$NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY

# Bring in the rest of the source and build
COPY . .
RUN npm run build

# Runtime config — these match fly.toml's [env] section
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

EXPOSE 8080
CMD ["npm", "start"]
