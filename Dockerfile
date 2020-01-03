FROM node:10-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

# Arguments
ARG DB_HOST
ENV DB_HOST=${DB_HOST}

USER root
COPY package.json ./
RUN npm install

#check file .dockerignore
COPY --chown=node:node ./bin .
COPY --chown=node:node ./common .
COPY --chown=node:node ./controllers .
COPY --chown=node:node ./model .
COPY --chown=node:node ./services .
COPY --chown=node:node ./.env .
COPY --chown=node:node ./app.js .
COPY --chown=node:node ./package-lock.json .
COPY --chown=node:node ./README.md .

EXPOSE 4000

CMD [ "npm","run","start" ]