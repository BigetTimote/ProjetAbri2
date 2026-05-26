const express = require('express');
const router = express.Router();

// Route pour recevoir les consos de l'arduino et les afficher en console
router.post('/', (req, res) => {
    const consos = req.body;
    
    res.json({ 
        success: true, 
        message: "Consos reçues et affichées en console" 
    });
});

module.exports = router;
