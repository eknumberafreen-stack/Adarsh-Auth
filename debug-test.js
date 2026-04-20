/**
 * Debug script — simulates exactly what the C# client sends
 * Run: node debug-test.js
 */
const crypto = require('crypto');
const http   = require('http');

const name    = 'Adarsh Internal';
const ownerid = 'c0b5729a55347ef1854c9beb32041cca';
const secret  = '87b81e1eba8b821d8f38704e3ab32420cd442c67c354b2e265dc7741a7840907a52712d8160241db17bd5bd644af95b068d04e5904330eb98972f30e95323985';
const version = '1.0.0';

// Step 1: empty body (same as C# for /init)
const payload  = {};
const bodyJson = JSON.stringify(payload);  // "{}"

// Step 2: build timestamp + nonce
const timestamp = Date.now();
const nonce     = crypto.randomBytes(8).toString('hex');

// Step 3: sign — same formula as C#
const dataToSign = `${name}${ownerid}${timestamp}${nonce}${bodyJson}`;
const hmac       = crypto.createHmac('sha256', secret);
hmac.update(dataToSign);
const signature  = hmac.digest('hex');

// Step 4: build full request (same as C# fullPayload)
const fullPayload = {
  ...payload,
  app_name:  name,
  owner_id:  ownerid,
  timestamp: timestamp,   // number, same as C# long
  nonce:     nonce,
  signature: signature
};

const requestJson = JSON.stringify(fullPayload);

console.log('--- Sending to /api/client/init ---');
console.log('dataToSign:', dataToSign);
console.log('signature:', signature);
console.log('body:', requestJson);

// Step 5: POST to backend
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/client/init',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestJson)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('\n--- Response ---');
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
  });
});

req.on('error', e => console.error('Request error:', e.message));
req.write(requestJson);
req.end();
