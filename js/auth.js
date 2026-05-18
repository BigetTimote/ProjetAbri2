const API_URL = 'https://site1.tspro.fr'; 
//const API_URL = 'http://172.29.254.14'; 

//  UTILITAIRES 

function getPayload(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(window.atob(base64));
    } catch (e) { return null; }
}

function formatTime(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}:${m < 10 ? '0' + m : m}`;
}

//  FONCTIONS API (AUTHENTIFICATION) 

async function register() {
    const nom = document.getElementById('reg-nom').value;
    const prenom = document.getElementById('reg-prenom').value;
    const password = document.getElementById('reg-pass').value;

    if (!nom || !password) return alert("Nom et mot de passe requis !");

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nom, prenom, password })
        });

        const data = await res.json();
        if (res.ok) {
            alert("Compte créé avec succès !");
            location.reload(); 
        } else {
            alert(data.error || "Erreur lors de l'inscription");
        }
    } catch (err) {
        alert("Le serveur Node ne répond pas sur le port 3000");
    }
}

async function login() {
    const username = document.getElementById('login-user').value;
    const password = document.getElementById('login-pass').value;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        if (res.ok && data.token) {
            localStorage.setItem('token', data.token);
            // Extraire l'ID du token et le sauvegarder
            const payload = getPayload(data.token);
            if (payload && payload.id) {
                localStorage.setItem('userId', payload.id);
            }
            location.reload();
        } else {
            alert(data.error || "Identifiants incorrects");
        }
    } catch (err) {
        alert("Impossible de contacter le serveur sur le port 3000");
    }
}

async function logout() {
    try {
        const res = await fetch(`${API_URL}/logout`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('Logout response:', res.status, res.ok);
    } catch (err) { 
        console.warn("Erreur déconnexion:", err); 
    }
    localStorage.removeItem('token');
    // Attendre un peu avant de rediriger pour que le serveur traite la requête
    setTimeout(() => {
        window.location.href = './index.html';
    }, 100);
}

//  FONCTIONS DE RÉCUPÉRATION DE DONNÉES 

async function fetchSolde() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/api/solde`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            document.getElementById('user-time').innerText = formatTime(data.credit);
            document.getElementById('user-name').innerText = data.nom;
        }
    } catch (err) { console.error("Erreur solde"); }
}

async function fetchBoxesAvailable() {
    try {
        const res = await fetch(`${API_URL}/api/boxes-available`);
        if (res.ok) {
            const data = await res.json();
            document.getElementById('boxesAvailable').innerText = data.available;
        }
    } catch (err) { console.error("Erreur boxes disponibles:", err); }
}

async function fetchUsers() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/api/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await res.json();
        const tbody = document.getElementById('users-list');
        if (!tbody) return;
        tbody.innerHTML = '';
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:8px; border:1px solid #ddd;">${user.nom}</td>
                <td style="padding:8px; border:1px solid #ddd;">${user.prenom}</td>
                <td style="padding:8px; border:1px solid #ddd; font-family: monospace;">${user.badge_uid || 'N/A'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) { console.error("Erreur users:", err); }
}

async function fetchBoxes() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/api/boxes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const boxes = await res.json();
        const tbody = document.getElementById('boxes-list');
        if (!tbody) return;
        tbody.innerHTML = '';
        boxes.forEach(box => {
            const tr = document.createElement('tr');
            const statusColor = box.etat === 'LIBRE' ? 'green' : 'red';
            tr.innerHTML = `
                <td style="padding:8px; border:1px solid #ddd;">${box.numero}</td>
                <td style="padding:8px; border:1px solid #ddd; color:${statusColor}; font-weight:bold;">${box.etat}</td>
                <td style="padding:8px; border:1px solid #ddd;">${box.user_id_actuel || '<i>Aucun</i>'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) { console.error("Erreur boxes:", err); }
}

//  INITIALISATION ET TEMPS RÉEL 

function setupRealtime() {
    // Utiliser wss:// si HTTPS, ws:// si HTTP
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const socket = new WebSocket(`${protocol}//${host}`);
    socket.onopen = () => console.log("Temps réel actif");
    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'UPDATE_TIME') fetchSolde();
            if (data.type === 'BOX_UPDATE') {
                fetchBoxes();
                fetchBoxesAvailable(); // Rafraîchir aussi pour les utilisateurs
            }
        } catch (e) { console.debug("Message WebSocket invalide"); }
    };
    socket.onerror = (err) => {
        console.debug("WebSocket reconnecting...");
    };
    socket.onclose = () => {
        setTimeout(setupRealtime, 10000);
    };
}

