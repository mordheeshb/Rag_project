FROM node:20-slim
# Install build dependencies for hnswlib-node
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Run embedding process if data doesn't exist
RUN npm run embed
EXPOSE 3002
CMD ["npm", "start"]
