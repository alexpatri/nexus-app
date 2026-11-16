FROM node:24-alpine AS build

WORKDIR /src

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Sem elas o app cai no localhost do dev e o build passaria em silêncio.
ARG VITE_CORE_URL
ARG VITE_SYSTEMS_URL
RUN test -n "$VITE_CORE_URL" && test -n "$VITE_SYSTEMS_URL" \
 || { echo "defina VITE_CORE_URL e VITE_SYSTEMS_URL" >&2; exit 1; }
RUN npm run build

FROM caddy:2.11-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /src/dist /srv
