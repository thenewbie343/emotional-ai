require('dotenv').config();
require('dns').setDefaultResultOrder('ipv4first'); // Force IPv4 globally for Node.js
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./api/routes');
const parasiteRoutes = require('./api/parasiteRoutes');
const { startAbsenceWorker } = require('./jobs/absenceWorker');
const redis = require('./redisClient');

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: process.env.CLIENT_URL || '*',
  credentials: true
};
app.use(cors(corsOptions));

app.use('/ingest', (req, res) => {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', async () => {
    try {
      const rawBody = Buffer.concat(chunks);
      const targetPath = req.originalUrl.replace(/^\/ingest/, '');
      const posthogUrl = `https://us.i.posthog.com${targetPath}`;
      
      const headers = { ...req.headers };
      delete headers.host;
      delete headers.origin;
      delete headers.referer;
      
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      if (ip) {
        headers['x-forwarded-for'] = ip;
      }
      
      const response = await fetch(posthogUrl, {
        method: req.method,
        headers: headers,
        body: req.method !== 'GET' && req.method !== 'HEAD' && rawBody.length > 0 ? rawBody : undefined,
      });
      
      res.status(response.status);
      response.headers.forEach((value, name) => {
        if (name.toLowerCase() !== 'transfer-encoding' && name.toLowerCase() !== 'content-encoding') {
          res.setHeader(name, value);
        }
      });
      
      const resBody = await response.arrayBuffer();
      res.send(Buffer.from(resBody));
    } catch (error) {
      console.error('[PostHog Proxy Error]:', error.message);
      res.status(500).json({ error: error.message });
    }
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRoutes);
app.use('/api/parasite', parasiteRoutes);

startAbsenceWorker();

app.get('/health', async (req, res) => {
  try {
    await redis.ping();
    res.json({ status: 'ok', redis: 'connected', ts: Date.now() });
  } catch (e) {
    console.error('[Health Check Warning] Redis ping failed:', e.message);
    res.status(500).json({ status: 'degraded', redis: 'down', error: e.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Emotional AI server running on port ${PORT}`);
});