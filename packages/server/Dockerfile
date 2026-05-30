FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json tsup.config.ts tsconfig.json ./
COPY src ./src
# Replace workspace reference with npm version
RUN sed -i 's/"@nothingmail\/nmp": "workspace:\*"/"@nothingmail\/nmp": "^0.3.0"/' package.json \
    && npm install \
    && npx tsup

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json.orig
RUN sed 's/"@nothingmail\/nmp": "workspace:\*"/"@nothingmail\/nmp": "^0.3.0"/' package.json.orig > package.json \
    && rm package.json.orig \
    && npm install --omit=dev
ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000
CMD ["node", "dist/index.js"]
