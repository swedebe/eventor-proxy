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

// Validate API key with XML to JSON conversion
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
    response.on('end', async () => {
      console.log('Raw XML response from Eventor:', data);
      try {
        const json = await parseStringPromise(data, { explicitArray: false });
        res.json(json);
      } catch (error) {
        console.error('Error parsing XML to JSON:', error);
        res.status(500).send({ error: 'Failed to parse Eventor response as JSON', rawResponse: data });
      }
    });
  });

  request.on('error', (error) => {
    res.status(500).send({ error: error.message });
  });

  request.end();
});

// Fetch results by event with enhanced logging
app.post('/results/event', async (req, res) => {
  const { apiKey, eventId, includeSplitTimes } = req.body;

  if (!apiKey || !eventId) {
    console.error('Missing apiKey or eventId in request body:', req.body);
    return res.status(400).json({ error: 'Missing apiKey or eventId in request body' });
  }

  const eventorUrl = `${EVENTOR_API_BASE}/results/event?eventId=${eventId}&includeSplitTimes=${includeSplitTimes}`;
  console.log('Forwarding request to Eventor:', {
    url: eventorUrl,
    headers: {
      ApiKey: apiKey,
      Accept: 'application/xml'
    }
  });

  try {
    const response = await fetch(eventorUrl, {
      headers: {
        'ApiKey': apiKey,
        'Accept': 'application/xml'
      }
    });

    console.log('Eventor response status:', response.status, response.statusText);

    const xml = await response.text();
    console.log('Raw Eventor response:', xml);

    if (!response.ok) {
      return res.status(response.status).json({ error: `Eventor API error: ${response.statusText}`, rawResponse: xml });
    }

    const json = await parseStringPromise(xml, { explicitArray: false });
    res.json(json);
  } catch (error) {
    console.error('Error fetching results from Eventor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
