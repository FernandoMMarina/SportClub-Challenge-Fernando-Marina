function fail(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}
module.exports = { fail };
