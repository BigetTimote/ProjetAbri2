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
            if (data.type === 'BOX_UPDATE') fetchBoxes();
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
        setupRealtime(); 
    }
}

//  GESTIONNAIRE D'ÉVÉNEMENTS 

window.onload = () => {
    initUI();

    document.addEventListener('click', (e) => {
        if (e.target.id === 'btn-register') { e.preventDefault(); register(); }
        if (e.target.id === 'btn-login') { e.preventDefault(); login(); }
        if (e.target.classList.contains('btn-logout')) { e.preventDefault(); logout(); }
        
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
