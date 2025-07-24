const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  progress: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  keys: [{ type: String }],
  
  latestSourceVerified: {
    type: String,
    enum: ["linkvertise", "lootlab", null],
    default: null
  },
  lastSourceTimestamp: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model("User", UserSchema);
