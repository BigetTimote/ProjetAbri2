const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
    res.json({ 
        message: "Déconnexion réussie.",
        instruction: "Veuillez supprimer le JWT du localStorage." 
    });
});

module.exports = router;