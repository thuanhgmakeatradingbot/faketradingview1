# Stage 1: Build client
FROM node:20-alpine AS client-build
WORKDIR /app
COPY shared/ shared/
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ .
RUN npm run build

# Stage 2: Build server + combined
FROM node:20-alpine
WORKDIR /app

# Install all dependencies (including dev for types)
COPY package.json package-lock.json ./
RUN npm ci

# Install ts-node for running TS directly
RUN npm install -g ts-node

# Copy shared + server source
COPY shared/ shared/
COPY server/ server/

# Copy client build from stage 1
COPY --from=client-build /app/client/build client/build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["ts-node", "--project", "server/tsconfig.json", "server/server.ts"]
