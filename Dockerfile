FROM node:20-alpine

WORKDIR /app


COPY package*.json ./
RUN npm install


COPY . .

RUN npx prisma generate

RUN npm run build

RUN cp -r public .next/standalone/public || true
RUN cp -r .next/static .next/standalone/.next/static

ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
