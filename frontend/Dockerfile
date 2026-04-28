FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5173
# Serve with a simple server or just npm run dev for this demo
CMD ["npm", "run", "dev", "--", "--host"]
