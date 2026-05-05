const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); 

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

router.post('/', (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT * FROM users WHERE nom = ?";

    db.query(sql, [username], async (err, results) => {
        if (err) return res.status(500).json({ error: "Erreur BDD" });
        
        if (results.length > 0) {
            const user = results[0];
            
            const match = await bcrypt.compare(password, user.password);

            if (match) {
                const token = jwt.sign(
                    { id: user.id, username: user.nom, admin: user.is_admin },
                    process.env.JWT_SECRET,
                    { expiresIn: '2h' }
                );
                return res.json({ token, admin: user.is_admin });
            } else {
                return res.status(401).json({ error: "Mot de passe incorrect" });
            }
        } else {
            return res.status(401).json({ error: "Utilisateur non trouvé" });
        }
    });
});

module.exports = router;
