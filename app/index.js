const http = require('http');

const message = process.env.APP_MESSAGE || 'Hello from gitops-demo!';
const version = process.env.APP_VERSION || 'v1';

http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message, version }));
  })
  .listen(8080, () => console.log('listening on :8080'));
