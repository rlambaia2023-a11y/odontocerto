FROM oven/bun:1.1.38-alpine
WORKDIR /app
COPY dist/index.tsx ./index.tsx
ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "index.tsx"]
