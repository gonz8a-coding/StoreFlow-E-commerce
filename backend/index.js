// Vercel backend entrypoint.
// This file exists in source control so Vercel can validate the service.
// The compiled server module exports the Express app for Vercel runtime.

module.exports = require('./dist/server.js').default;
