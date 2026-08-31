const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/jmda';

async function connect() {
  await mongoose.connect(MONGO_URI);
}

module.exports = { connect, MONGO_URI };
