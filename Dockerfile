FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src
COPY public ./public
COPY server.js ./

ENV NODE_ENV=production
ENV PORT=8080
ENV APP_COLOR=blue
ENV APP_VERSION=v1

EXPOSE 8080

CMD ["node", "src/app.js"]