function setupAutoRefresh() {
    // Polling automatique: rafraîchit les boxes chaque 3 secondes
    const payload = getPayload(localStorage.getItem('token'));
    if (payload && payload.admin === 1) {
        setInterval(fetchBoxes, 3000);
    }
}

function initUI() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const payload = getPayload(token);
    if (!payload) return;

    document.getElementById('login-form').classList.add('hidden');
    const regForm = document.getElementById('register-form');
    if (regForm) regForm.classList.add('hidden');

    if (payload.admin === 1) {
        document.getElementById('admin-dashboard').classList.remove('hidden');
        document.getElementById('admin-name').innerText = payload.username;
        fetchBoxes(); 
        fetchUsers(); 
        setupRealtime();
        setupAutoRefresh();
    } else {
        document.getElementById('user-dashboard').classList.remove('hidden');
        document.getElementById('user-name').innerText = payload.username;
        fetchSolde();
        fetchBoxesAvailable(); // Charger le nombre de boxes disponibles
        setupRealtime();
        loadUserConsos(); // Charger le graphique de consommation
    }
}

//  WIDGET CONSOMMATION 

let myChart = null;

// Fonction pour parser une date MySQL ou ISO au format flexible
function parseDate(dateString) {
    if (!dateString || dateString === 'NULL' || dateString === null) return null;
    
    // Essayer directement comme date Javascript (format ISO)
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        console.log("✅ Date parsée au format ISO:", dateString, "=>", date);
        return date;
    }
    
    // Format MySQL: 2026-03-16 15:00:00
    const regexMySQL = /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/;
    const matchMySQL = dateString.match(regexMySQL);
    
    if (matchMySQL) {
        const [, year, month, day, hours, minutes, seconds] = matchMySQL;
        date = new Date(year, month - 1, day, hours, minutes, seconds);
        console.log("✅ Date parsée au format MySQL:", dateString, "=>", date);
        return date;
    }
    
    console.error("❌ Format de date non reconnu:", dateString);
    return null;
}

