FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy Prisma schema before running generate
COPY prisma ./prisma
RUN npx prisma generate

# Copy rest of the code
COPY . .

# Build the app
RUN npm run build

# Start the app
CMD ["node", "dist/main.js"]
