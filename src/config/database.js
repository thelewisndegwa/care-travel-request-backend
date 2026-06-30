const mongoose = require("mongoose");

function normalizeMongoUri(mongodbUri) {
  return mongodbUri.replace("mongodb://localhost", "mongodb://127.0.0.1");
}

async function connectDatabase(mongodbUri) {
  const uri = normalizeMongoUri(mongodbUri);
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);

  const { host, name } = mongoose.connection;
  console.log(`Connected to MongoDB at ${host}/${name}`);
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
};
