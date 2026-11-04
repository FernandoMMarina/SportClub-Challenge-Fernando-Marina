const path = require('node:path');
const secret = process.env.JWT_SECRET;
if (!secret || Buffer.byteLength(secret) < 32) {
  throw new Error('Configurá JWT_SECRET con al menos 32 bytes en .env.');
}
module.exports = {
  jwtSecret: secret,
  jwtExpiresIn: '1h',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  dataFile: process.env.DATA_FILE || path.join(__dirname, '../../data/users.json'),
};
