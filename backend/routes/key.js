const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Key = require("../models/Key");
const crypto = require("crypto");

function isValidUUID(token) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(token);
}

const durationMap = {
    linkvertise: 8,
    lootlab: 6,
    direct_clicks: 8
};

router.post("/create", async (req, res) => {
    const token = req.cookies.token;
    if (!token || !isValidUUID(token)) return res.status(400).json({ error: "Invalid or missing token" });

    const user = await User.findOne({ token });
    if (!user || user.progress < 1 || !user.latestSourceVerified) {
        return res.status(403).json({ error: "Not enough progress or no verified source" });
    }

    const source = user.latestSourceVerified;
    const hours = durationMap[source];
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * hours);

    const key = crypto.randomBytes(16).toString("hex");
    const salt = crypto.randomBytes(32).toString("hex");

    await Key.create({ key, expiresAt, used: false, salt, ownerToken: token });

    user.progress -= 1;
    user.latestSourceVerified = null; // เคลียร์หลังใช้
    user.lastSourceTimestamp = null;
    user.keys.push(key);
    await user.save();

    return res.json({ key });
});

router.post("/extend", async (req, res) => {
    const token = req.cookies.token;
    const { key } = req.body;

    if (!token || !isValidUUID(token) || !key) {
        return res.status(400).json({ error: "Missing token or key" });
    }

    const user = await User.findOne({ token });
    if (!user || user.progress < 1 || !user.latestSourceVerified) {
        return res.status(403).json({ error: "Not enough progress or no verified source" });
    }

    const keyData = await Key.findOne({ key, ownerToken: token });
    if (!keyData) return res.status(404).json({ error: "Key not found" });

    const source = user.latestSourceVerified;
    const hours = durationMap[source];
    const now = new Date();
    const maxExpiry = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    const newExpiry = new Date(keyData.expiresAt.getTime() + hours * 60 * 60 * 1000);

    keyData.expiresAt = newExpiry > maxExpiry ? maxExpiry : newExpiry;
    await keyData.save();

    user.progress -= 1;
    user.latestSourceVerified = null;
    user.lastSourceTimestamp = null;
    await user.save();

    return res.json({ success: true, newExpiry: keyData.expiresAt });
});


router.post("/reset-hwid", async (req, res) => {
    const token = req.cookies.token;
    const { key } = req.body;
    if (!token || !isValidUUID(token)) return res.status(400).json({ error: "Invalid or missing token" });

    const user = await User.findOne({ token });
    if (!user || user.progress < 1) return res.status(403).json({ error: "Not enough progress" });

    const keyData = await Key.findOne({ key, ownerToken: token });
    if (!keyData) return res.status(404).json({ error: "Key not found" });

    keyData.hwid = undefined;
    keyData.salt = crypto.randomBytes(32).toString("hex");

    user.progress -= 1;
    await user.save();
    await keyData.save();

    return res.json({ success: true });
});



module.exports = router;
