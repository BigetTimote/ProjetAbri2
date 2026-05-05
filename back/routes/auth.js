const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

router.post('/generate-token', (req, res) => {
  const { userId, username } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId manquant" });
  }
  
  const token = jwt.sign(
    { id: userId, name: username },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    message: "Token JWT généré",
    token: token
  });
});

module.exports = router;