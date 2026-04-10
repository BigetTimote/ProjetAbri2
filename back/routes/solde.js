const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const verifyToken = require('../middleware/authMiddleware');

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

router.get('/', verifyToken, (req, res) => {
    const sql = "SELECT nom, credit_temps FROM users WHERE id = ?";
    db.query(sql, [req.user.id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: "Introuvable" });
        res.json({ 
            nom: results[0].nom, 
            credit: results[0].credit_temps 
        });
    });
});

module.exports = router;