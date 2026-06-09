const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const authMiddleware = require('./middleware/authMiddleware');
const webpush = require('web-push');

// Utilisation d'un pool pour mieux gérer la connexion distante
const db = mysql.createPool({
    host: process.env.DB_HOST, 
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

webpush.setVapidDetails(
    'mailto:admin@abri.local',
    process.env.PUBLIC_VAPID_KEY,
    process.env.PRIVATE_VAPID_KEY
);

// POST /subscribe
router.post('/subscribe', authMiddleware, (req, res) => {
    const { subscription } = req.body;
    const userId = req.user.id;

    if (!subscription) {
        return res.status(400).json({ error: "Subscription manquante" });
    }

    const sql = `
        INSERT INTO user_push_subscriptions (user_id, subscription_data, created_at)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE subscription_data = VALUES(subscription_data), created_at = NOW()
    `;

    db.query(sql, [userId, JSON.stringify(subscription)], (err) => {
        if (err) {
            console.error('❌ Erreur SQL sur VM distante:', err);
            return res.status(500).json({ error: "Erreur sauvegarde" });
        }
        console.log(` Subscription enregistrée pour user ${userId}`);
        res.json({ message: "Subscription enregistrée" });
    });
});

// GET /session-info
router.get('/session-info', authMiddleware, (req, res) => {
    const userId = req.user.id;
    
    const sql = `
        SELECT id_utilisateur, date_debut, notification_sent,
        TIMESTAMPDIFF(MINUTE, date_debut, NOW()) as minutes_ecoulees
        FROM Consommation_Session 
        WHERE id_utilisateur = ? 
        ORDER BY date_debut DESC 
        LIMIT 1
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('❌ Erreur SQL détaillée:', err.message);
            return res.status(500).json({ error: "Erreur BDD", details: err.message });
        }

        if (results.length === 0) {
            return res.json({ 
                session_active: false,
                session_duration_minutes: 0,
                notification_sent: false
            });
        }

        const minutes = results[0].minutes_ecoulees;
        const notificationSent = results[0].notification_sent === 1;
        
        res.json({
            session_active: true,
            session_duration_minutes: minutes,
            notification_sent: notificationSent,
            will_notify_at: minutes >= 1 ? true : false
        });
    });
});

router.post('/unsubscribe', authMiddleware, (req, res) => {
    const userId = req.user.id;
    db.query('DELETE FROM user_push_subscriptions WHERE user_id = ?', [userId], (err) => {
        if (err) return res.status(500).json({ error: "Erreur suppression" });
        res.json({ message: "Subscription supprimée" });
    });
});

module.exports = router;

