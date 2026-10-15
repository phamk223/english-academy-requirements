FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache poppler-utils && npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY scripts ./scripts
COPY migrations ./migrations
RUN mkdir -p /app/media/objects /app/media/.staging /app/media/imports && chown -R node:node /app/media
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
