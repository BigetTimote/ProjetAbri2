// CORRECTION POUR L'API NODE.JS DELETE
// Fichier: routes/delete.js

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
     console.log("? Token manquant ou invalide");
  console.log("Header reçu:", authHeader);
        return res.status(401).json({ error: "Token manquant : Authentification requise" });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_de_secours');
        console.log("? Token vérifié pour l'utilisateur:", decoded.id);
    } catch (err) {
        console.log("? Token invalide:", err.message);
        return res.status(401).json({ error: "Token invalide ou expiré" });
    }

    const requesterId = decoded.id;
    const targetBadgeOrId = req.params.id;  // Peut être soit badge_uid soit id

    console.log(`[DELETE] Suppression demandée par ${requesterId} pour ${targetBadgeOrId}`);

    // 3. Vérifier que le demandeur est admin
    db.query('SELECT is_admin FROM users WHERE id = ?', [requesterId], (err, rows) => {
        if (err) {
         console.error("? Erreur SQL (vérification admin):", err.message);
     return res.status(500).json({ error: "Erreur BDD", detail: err.message });
        }

        if (rows.length === 0) {
          console.log("? Utilisateur demandeur introuvable");
            return res.status(404).json({ error: "Utilisateur demandeur introuvable" });
        }

        if (rows[0].is_admin !== 1) {
            console.log("? Accès refusé: utilisateur pas admin");
     return res.status(403).json({ error: "Accès refusé : droits administrateur requis" });
     }

    console.log("? Utilisateur a les droits admin");

    // 4. Chercher l'utilisateur à supprimer (peut être par id ou badge_uid)
  db.query(
            'SELECT id FROM users WHERE id = ? OR badge_uid = ?',
       [targetBadgeOrId, targetBadgeOrId],
            (err, userRows) => {
  if (err) {
         console.error("? Erreur SQL (recherche utilisateur):", err.message);
        return res.status(500).json({ error: "Erreur BDD", detail: err.message });
    }

        if (userRows.length === 0) {
       console.log(`? Utilisateur introuvable: ${targetBadgeOrId}`);
    return res.status(404).json({ error: `Utilisateur ${targetBadgeOrId} non trouvé` });
       }

       const targetUserId = userRows[0].id;
         console.log(`? Utilisateur trouvé avec ID: ${targetUserId}`);

             // 5. Supprimer l'utilisateur
                db.query('DELETE FROM users WHERE id = ?', [targetUserId], (err, result) => {
             if (err) {
     console.error("? Erreur SQL (suppression):", err.message);
        return res.status(500).json({ error: "Erreur BDD", detail: err.message });
   }

               if (result.affectedRows === 0) {
         console.log(`? Échec de suppression pour ID: ${targetUserId}`);
           return res.status(500).json({ error: "Erreur lors de la suppression" });
     }

          console.log(`? Utilisateur ${targetUserId} supprimé avec succès`);
            res.json({
       success: true,
             message: `Utilisateur supprimé avec succès`
           });
        });
            }
        );
    });
});

module.exports = router;
