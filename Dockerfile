# Reference:
# https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/

FROM node:18.13.0-bullseye-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init
# Optimizes build for express.js.
WORKDIR /usr/src/app
COPY package.json package-lock.json .
RUN npm ci
COPY tsconfig.json .
COPY src/ ./src
RUN npm run build
RUN npm prune --omit=dev

FROM gcr.io/distroless/nodejs18-debian11
ENV NODE_ENV production
ENV NODE_PATH ./dist
USER nonroot
COPY --chown=nonroot:nonroot --from=build /usr/src/app /usr/src/app
WORKDIR /usr/src/app
CMD ["./dist/index.js"]
