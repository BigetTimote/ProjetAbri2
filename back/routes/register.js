const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const bcrypt = require('bcrypt'); 

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

router.post('/', async (req, res) => {
    const { nom, prenom, password, classe } = req.body;

    if (!nom || !password) return res.status(400).json({ error: "Champs manquants" });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const insertSql = `INSERT INTO users (nom, prenom, classe, password, badge_uid, credit_temps) VALUES (?, ?, ?, ?, ?, ?)`;
        const values = [nom, prenom || '', classe || 'BTS', hashedPassword, 'TEMP_' + Date.now(), 1500];

        db.query(insertSql, values, (err, result) => {
            if (err) return res.status(500).json({ error: "Erreur insertion", details: err.message });
            res.status(201).json({ message: "Utilisateur créé avec mot de passe haché !" });
        });
    } catch (err) {
        res.status(500).json({ error: "Erreur lors du hachage" });
    }
});

module.exports = router;