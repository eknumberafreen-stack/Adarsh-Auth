const fs = require('fs');
const path = require('path');

// Always bind to 0.0.0.0 in containers (Docker/Railway often inject HOSTNAME=<container-id>)
if (!process.env.HOSTNAME || process.env.HOSTNAME !== '0.0.0.0') {
  process.env.HOSTNAME = '0.0.0.0';
}

const standaloneServer = path.join(__dirname, '.next', 'standalone', 'server.js');

if (fs.existsSync(standaloneServer)) {
  require(standaloneServer);
} else {
  const nextBin = require.resolve('next/dist/bin/next');
  process.argv = [process.argv[0], nextBin, 'start'];
  require(nextBin);
}
