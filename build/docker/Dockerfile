### compilation stage
FROM node:latest AS build

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

RUN mkdir /build
WORKDIR /build
COPY package.json .
RUN npm install
COPY . .
RUN npm run build

### "BackEnd for (micro)FrontEnd" pattern
FROM ghcr.io/polyfea/spa-base
COPY --from=build /build/www /spa/public
COPY build/docker/spa-base.yaml /spa/config/spa-base.yaml
ENV OTEL_SERVICE_NAME=napmap-ufe
ENV SPA_BASE_PORT=8080
EXPOSE 8080
