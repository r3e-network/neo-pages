FROM node:24-bookworm-slim

WORKDIR /workspace
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

EXPOSE 3000 4000 8787

CMD ["npm", "run", "build"]
