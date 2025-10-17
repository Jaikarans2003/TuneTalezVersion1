const functions = require('firebase-functions');
const { https } = require('firebase-functions');
const next = require('next');
const path = require('path');

const isDev = process.env.NODE_ENV !== 'production';
const nextjsDistDir = path.join('..', '.next');

const nextjsServer = next({
  dev: isDev,
  conf: {
    distDir: nextjsDistDir,
  },
});
const nextjsHandle = nextjsServer.getRequestHandler();

// Initialize the Next.js app once, outside the request handler
let nextjsReady = nextjsServer.prepare();

exports.nextjs = https.onRequest((req, res) => {
  // Handle root path requests properly
  if (req.path === '/nextjs') {
    res.redirect('/');
    return;
  }
  
  return nextjsReady
    .then(() => nextjsHandle(req, res))
    .catch(error => {
      console.error('Error during request handling:', error);
      res.status(500).send('Internal Server Error');
    });
});