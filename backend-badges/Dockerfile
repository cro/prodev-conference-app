FROM node:14-buster

WORKDIR /app
COPY server.mjs /app
COPY package.json /app
RUN npm install
CMD ["npm", "run", "start"]
