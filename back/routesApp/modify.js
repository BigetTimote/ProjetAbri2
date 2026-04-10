const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

// La route est montée sur /api/modify, donc ce point de terminaison est : /api/modify/user/:id
router.put('/user/:id', async (req, res) => {
    const appSecret = req.headers['x-app-secret'];
    
    // 1. Vérification de la trame de sécurité
    if (!appSecret || appSecret !== process.env.APP_TRAME_SECRET) {
        return res.status(403).json({ error: "Trame invalide : Accès refusé" });
    }

    const userId = req.params.id;
    const { nom, prenom, password, badge } = req.body;
    let updates = [];
    let values = [];

    // 2. Construction de la requête selon les champs reçus
    if (nom) { updates.push("nom = ?"); values.push(nom); }
    if (prenom) { updates.push("prenom = ?"); values.push(prenom); }
    if (badge) { updates.push("badge_uid = ?"); values.push(badge); } // badge_uid en BDD
    
    if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updates.push("password = ?");
        values.push(hashedPassword);
    }

    if (updates.length === 0) return res.status(400).json({ error: "Rien à modifier" });

    values.push(userId);
    const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("❌ Erreur SQL détaillée :", err.message);
            return res.status(500).json({ error: "Erreur BDD", detail: err.message });
        }

        // Vérifie si l'utilisateur existe
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: `Utilisateur ${userId} non trouvé dans la table 'users'` });
        }

        // 3. Génération du Token JWT
        const newToken = jwt.sign(
            { id: userId, username: nom || "user", admin: false }, 
            process.env.JWT_SECRET || 'secret_de_secours', 
            { expiresIn: '2h' }
        );

        res.json({ 
            success: true, 
            message: "Profil mis à jour avec succès", 
            token: newToken 
        });
    });
    console.log("SECRET reçu:", req.headers['x-app-secret']);
console.log("SECRET attendu:", process.env.APP_TRAME_SECRET);
});

module.exports = router;