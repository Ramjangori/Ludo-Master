const http = require('http');
const server = require('../server.js');

const req = http.get('http://localhost:3000', (res) => {
  console.log(`Server responded with HTTP ${res.statusCode}`);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Received ${data.length} bytes. Title check:`, data.includes('<title>Ludo King') ? 'PASS' : 'FAIL');
    process.exit(0);
  });
});

req.on('error', (err) => {
  console.error('HTTP Request failed:', err);
  process.exit(1);
});
