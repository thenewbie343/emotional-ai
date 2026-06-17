const { PostHog } = require('posthog-node');

// Initialize PostHog client with project API key and host
const posthog = new PostHog('phc_AFQXLJ733zFpGqVjeS7D685D6YqobovzyesDG9sY5542', {
  host: 'https://app.posthog.com',
  flushAt: 1, // Flush events immediately in dev/production environments
  flushInterval: 1000
});

// Graceful shutdown
process.on('SIGTERM', () => posthog.shutdown());
process.on('SIGINT', () => posthog.shutdown());

module.exports = posthog;