async function loadUserConsos() {
    try {
        const userId = localStorage.getItem('userId');
        console.log("🔍 userId récupéré:", userId);
        
        if (!userId) {
            console.log("❌ Pas d'userId trouvé");
            return;
        }

        const response = await fetch(`${API_URL}/api/affconsos`);
        console.log("📡 Réponse API:", response.status);
        
        if (!response.ok) {
            console.log("❌ API erreur:", response.status);
            return;
        }

        const apiData = await response.json();
        console.log("📊 Données reçues:", apiData);
        
        const userSession = apiData.data.find(session => session.id == userId);
        console.log("👤 Session trouvée:", userSession);
        
        if (!userSession) {
            console.log("❌ Aucune session pour cet utilisateur");
            // Afficher le message "Graphique non disponible"
            const consoCard = document.querySelector('.card.p-3.mb-4');
            if (consoCard) {
                consoCard.innerHTML = `
                    <h5 class="fw-bold mb-3">📊 Ma Dernière Consommation</h5>
                    <div class="alert alert-secondary text-center py-5" role="alert">
                        <p class="fs-6 text-muted">Graphique non disponible</p>
                        <p class="small text-muted mb-0">Une fois le retrait du véhicule effectué</p>
                    </div>
                `;
            }
            return;
        }

        const dateDebut = parseDate(userSession.date_debut);
        const dateFin = parseDate(userSession.date_fin);
        
        document.getElementById('dateDebut').textContent = dateDebut ? dateDebut.toLocaleString('fr-FR') : '-';
        document.getElementById('dateFin').textContent = dateFin ? dateFin.toLocaleString('fr-FR') : '-';

        // Vérifier si un véhicule est en cours de charge (date_fin vide)
        if (!dateFin || userSession.date_fin === null || userSession.date_fin === '' || userSession.date_fin === 'NULL') {
            console.log("🚲 Véhicule en cours de charge détecté");
            
            // Masquer le graphique et le prochain dépôt
            const consoCard = document.querySelector('.card.p-3.mb-4');
            if (consoCard) {
                consoCard.innerHTML = `
                    <h5 class="fw-bold mb-3">🚲 État de la Session</h5>
                    <div class="alert alert-info text-center py-5" role="alert">
                        <h3 class="display-5 fw-bold mb-3">⚡</h3>
                        <p class="fs-5 fw-bold">Véhicule en cours de charge</p>
                        <p class="text-muted mb-0">Début: <strong>${dateDebut ? dateDebut.toLocaleString('fr-FR') : '-'}</strong></p>
                    </div>
                `;
            }
            return;
        }

        // Calcul du prochain dépôt possible (25h après la fin de la dernière session)
        if (dateFin) {
            const prochainDepot = new Date(dateFin.getTime() + (25 * 60 * 60 * 1000)); // Ajouter 25h
            const maintenant = new Date();
            
            console.log("🔍 Debug prochain dépôt:");
            console.log("Date fin:", dateFin);
            console.log("Prochain dépôt:", prochainDepot);
            console.log("Maintenant:", maintenant);
            console.log("Peut faire dépôt?", maintenant >= prochainDepot);

            document.getElementById('nextDepotDiv').style.display = 'block';
            
            // Vérifier si on peut déjà faire un dépôt
            if (maintenant >= prochainDepot) {
                document.getElementById('nextDepotDate').textContent = prochainDepot.toLocaleString('fr-FR');
                document.getElementById('nextDepotCountdown').innerHTML = '<span class="text-success">✅ Vous pouvez faire un nouveau dépôt maintenant!</span>';
            } else {
                const tempsRestant = prochainDepot - maintenant;
                
                // Calculer les jours, heures, minutes
                const jours = Math.floor(tempsRestant / (1000 * 60 * 60 * 24));
                const heures = Math.floor((tempsRestant % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((tempsRestant % (1000 * 60 * 60)) / (1000 * 60));
                
                let countdown = '';
                if (jours > 0) countdown += `${jours}j `;
                countdown += `${heures}h ${minutes}min`;
                
                document.getElementById('nextDepotDate').textContent = prochainDepot.toLocaleString('fr-FR');
                document.getElementById('nextDepotCountdown').innerHTML = `<span class="text-danger">⏳ ${countdown} avant de pouvoir refaire un dépôt</span>`;
            }
        } else {
            document.getElementById('nextDepotDiv').style.display = 'none';
        }

        // Conversion temps (en minutes) en kWh
        // Formule: Énergie (kWh) = (Temps en minutes / 60) × Puissance (kW)
        const puissanceSolaire = 3; // kW (à adapter selon ta configuration)
        const puissanceEdf = 2; // kW (à adapter selon ta configuration)
        
        const kwhSolaire = ((userSession.temps_solaire / 60) * puissanceSolaire).toFixed(2);
        const kwhEdf = ((userSession.temps_edf / 60) * puissanceEdf).toFixed(2);
        const totalKwh = (parseFloat(kwhSolaire) + parseFloat(kwhEdf)).toFixed(2);
        
        // Vérifier si aucune consommation n'a été enregistrée
        if (parseFloat(totalKwh) === 0) {
            console.log("❌ Aucune consommation enregistrée");
            // Masquer le canvas et afficher le message
            const chartContainer = document.querySelector('div[style*="position: relative"]');
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div class="alert alert-secondary text-center py-5 m-0" role="alert">
                        <p class="fs-6 text-muted">Graphique non disponible</p>
                        <p class="small text-muted mb-0">Une fois le retrait du véhicule effectué</p>
                    </div>
                `;
            }
            // On continue pour afficher le prochain dépôt
        } else {
            // Calculer les pourcentages en kWh
            const pourcentageSolaire = totalKwh > 0 ? ((parseFloat(kwhSolaire) / totalKwh) * 100).toFixed(1) : 0;
            const pourcentageEdf = totalKwh > 0 ? ((parseFloat(kwhEdf) / totalKwh) * 100).toFixed(1) : 0;

            const ctx = document.getElementById('consoPieChart');
            if (!ctx) {
                console.log("❌ Canvas consoPieChart non trouvé");
                return;
            }

            console.log("✅ Canvas trouvé, création du graphique");
            const ctxData = ctx.getContext('2d');
            
            if (myChart) {
                myChart.destroy();
            }

            myChart = new Chart(ctxData, {
                type: 'pie',
                data: {
                    labels: [`Solaire (${pourcentageSolaire}%) - ${kwhSolaire} kWh`, `EDF (${pourcentageEdf}%) - ${kwhEdf} kWh`],
                    datasets: [{
                        data: [
                            parseFloat(kwhSolaire),
                            parseFloat(kwhEdf)
                        ],
                        backgroundColor: ['#f1c40f', '#2980b9'],
                        borderColor: ['#e8b50f', '#1e5f9d'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.label.split(' - ')[0] + ' - ' + context.parsed + ' kWh';
                                }
                            }
                        }
                    }
                }
            });
            console.log("✅ Graphique créé avec succès!");
        }

    } catch (error) {
        console.error("❌ Erreur chargement graphique:", error);
    }
}

//  GESTIONNAIRE D'ÉVÉNEMENTS 

window.onload = () => {
    initUI();

    // Rafraîchir le graphique toutes les 30 secondes
    setInterval(loadUserConsos, 30000);
    
    // Rafraîchir le nombre de boxes disponibles toutes les 10 secondes
    setInterval(fetchBoxesAvailable, 10000);
    
    // Mettre à jour le countdown du prochain dépôt toutes les minutes
    setInterval(updateNextDepotCountdown, 60000);

    document.addEventListener('click', (e) => {
        if (e.target.id === 'btn-register') { e.preventDefault(); register(); }
        if (e.target.id === 'btn-login') { e.preventDefault(); login(); }
        if (e.target.classList.contains('btn-logout') || e.target.closest('.btn-logout')) { e.preventDefault(); logout(); }
        
        if (e.target.id === 'to-reg') {
            e.preventDefault();
            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('register-form').classList.remove('hidden');
        }
        if (e.target.id === 'to-login') {
            e.preventDefault();
            document.getElementById('register-form').classList.add('hidden');
            document.getElementById('login-form').classList.remove('hidden');
        }
    });
};

// Fonction pour mettre à jour le countdown du prochain dépôt
function updateNextDepotCountdown() {
    const nextDepotText = document.getElementById('nextDepotDate').textContent;
    if (nextDepotText === '-') return;
    
    try {
        // Essayer de parser comme date locale d'abord
        let prochainDepot = parseDate(nextDepotText);
        if (!prochainDepot) {
            // Sinon essayer comme date javascript standard
            prochainDepot = new Date(nextDepotText);
        }
        
        if (isNaN(prochainDepot.getTime())) {
            console.error("❌ Format de date invalide pour countdown:", nextDepotText);
            return;
        }
        
        const maintenant = new Date();
        
        // Vérifier si on peut déjà faire un dépôt
        if (maintenant >= prochainDepot) {
            document.getElementById('nextDepotCountdown').innerHTML = '<span class="text-success">✅ Vous pouvez faire un nouveau dépôt maintenant!</span>';
        } else {
            const tempsRestant = prochainDepot - maintenant;
            const jours = Math.floor(tempsRestant / (1000 * 60 * 60 * 24));
            const heures = Math.floor((tempsRestant % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((tempsRestant % (1000 * 60 * 60)) / (1000 * 60));
            
            let countdown = '';
            if (jours > 0) countdown += `${jours}j `;
            countdown += `${heures}h ${minutes}min`;
            
            document.getElementById('nextDepotCountdown').innerHTML = `<span class="text-danger">⏳ ${countdown} avant de pouvoir refaire un dépôt</span>`;
        }
    } catch (e) {
        console.debug("Erreur mise à jour countdown:", e);
    }
}
