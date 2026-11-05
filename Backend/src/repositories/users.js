const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { hashPassword } = require('../utils/password');

// Escrituras síncronas y atómicas: suficiente para un único proceso del challenge.
function createUserRepository(file) {
  function save(users) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, JSON.stringify(users, null, 2), { mode: 0o600 });
      fs.renameSync(temporary, file);
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }
  function read() { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  if (!fs.existsSync(file)) save([{
    id: 'user-demo', firstName: 'Alex', lastName: 'García',
    email: 'demo@sportclub.com', phone: '',
    passwordHash: hashPassword('SportClub123!'),
  }]);
  return {
    findByEmail: email => read().find(user => user.email === email),
    findById: id => read().find(user => user.id === id),
    /**
     * Alta de usuario. Leer, comprobar el email y escribir ocurre sin await,
     * así que dos registros simultáneos no pueden intercalarse en un solo proceso.
     * @returns el usuario creado, o undefined si el email ya está tomado.
     */
    create({ firstName, lastName, email, phone = '', password }) {
      const users = read();
      if (users.some(user => user.email === email)) return undefined;
      const user = { id: randomUUID(), firstName, lastName, email, phone,
        passwordHash: hashPassword(password) };
      users.push(user);
      save(users);
      return user;
    },
    update(id, changes) {
      const users = read();
      const user = users.find(item => item.id === id);
      if (!user) return undefined;
      Object.assign(user, changes);
      save(users);
      return user;
    },
  };
}
function publicUser({ passwordHash, ...user }) { return user; }
module.exports = { createUserRepository, publicUser };
