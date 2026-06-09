FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist/server ./dist/server
COPY --from=builder /app/dist/widget ./dist/widget
COPY --from=builder /app/dist/embed ./dist/embed
COPY demo ./demo
RUN mkdir -p /data/birdbot/uploads
ENV UPLOAD_DIR=/data/birdbot/uploads
ENV WIDGET_DIR=/app/dist/widget
ENV EMBED_DIR=/app/dist/embed
ENV DEMO_DIR=/app/demo
ENV PORT=4100
EXPOSE 4100
CMD ["node", "dist/server/index.js"]
