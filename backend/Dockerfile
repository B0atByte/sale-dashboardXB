# xBloom Dashboard Backend
FROM node:24-alpine

WORKDIR /app

# ติดตั้ง dependencies ก่อน เพื่อใช้ layer cache ของ Docker
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# คัดลอกซอร์สโค้ด
COPY src ./src

# รันด้วย user ที่ไม่ใช่ root เพื่อความปลอดภัย
USER node

EXPOSE 3001

CMD ["node", "src/server.js"]
