FROM node:14

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "docker-compose", "up", "--build" ]
