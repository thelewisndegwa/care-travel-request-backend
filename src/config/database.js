const mongoose = require("mongoose");

async function connectDatabase(mongodbUri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongodbUri);
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
};
