const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function check(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) check(file);
    else if (entry.name.endsWith('.js')) execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  }
}
const root = path.join(__dirname, '..');
for (const directory of ['src', 'test', 'scripts']) check(path.join(root, directory));
for (const file of ['app.js', 'bin/www']) execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'inherit' });
console.log('Sintaxis JavaScript verificada.');
