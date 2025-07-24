// File: models/Key.js
const mongoose = require("mongoose");

const KeySchema = new mongoose.Schema({
    ownerToken: { type: String, required: true },
    key: { type: String, required: true, unique: true },
    hwid: { type: String },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
    salt: { type: String, required: true },
    executionCount: { type: Number, default: 0 },
    lastExecuted: { type: Date },
});
module.exports = mongoose.model("Key", KeySchema);


module.exports = mongoose.model("Key", KeySchema);
