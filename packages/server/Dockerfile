FROM node:22-alpine

WORKDIR /app

# Copy pre-built dist from host (built by pnpm in monorepo)
COPY dist ./dist

# Create a production package.json without workspace references
COPY package.json ./package.json.orig
RUN sed 's/"@nothingmail\/nmp": "workspace:\*"/"@nothingmail\/nmp": "^0.1.0"/' package.json.orig > package.json \
    && rm package.json.orig \
    && npm install --omit=dev

ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000
CMD ["node", "dist/index.js"]
