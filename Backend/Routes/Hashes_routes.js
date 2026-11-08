const express = require('express');
const routerHashes = express.Router();
const verifyToken = require('./authMiddleware');

routerHashes.get("/verify", verifyToken, (req, res) => {
    console.log("Verifying...");
    res.json({ valid: true, user: req.user });
});

module.exports = routerHashes;