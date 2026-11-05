const path = require('node:path');
const secret = process.env.JWT_SECRET;
if (!secret || Buffer.byteLength(secret) < 32) {
  throw new Error('Configurá JWT_SECRET con al menos 32 bytes en .env.');
}
const dataFile = process.env.DATA_FILE || path.join(__dirname, '../../data/users.json');
module.exports = {
  jwtSecret: secret,
  jwtExpiresIn: '1h',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  reservationFile: process.env.RESERVATIONS_FILE || path.join(path.dirname(dataFile), 'reservations.json'),
  dataFile,
};
