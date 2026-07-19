FROM node:20
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install express mongoose ethers ipfs-http-client cors dotenv hardhat
COPY . .
EXPOSE 3000 8545
