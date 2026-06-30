const bcrypt = require("bcryptjs");

function generateTemporaryPassword(email) {
  const prefix = (email || "travel").split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
  const randomSuffix = Math.random().toString(36).slice(-6);
  return `${prefix || "travel"}!${randomSuffix}`;
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

module.exports = {
  generateTemporaryPassword,
  hashPassword,
};
