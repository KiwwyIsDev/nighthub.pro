const mongoose = require("mongoose");

const HashSchema = new mongoose.Schema({
  token: { type: String, required: true },
  hash: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 3600 }, 
});

module.exports = mongoose.model("Hash", HashSchema);
