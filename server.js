// server.js
const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

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
      'User-Agent': 'MeOS'
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
