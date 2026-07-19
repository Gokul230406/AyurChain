FROM node:18-alpine
WORKDIR /usr/src/app
RUN apt-get update && apt-get install -y python3 make g++
COPY package*.json ./
RUN npm install -g @rollup/rollup-linux-x64-gnu
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]