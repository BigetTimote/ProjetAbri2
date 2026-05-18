const express = require('express');
const router = express.Router();
const mysql = require('mysql2');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

// Route publique : retourner le nombre de boxes disponibles
router.get('/', (req, res) => {
    const sql = "SELECT COUNT(*) as available FROM boxes WHERE etat = 'LIBRE'";
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: "Erreur BDD : " + err.message });
        }
        res.json({
            available: results[0].available
        });
    });
});

module.exports = router;
