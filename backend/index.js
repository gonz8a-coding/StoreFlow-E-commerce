// Vercel backend entrypoint.
// This file exists in source control so Vercel can validate the service.
// Export a serverless-compatible handler.

const app = require('./dist/server.js').default;

module.exports = async function handler(req, res) {
  return app(req, res);
};
