FROM node:lts-bookworm-slim
LABEL authors="rudydelorenzo"

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

EXPOSE 3001

CMD ["node", "app.js"]