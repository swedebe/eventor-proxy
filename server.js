// server.js
const express = require('express');
const cors = require('cors');
const https = require('https');
const { parseStringPromise } = require('xml2js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.originalUrl}`);
  next();
});

const EVENTOR_API_BASE = 'https://eventor.orientering.se/api';
const EVENTOR_API_KEY = process.env.EVENTOR_API_KEY;

// Validate API key
app.post('/validate-eventor-api-key', (req, res) => {
  const apiKey = req.body.apiKey;
  if (!apiKey) {
    return res.status(400).send({ error: 'Missing apiKey in request body' });
  }

  const options = {
    hostname: 'eventor.orientering.se',
    path: '/api/organisation/apiKey',
    method: 'GET',
    headers: {
      'ApiKey': apiKey,
      'Accept': 'application/xml'
    }
  };

  const request = https.request(options, (response) => {
    let data = '';
    response.on('data', (chunk) => { data += chunk; });
    response.on('end', () => {
      res.status(response.statusCode).send(data);
    });
  });

  request.on('error', (error) => {
    res.status(500).send({ error: error.message });
  });

  request.end();
});

// Fetch results by event
app.get('/results/event', async (req, res) => {
  const eventId = req.query.eventId;
  const includeSplitTimes = req.query.includeSplitTimes || 'false';

  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId parameter' });
  }

  try {
    const response = await fetch(`${EVENTOR_API_BASE}/results/event?eventId=${eventId}&includeSplitTimes=${includeSplitTimes}`, {
      headers: {
        'ApiKey': EVENTOR_API_KEY,
        'Accept': 'application/xml'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Eventor API error: ${response.statusText}` });
    }

    const xml = await response.text();
    const json = await parseStringPromise(xml, { explicitArray: false });
    res.json(json);
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
