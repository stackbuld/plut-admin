FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NITRO_PRESET=node-server
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3043
COPY --from=builder /app/dist ./dist
EXPOSE 3043
CMD ["node", "dist/server/index.mjs"]
