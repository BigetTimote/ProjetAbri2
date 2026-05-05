const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
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
    const authHeader = req.headers['authorization'];

    // 1. Vérification de la trame de sécurité
    if (!appSecret || appSecret !== process.env.APP_TRAME_SECRET2) {
        return res.status(403).json({ error: "Trame invalide : Accès refusé" });
    }

    // 2. Vérification du token JWT
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Token manquant : Authentification requise" });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_de_secours');
    } catch (err) {
        return res.status(401).json({ error: "Token invalide ou expiré" });
    }

    const requesterId = decoded.id;
    const targetId = req.params.id;

    // 3. Vérification en BDD que le demandeur est bien admin
    db.query('SELECT is_admin FROM users WHERE id = ?', [requesterId], (err, rows) => {
        if (err) {
            console.error("Erreur SQL (vérification admin) :", err.message);
            return res.status(500).json({ error: "Erreur BDD", detail: err.message });
        }

        if (rows.length === 0) {
            return res.status(404).json({ error: "Utilisateur demandeur introuvable" });
        }

        if (rows[0].is_admin !== 1) {
            return res.status(403).json({ error: "Accès refusé : droits administrateur requis" });
        }

        // 4. Suppression de l'utilisateur cible
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
});

module.exports = router;