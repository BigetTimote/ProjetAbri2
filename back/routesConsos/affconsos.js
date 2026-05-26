const express = require('express');
const router = express.Router();
const mysql = require('mysql2');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

// Route pour récupérer les consos de la dernière session de chaque personne
router.get('/', (req, res) => {
    // Récupère la dernière session de chaque utilisateur
    const sql = `
        SELECT 
            u.id,
            u.nom,
            u.prenom,
            c.id_session,
            c.id_box,
            c.temps_edf,
            c.temps_solaire,
            c.date_debut,
            c.date_fin
        FROM users u
        LEFT JOIN (
            SELECT id_utilisateur, id_session, id_box, temps_edf, temps_solaire, date_debut, date_fin,
                   ROW_NUMBER() OVER (PARTITION BY id_utilisateur ORDER BY date_debut DESC) as rn
            FROM Consommation_Session
        ) c ON u.id = c.id_utilisateur AND c.rn = 1
        ORDER BY u.nom ASC
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ Erreur SQL:", err.message);
            return res.status(500).json({ error: "Erreur BDD", details: err.message });
        }
        
        res.json({
            success: true,
            data: results
        });
    });
});

module.exports = router;
