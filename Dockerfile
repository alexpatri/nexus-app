FROM node:24-alpine AS build

WORKDIR /src

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_CORE_URL=/core
ARG VITE_SYSTEMS_URL=/systems
RUN npm run build

FROM caddy:2.11-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /src/dist /srv
