const express = require('express');
const router = express.Router();
const mysql = require('mysql2');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

// La route est montée sur /api/delete, donc ce point de terminaison est : /api/delete/user/:id
router.delete('/user/:id', (req, res) => {
    const appSecret = req.headers['x-app-secret'];
    const targetId = req.params.id;

    // 1. Vérification de la trame de sécurité
    if (!appSecret || appSecret !== process.env.APP_TRAME_SECRET2) {
        return res.status(403).json({ error: "Trame invalide : Accès refusé" });
    }

    // 2. Suppression de l'utilisateur
    db.query('DELETE FROM users WHERE id = ?', [targetId], (err, result) => {
        if (err) {
            console.error("Erreur SQL (suppression) :", err.message);
            return res.status(500).json({ error: "Erreur BDD", detail: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: `Utilisateur ${targetId} non trouvé dans la table 'users'` });
        }

        res.json({
            success: true,
            message: `Utilisateur ${targetId} supprimé avec succès`
        });
    });
});

module.exports = router;