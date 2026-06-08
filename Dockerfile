FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --omit=dev
COPY server-http.js scrapers.js ./
COPY public/ ./public/
EXPOSE 3456
CMD ["node", "server-http.js"]
