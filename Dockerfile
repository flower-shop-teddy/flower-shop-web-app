# Image chạy web-app: build bằng Node, phục vụ bằng nginx (không có Node trong image chạy thật).
# Build thử ở máy:  docker build -t web-app:local .  &&  docker run --rm -p 3000:8080 -e GATEWAY_URL=http://host.docker.internal:8080 web-app:local

# ---- Bước 1: build ----------------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
# Chép lockfile trước để Docker cache lớp node_modules khi chỉ đổi code
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---- Bước 2: chạy -----------------------------------------------------------------------------
# nginx-unprivileged: chạy bằng user không phải root, lắng nghe cổng 8080
FROM nginxinc/nginx-unprivileged:1.29-alpine
LABEL org.opencontainers.image.source="https://github.com/flower-shop-teddy/flower-shop-web-app"

# Địa chỉ gateway trong mạng docker; nginx thay vào nginx.conf lúc khởi động (envsubst của image gốc)
ENV GATEWAY_URL=http://api-gateway:8080
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
