# ---------- Stage 1: build ----------
FROM node:24-alpine AS build
WORKDIR /app

# ติดตั้ง dependencies ก่อนเพื่อใช้ layer cache
COPY package.json package-lock.json ./
RUN npm ci

# คัดลอกซอร์สแล้ว build (ไม่มีคีย์ API เกี่ยวข้องในขั้นตอนนี้ —
# bundle ที่ได้ไม่มีความลับใด ๆ ฝังอยู่)
COPY . .
RUN npm run build

# ---------- Stage 2: serve ด้วย nginx ----------
FROM nginx:alpine

# ไฟล์ SPA ที่ build แล้ว
COPY --from=build /app/dist /usr/share/nginx/html

# เทมเพลต nginx — entrypoint ของ image จะ envsubst ${API_KEY} ตอนสตาร์ต
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
