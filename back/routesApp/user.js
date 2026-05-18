const express = require('express');
const router = express.Router();
const mysql = require('mysql2');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

router.get('/', async (req, res) => {
    const appSecret = req.headers['x-app-secret'];
    
    // 1. Vérification de la trame de sécurité
    if (!appSecret || appSecret !== process.env.APP_TRAME_SECRET4) {
        return res.status(403).json({ error: "Trame invalide : Accès refusé" });
    }

    const sql = "SELECT id,badge_uid, nom, prenom, classe,credit_temps FROM users ORDER BY nom ASC";
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Erreur SQL détaillée:", err);
            return res.status(500).json({ error: "Erreur base de données" });
        }
        res.json(results);
    });
});

module.exports = router;