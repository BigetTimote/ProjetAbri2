const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const authMiddleware = require('../middleware/authMiddleware');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

router.get('/', authMiddleware, (req, res) => {
    if (req.user.admin !== 1) {
        return res.status(403).json({ error: "Accès interdit" });
    }

    const sql = "SELECT badge_uid, nom, prenom FROM users ORDER BY nom ASC";
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Erreur SQL détaillée:", err);
            return res.status(500).json({ error: "Erreur base de données" });
        }
        res.json(results);
    });
});

module.exports = router;