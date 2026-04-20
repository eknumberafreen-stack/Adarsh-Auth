const mongoose = require('mongoose');

// Global platform configuration (kill switch, maintenance mode, etc.)
const configSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

configSchema.statics.get = async function(key, defaultValue = null) {
  const doc = await this.findOne({ key }).lean();
  return doc ? doc.value : defaultValue;
};

configSchema.statics.set = async function(key, value) {
  return await this.findOneAndUpdate(
    { key },
    { key, value, updatedAt: new Date() },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model('Config', configSchema);
