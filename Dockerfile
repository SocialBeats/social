FROM node:lts-alpine

WORKDIR /app

COPY . .

RUN npm ci --omit=dev --ignore-scripts
RUN rm -rf $(npm get cache)

ENTRYPOINT ["node", "main.js"]