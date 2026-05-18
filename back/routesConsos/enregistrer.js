const express = require('express');
const router = express.Router();
const mysql = require('mysql2');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

// Route pour enregistrer les consos reçues de l'Arduino
router.post('/enregistrer', (req, res) => {
    const { id_utilisateur, id_box, temps_edf, temps_solaire, date_debut, date_fin } = req.body;

    // Validation des données requises
    if (!id_utilisateur || !id_box || temps_edf === undefined || temps_solaire === undefined || !date_debut) {
        return res.status(400).json({ 
            error: "Champs manquants", 
            required: ["id_utilisateur", "id_box", "temps_edf", "temps_solaire", "date_debut"]
        });
    }

    const insertSql = `
        INSERT INTO Consommation_Session (id_utilisateur, id_box, temps_edf, temps_solaire, date_debut, date_fin)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
        id_utilisateur,
        id_box,
        temps_edf,
        temps_solaire,
        date_debut,
        date_fin || null
    ];

    db.query(insertSql, values, (err, result) => {
        if (err) {
            console.error("❌ Erreur SQL (insertion conso):", err.message);
            return res.status(500).json({ error: "Erreur BDD", details: err.message });
        }

        console.log("✅ Conso enregistrée:");
        console.log(`   User: ${id_utilisateur}, Box: ${id_box}`);
        console.log(`   EDF: ${temps_edf}min, Solaire: ${temps_solaire}min`);
        console.log(`   Début: ${date_debut}, Fin: ${date_fin || 'N/A'}`);

        res.status(201).json({
            success: true,
            message: "Consommation enregistrée avec succès",
            id_session: result.insertId
        });
    });
});

module.exports = router;
