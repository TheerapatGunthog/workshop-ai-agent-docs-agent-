FROM node:20-alpine

# ใช้เป็นสัญญาณว่ากำลังรันใน container (npm run dev จะไม่ยอมรันนอก Docker)
ENV IN_DOCKER=1 \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]
