FROM node:alpine3.24
WORKDIR /app
COPY index.js .

RUN rm -rf \
    /usr/local/lib/node_modules/npm \
    /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /usr/local/bin/corepack

EXPOSE 8080
CMD ["node", "index.js"]
