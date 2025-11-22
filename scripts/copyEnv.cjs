const fs = require('fs');
const path = require('path');

const envType = process.argv[2]; // local, docker, or compose
const sourceMap = {
  local: '.env.example',
  docker: '.env.docker.example',
  compose: '.env.docker-compose.example',
};

const source = sourceMap[envType];
const dest = '.env';

if (!source) {
  console.error('❌ Invalid environment type. Use: local, docker, or compose');
  process.exit(1);
}

try {
  fs.copyFileSync(source, dest);
} catch (error) {
  process.exit(1);
}
