const { ipcRenderer } = require('electron');

const usernameScreen = document.getElementById('username-screen');
const licenseScreen = document.getElementById('license-screen');
const welcomeScreen = document.getElementById('welcome-screen');
const settingsScreen = document.getElementById('settings-screen');
const orgNameModal = document.getElementById('org-name-modal');
const editorScreen = document.getElementById('editor-container');
const btnCheckUpdates = document.getElementById('btnCheckUpdates');
const updateStatusText = document.getElementById('update-status-text');

const usernameInput = document.getElementById('usernameInput');
const btnSetUsername = document.getElementById('btnSetUsername');
const licenseInput = document.getElementById('licenseInput');
const btnActivate = document.getElementById('btnActivate');
const licenseError = document.getElementById('licenseError');
const editor = document.getElementById('editor');
const viewModeSelector = document.getElementById('viewMode');
const appTitle = document.getElementById('app-title');
const hexInput = document.getElementById('hexInput');
const btnRemoveLicense = document.getElementById('btnRemoveLicense');

const fileUploadInput = document.getElementById('fileUploadInput');
const btnUploadFile = document.getElementById('btnUploadFile');
const cloudFileList = document.getElementById('cloudFileList');

const taskModal = document.getElementById('task-modal');
const taskInput = document.getElementById('taskTitleInput');
const btnConfirmTask = document.getElementById('btnConfirmTask');
const btnCancelTask = document.getElementById('btnCancelTask');

const btnSaveCloud = document.getElementById('btnSaveCloud'); 

const formatButtons = document.querySelectorAll('.editor-toolbar button:not(#btnSaveDirect):not(#btnSaveAs):not(#btnSaveCloud)');

const tabAdminApp = document.getElementById('tabAdminApp');
const adminContainer = document.getElementById('adminapp-container');

const tabConceptos = document.getElementById('tabConceptos');
const conceptosContainer = document.getElementById('conceptos-container');
const conceptUploadInput = document.getElementById('conceptUploadInput');
const btnUploadConcept = document.getElementById('btnUploadConcept');
const conceptsGrid = document.getElementById('conceptsGrid');

const API_URL = "https://twoo-api.vercel.app/api/verificar";

let currentUserRole = null;
let currentOrg = null;
let currentFilePath = null;
let currentCloudFileId = null;
let isActivated = localStorage.getItem('isActivated') === 'true';
let customColor = localStorage.getItem('customColor') || '#00ff41';
let refreshInterval = null;
let heartbeatInterval = null;

let cacheAdminUsers = [];
let cacheAdminLicenses = [];
let cacheAdminOrgs = [];

let viendoPapelera = false;
let lastAnnId = null;

const alertSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

initApp();

function initApp() {
    aplicarColor(customColor);
    if (viewModeSelector) actualizarEstadoToolbar();

    setupDragAndDrop();

    const storedUsername = localStorage.getItem('username');
    if (!storedUsername) {
        showScreen('username');
    } else {
        checkSession(storedUsername);
    }
}

function setupDragAndDrop() {
    const dropZones = [
        { id: 'col-pending', status: 'pending' },
        { id: 'col-progress', status: 'progress' },
        { id: 'col-done', status: 'done' }
    ];

    dropZones.forEach(zone => {
        const el = document.getElementById(zone.id);
        if (!el) return;
        
        const colContainer = el.parentElement; 
        
        colContainer.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            colContainer.style.background = 'rgba(255,255,255,0.03)';
        });

        colContainer.addEventListener('dragleave', (e) => {
            colContainer.style.background = 'transparent';
        });

        colContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            colContainer.style.background = 'transparent';
            const taskId = e.dataTransfer.getData('text/plain');
            if (taskId) {
                moveTask(taskId, zone.status);
            }
        });
    });
}

function showScreen(screenName) {
    if (usernameScreen) usernameScreen.style.display = 'none';
    if (licenseScreen) licenseScreen.style.display = 'none';
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    if (settingsScreen) settingsScreen.style.display = 'none';
    if (orgNameModal) orgNameModal.style.display = 'none';
    if (taskModal) taskModal.style.display = 'none';
    if (adminContainer) adminContainer.style.display = 'none';

    if (screenName === 'username') usernameScreen.style.display = 'flex';
    if (screenName === 'license') licenseScreen.style.display = 'flex';
    if (screenName === 'dashboard') {
        welcomeScreen.style.display = 'block';
        ipcRenderer.send('set-menubar', true);
        if (!refreshInterval) {
            refreshInterval = setInterval(cargarDatosRemotos, 30000); 
        }
        startHeartbeat();
    }
    if (screenName === 'settings') settingsScreen.style.display = 'flex';
}

window.mostrarNotificacion = (msg) => {
    const toast = document.createElement('div');
    toast.innerHTML = `
        <div style="display:flex; align-items:start; gap:12px; padding-right: 25px;">
            <span style="font-size:26px;">🔔</span>
            <div>
                <strong style="display:block; font-size:14px; margin-bottom:4px; color: var(--accent);">Mensaje de Equipo</strong>
                <span style="font-size:13px; font-weight:normal; color:#e0e0e0; line-height: 1.4;">${msg}</span>
            </div>
        </div>
        <button onclick="this.parentElement.remove()" style="position:absolute; top:10px; right:10px; background:transparent; border:none; color:#888; cursor:pointer; font-size:14px; transition: 0.2s;">✕</button>
    `;
    toast.style = "position:fixed; bottom:20px; right:20px; background:#1a1a1a; border: 1px solid #333; border-left: 4px solid var(--accent); padding:15px; border-radius:8px; z-index:999999; box-shadow: 0 10px 30px rgba(0,0,0,0.8); width: 320px; word-wrap: break-word;";
    document.body.appendChild(toast);
    
    alertSound.play().catch(e => console.log("Sonido bloqueado"));
};


function startHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(async () => {
        try {
            const hwid = await ipcRenderer.invoke('get-hwid');
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'heartbeat', hwid })
            });
            const data = await response.json();

            const userDisplay = document.getElementById('userInfoDisplay');
            if (userDisplay && userDisplay.innerText.includes('(Offline)')) {
                const orgName = currentOrg ? currentOrg.name : 'Sin Organización';
                userDisplay.innerText = `${localStorage.getItem('username')} | ${orgName}`;
            }

            if (data.hasNotifications) {
                const resNote = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'check_notifications', hwid })
                });
                const dataNote = await resNote.json();
                
                dataNote.notifications.forEach(msg => {
                    mostrarNotificacion(msg);
                });
            }

            if (data.announcement && data.annId !== lastAnnId) {
                lastAnnId = data.annId;
                const banner = document.getElementById('global-announcement');
                const textSpan = document.getElementById('announcement-text');
                if (banner && textSpan) {
                    textSpan.innerText = "📢 " + data.announcement;
                    banner.style.display = 'block';
                    alertSound.play().catch(e => console.log("Sonido bloqueado"));
                }
            }
        } catch (e) { 
            console.error("Heartbeat error", e);
            document.getElementById('userInfoDisplay').innerText = `${localStorage.getItem('username')} (Offline)`;
        }
    }, 30000);
}

window.closeAnnouncement = () => {
    const banner = document.getElementById('global-announcement');
    if (banner) banner.style.display = 'none';
};

window.notificarUsuario = (targetUsername) => {
    if (document.getElementById('custom-prompt-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = "custom-prompt-overlay";
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:999999; display:flex; justify-content:center; align-items:center; backdrop-filter: blur(5px);";
    
    overlay.innerHTML = `
        <div style="background:#18181b; padding:30px; border-radius:12px; border:1px solid #333; width: 400px; box-shadow: 0 10px 40px rgba(0,0,0,0.9);">
            <h3 style="margin-top:0; color:var(--accent); font-size:18px;">Enviar Notificación</h3>
            <p style="color:#aaa; font-size:13px;">Mensaje directo para: <b style="color:white;">${targetUsername}</b></p>
            <textarea id="custom-prompt-input" style="width:100%; height:80px; background:#0f0f0f; border:1px solid #444; color:white; padding:12px; border-radius:6px; margin-top:15px; resize:none; outline:none; font-family: inherit; font-size:14px;" placeholder="Escribe tu mensaje aquí..."></textarea>
            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
                <button id="custom-prompt-cancel" style="background:transparent; border:1px solid #444; color:#ccc; padding:8px 20px; border-radius:6px; cursor:pointer; font-weight:600 transition:0.2s;">Cancelar</button>
                <button id="custom-prompt-send" style="background:var(--accent); color:black; border:none; padding:8px 20px; border-radius:6px; cursor:pointer; font-weight:bold; transition:0.2s;">Enviar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('custom-prompt-input').focus();

    document.getElementById('custom-prompt-cancel').onclick = () => overlay.remove();
    
    document.getElementById('custom-prompt-send').onclick = async () => {
        const msg = document.getElementById('custom-prompt-input').value.trim();
        if (!msg) return;
        
        const btn = document.getElementById('custom-prompt-send');
        btn.innerText = "Enviando...";
        btn.disabled = true;

        try {
            const hwid = await ipcRenderer.invoke('get-hwid');
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send_notification',
                    hwid: hwid,
                    targetUser: targetUsername,
                    message: msg
                })
            });
            const data = await response.json();
            if (data.success) {
                overlay.remove();
                copyToClipboard(null, "📧 Mensaje enviado correctamente");
            } else {
                alert("Error al enviar notificación.");
                btn.innerText = "Enviar";
                btn.disabled = false;
            }
        } catch (e) {
            alert("Error de conexión al enviar.");
            btn.innerText = "Enviar";
            btn.disabled = false;
        }
    };
};

if (btnSetUsername) {
    btnSetUsername.addEventListener('click', () => {
        const name = usernameInput.value.trim();
        if (name) {
            localStorage.setItem('username', name);
            checkSession(name);
        }
    });
}

async function checkSession(username) {
    if (localStorage.getItem('isActivated') !== 'true') {
        showScreen('license');
        return;
    }

    try {
        const hwid = await ipcRenderer.invoke('get-hwid');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'login_or_register',
                username: username,
                hwid: hwid
            })
        });

        const data = await response.json();
        if (data.success) {
            iniciarDashboard(data);
        } else {
            showScreen('license');
        }
    } catch (e) {
        showScreen('dashboard');
        document.getElementById('userInfoDisplay').innerText = `${username} (Offline)`;
        const savedRole = localStorage.getItem('userRole');
        if(savedRole === 'TWOOSTUDIO' && tabAdminApp) tabAdminApp.style.display = 'block';
    }
}

if (btnActivate) {
    btnActivate.addEventListener('click', async () => {
        const code = licenseInput.value.trim();
        if (!code) return;

        const username = localStorage.getItem('username');
        const hwid = await ipcRenderer.invoke('get-hwid');

        const originalText = btnActivate.innerText;
        btnActivate.innerText = "Verificando...";
        btnActivate.disabled = true;
        licenseError.style.display = 'none';

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'login_or_register',
                    username, hwid, code
                })
            });

            const data = await response.json();

            if (data.requireOrgName) {
                sessionStorage.setItem('tempCode', code);
                orgNameModal.style.display = 'flex';
            } else if (data.success) {
                localStorage.setItem('isActivated', 'true');
                iniciarDashboard(data);
            } else {
                licenseError.innerText = data.message || "Código inválido.";
                licenseError.style.display = 'block';
            }
        } catch (e) {
            licenseError.innerText = "Error de conexión.";
            licenseError.style.display = 'block';
        } finally {
            btnActivate.innerText = originalText;
            btnActivate.disabled = false;
        }
    });
}

const btnCreateOrg = document.getElementById('btnCreateOrg');
if (btnCreateOrg) {
    btnCreateOrg.addEventListener('click', async () => {
        const orgName = document.getElementById('orgNameInput').value.trim();
        if (!orgName) return;

        const code = sessionStorage.getItem('tempCode');
        const username = localStorage.getItem('username');
        const hwid = await ipcRenderer.invoke('get-hwid');

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'login_or_register',
                username, hwid, code, orgName
            })
        });

        const data = await response.json();
        if (data.success) {
            orgNameModal.style.display = 'none';
            localStorage.setItem('isActivated', 'true');
            iniciarDashboard(data);
        }
    });
}

function iniciarDashboard(data) {
    currentUserRole = data.role;
    currentOrg = data.org;
    localStorage.setItem('userRole', data.role);

    showScreen('dashboard');
    document.getElementById('statusText').innerText = `Rol: ${data.role}`;
    const orgName = currentOrg ? currentOrg.name : 'Sin Organización';
    document.getElementById('userInfoDisplay').innerText = `${localStorage.getItem('username')} | ${orgName}`;

    if (document.getElementById('orgNameDisplayFiles')) {
        document.getElementById('orgNameDisplayFiles').innerText = orgName;
    }

    const tabGestion = document.getElementById('tabGestion');
    const btnAddTask = document.getElementById('btnAddTask');
    const btnSuper = document.getElementById('btnSuperAdminOrgs');

    if (tabAdminApp) tabAdminApp.style.display = 'none';
    if (tabGestion) tabGestion.style.display = 'none';
    if (tabConceptos) tabConceptos.style.display = 'none';

    if (currentUserRole === 'ORG_ADMIN' || currentUserRole === 'TWOOSTUDIO') {
        if (tabGestion) tabGestion.style.display = 'inline-block';
        if (btnAddTask) btnAddTask.style.display = 'block';
        if (currentOrg && document.getElementById('inviteCodeDisplay')) {
            document.getElementById('inviteCodeDisplay').innerText = currentOrg.inviteCode;
            document.getElementById('orgNameDisplayAdmin').innerText = currentOrg.name;
        }
    }

    if (currentUserRole === 'TWOOSTUDIO') {
        if (btnSuper) {
            btnSuper.style.display = 'block';
            btnSuper.onclick = abrirPanelMaestroOrgs;
        }
        if (tabAdminApp) {
            tabAdminApp.style.display = 'inline-block';
        }
    }

    cargarDatosRemotos();
}

async function loadAdminMasterTab() {
    try {
        const hwid = await ipcRenderer.invoke('get-hwid');
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'admin_get_master_stats', hwid })
        });
        const data = await res.json();

        if (data.success) {
            cacheAdminUsers = data.users;
            cacheAdminLicenses = data.licenses;
            cacheAdminOrgs = data.orgs;

            document.getElementById('admin-total-users').innerText = data.stats.usersCount;
            document.getElementById('admin-total-orgs').innerText = data.stats.orgsCount;
            document.getElementById('admin-unused-licenses').innerText = data.stats.licensesCount;

            renderAdminUserTable(cacheAdminUsers);
            renderAdminLicenseTable(cacheAdminLicenses);
        }
    } catch (e) { console.error("Error cargando panel maestro", e); }
}

function renderAdminUserTable(usersList) {
    const orgOptions = cacheAdminOrgs.map(o => `<option value="${o._id}">${o.name}</option>`).join('');
    const tbody = document.getElementById('adminGlobalUsersBody');
    if (!tbody) return;

    tbody.innerHTML = usersList.map(u => {
        const currentOrgId = u.orgId ? (u.orgId._id || u.orgId) : "null";
        return `
        <tr>
            <td>
                <div class="user-cell">
                    <div class="user-avatar" style="background:gold; color:black;">${u.username ? u.username[0].toUpperCase() : '?'}</div>
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: 600;">${u.username}</span>
                        <small style="color: #555; cursor: pointer; font-size: 9px;" onclick="copyToClipboard('${u.hwid}', 'HWID Copiado')">ID: ${u.hwid ? u.hwid.substring(0,12) : '---'}...</small>
                    </div>
                </div>
            </td>
            <td><span class="role-badge ${u.role === 'TWOOSTUDIO' ? 'role-admin' : ''}">${u.role}</span></td>
            <td>
                <select class="task-input" style="margin:0; padding:5px; font-size:12px; width:160px; background:#111; color:white; border-radius:4px;" 
                        onchange="adminMoverUsuario('${u.hwid}', this.value)">
                    <option value="null" ${currentOrgId === "null" ? 'selected' : ''}>-- Sin Organización --</option>
                    ${orgOptions.replace(`value="${currentOrgId}"`, `value="${currentOrgId}" selected`)}
                </select>
            </td>
            <td style="text-align: right; padding-right:25px;">
                <div class="action-buttons">
                    <button class="btn-table btn-notify" onclick="copyToClipboard('${u.hwid}', 'HWID Copiado')" title="Copiar HWID">🔑</button>
                    <button class="btn-table btn-notify" onclick="notificarUsuario('${u.username}')" title="Notificar">📧</button>
                    <button class="btn-table btn-kick" onclick="adminBorrarUsuario('${u.hwid}', '${u.username}')" title="Borrar">🗑️</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function renderAdminLicenseTable(licList) {
    const tbody = document.getElementById('adminGlobalLicensesBody');
    if (!tbody) return;

    tbody.innerHTML = licList.map(l => {
        const btnText = l.isUsed ? 'Reactivar' : 'Desactivar';
        const btnColor = l.isUsed ? '#00ff41' : '#ffa500';
        const statusBadge = l.isUsed 
            ? '<span style="color:#666; background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:4px; font-size:10px;">USADA</span>' 
            : '<span style="color:#00ff41; background:rgba(0,255,65,0.1); padding:4px 8px; border-radius:4px; font-size:10px; font-weight:bold;">ACTIVA</span>';
        return `
            <tr>
                <td style="font-family: monospace; letter-spacing: 1px; color: gold; cursor:pointer;" onclick="copyToClipboard('${l.code}', 'Licencia Copiada')">${l.code}</td>
                <td style="font-size: 12px; color: #888;">${l.type}</td>
                <td>${statusBadge}</td>
                <td style="text-align: right; padding-right:25px;">
                    <div class="action-buttons">
                        <button class="btn-table" style="color: ${btnColor}; border-color: ${btnColor}44;" onclick="adminToggleLicencia('${l._id}', ${!l.isUsed})">${btnText}</button>
                        <button class="btn-table btn-kick" onclick="adminBorrarLicencia('${l._id}', '${l.code}')">🗑️</button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

const searchUsers = document.getElementById('searchAdminUsers');
if (searchUsers) {
    searchUsers.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = cacheAdminUsers.filter(u => u.username.toLowerCase().includes(term) || u.hwid.toLowerCase().includes(term));
        renderAdminUserTable(filtered);
    });
}

const searchLicenses = document.getElementById('searchAdminLicenses');
if (searchLicenses) {
    searchLicenses.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = cacheAdminLicenses.filter(l => l.code.toLowerCase().includes(term));
        renderAdminLicenseTable(filtered);
    });
}

window.enviarBroadcast = async function() {
    const broadcastInput = document.getElementById('broadcastInput');
    const btnEnviar = document.querySelector('button[onclick="enviarBroadcast()"]');
    const message = broadcastInput.value.trim();
    if (!message) return;

    if (btnEnviar) btnEnviar.innerText = "Enviando...";
    const hwid = await ipcRenderer.invoke('get-hwid');
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'admin_send_broadcast', hwid, message })
        });
        const data = await res.json();
        if (data.success) {
            copyToClipboard("", "Anuncio Global Emitido");
            broadcastInput.value = "";
        }
    } catch (e) { alert("Error de conexión."); }
    finally { if (btnEnviar) btnEnviar.innerText = "Enviar"; }
};

window.copyToClipboard = (text, msg) => {
    if(text) navigator.clipboard.writeText(text);
    const toast = document.createElement('div');
    toast.innerText = msg;
    toast.style = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:var(--accent); color:black; padding:10px 20px; border-radius:8px; font-weight:bold; z-index:999999; box-shadow: 0 0 20px rgba(0,0,0,0.5);";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
};

window.adminToggleLicencia = async (licenseId, newState) => {
    const hwid = await ipcRenderer.invoke('get-hwid');
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'admin_toggle_license', hwid, licenseId, newState })
        });
        const data = await res.json();
        if (data.success) loadAdminMasterTab();
    } catch (e) { alert("Error"); }
};

window.adminMoverUsuario = async (targetHwid, newOrgId) => {
    const hwid = await ipcRenderer.invoke('get-hwid');
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'admin_update_user_org', hwid, targetHwid, newOrgId })
        });
        const data = await res.json();
        if (data.success) {
            alert("Usuario reubicado.");
            loadAdminMasterTab();
        }
    } catch (e) { alert("Error"); }
};

window.adminBorrarUsuario = async (targetHwid, name) => {
    if(!confirm(`¿Borrar permanentemente al usuario ${name}?`)) return;
    try {
        const hwid = await ipcRenderer.invoke('get-hwid');
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'admin_delete_user', hwid, targetHwid })
        });
        const data = await res.json();
        if(data.success) loadAdminMasterTab();
    } catch(e) { alert("Error"); }
};

window.adminBorrarLicencia = async (id, code) => {
    if(!confirm(`¿Borrar la licencia ${code}?`)) return;
    try {
        const hwid = await ipcRenderer.invoke('get-hwid');
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'admin_delete_license', hwid, licenseId: id })
        });
        const data = await res.json();
        if(data.success) loadAdminMasterTab();
    } catch(e) { alert("Error"); }
};

window.generarLicenciaMaster = async function() {
    const typeSelect = document.getElementById('newLicenseType');
    if (!typeSelect) return;
    const type = typeSelect.value;
    const hwid = await ipcRenderer.invoke('get-hwid');
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'admin_generate_license', hwid, type })
        });
        const data = await res.json();
        if (data.success) {
            copyToClipboard(data.code, "Licencia Generada y Copiada");
            loadAdminMasterTab(); 
        }
    } catch (e) { alert("Error"); }
};

window.toggleTrash = (isTrash) => {
    viendoPapelera = isTrash;
    const btnArchivos = document.getElementById('btnVerArchivos');
    const btnPapelera = document.getElementById('btnVerPapelera');
    if (btnArchivos) btnArchivos.classList.toggle('active', !isTrash);
    if (btnPapelera) btnPapelera.classList.toggle('active', isTrash);
    cargarDatosRemotos();
};

window.restaurarArchivo = async (fileId) => {
    const hwid = await ipcRenderer.invoke('get-hwid');
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'restore_file', hwid, fileId })
        });
        const data = await res.json();
        if (data.success) cargarDatosRemotos();
    } catch (e) { alert("Error al restaurar"); }
};

window.liberarArchivoActual = async () => {
    if (!currentCloudFileId) return;
    const hwid = await ipcRenderer.invoke('get-hwid');
    await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock_file', hwid, fileId: currentCloudFileId })
    });
    currentCloudFileId = null;
    if(editor) editor.contentEditable = "true";
    const btnS = document.getElementById('btnSaveDirect');
    if(btnS) btnS.style.display = "block";
    if(btnSaveCloud) btnSaveCloud.style.display = "none";
};

window.switchTab = function (tabName) {
    if (tabName !== 'editor') window.liberarArchivoActual();

    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    const tabBtns = document.querySelectorAll('.tab-btn');
    
    if (tabName === 'adminapp') {
        if (tabAdminApp) tabAdminApp.classList.add('active');
        if (adminContainer) adminContainer.style.display = 'block';
        loadAdminMasterTab();
    } else if (tabName === 'editor') {
        if (tabBtns[0]) tabBtns[0].classList.add('active');
        const cont = document.getElementById('editor-container');
        if (cont) cont.style.display = 'block';
    } else if (tabName === 'files') {
        if (tabBtns[1]) tabBtns[1].classList.add('active');
        const cont = document.getElementById('files-container');
        if (cont) cont.style.display = 'block';
    } else if (tabName === 'tasks') {
        if (tabBtns[2]) tabBtns[2].classList.add('active');
        const cont = document.getElementById('tasks-container');
        if (cont) cont.style.display = 'block';
    } else if (tabName === 'conceptos') {
        if (tabConceptos) tabConceptos.classList.add('active');
        if (conceptosContainer) conceptosContainer.style.display = 'block';
    } else if (tabName === 'gestion') {
        const tabG = document.getElementById('tabGestion');
        if (tabG) tabG.classList.add('active');
        const cont = document.getElementById('gestion-container');
        if (cont) cont.style.display = 'block';
        cargarDatosRemotos();
    }
}

async function cargarDatosRemotos() {
    try {
        const hwid = await ipcRenderer.invoke('get-hwid');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_dashboard', hwid })
        });
        const data = await response.json();
        
        if(data.role === 'TWOOSTUDIO' && tabAdminApp) tabAdminApp.style.display = 'inline-block';

        if (data.canViewConcepts || data.role === 'ORG_ADMIN' || data.role === 'TWOOSTUDIO') {
            if (tabConceptos) tabConceptos.style.display = 'inline-block';
        } else {
            if (tabConceptos) tabConceptos.style.display = 'none';
            if (conceptosContainer && conceptosContainer.style.display === 'block') {
                switchTab('editor');
            }
        }

        if (data.org) {
            currentOrg = data.org; 
            if (currentOrg.tasks) renderKanban(currentOrg.tasks);
            if (currentOrg.files) renderCloudFiles(currentOrg.files);
            if (currentOrg.conceptos) renderConceptos(currentOrg.conceptos);
        }
        if (data.users) renderUsersTable(data.users);
    } catch (e) { }
}

const btnRefreshTasks = document.getElementById('btnRefreshTasks');
if (btnRefreshTasks) {
    btnRefreshTasks.addEventListener('click', async () => {
        btnRefreshTasks.innerText = "⌛";
        await cargarDatosRemotos();
        btnRefreshTasks.innerText = "🔄";
    });
}

if (btnUploadFile) {
    btnUploadFile.addEventListener('click', () => {
        if (!currentOrg) {
            alert("Necesitas pertenecer a una organización.");
            return;
        }
        if (fileUploadInput) fileUploadInput.click();
    });
}

if (fileUploadInput) {
    fileUploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target.result;
            if (btnUploadFile) {
                btnUploadFile.innerText = "Subiendo...";
                btnUploadFile.disabled = true;
            }
            try {
                const hwid = await ipcRenderer.invoke('get-hwid');
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'upload_file', hwid, fileName: file.name, content: content })
                });
                const data = await response.json();
                if (data.success) {
                    renderCloudFiles(data.files);
                    cargarDatosRemotos();
                } else {
                    alert("Error: " + data.error);
                }
            } catch (err) { alert("Error de conexión"); }
            finally {
                if (btnUploadFile) {
                    btnUploadFile.innerHTML = '☁️ Subir Archivo';
                    btnUploadFile.disabled = false;
                }
                fileUploadInput.value = "";
            }
        };
        reader.readAsText(file);
    });
}

if (conceptUploadInput) {
    conceptUploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Image = event.target.result;
            if (btnUploadConcept) {
                btnUploadConcept.innerText = "Subiendo...";
                btnUploadConcept.disabled = true;
            }
            try {
                const hwid = await ipcRenderer.invoke('get-hwid');
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'upload_concept', hwid, fileName: file.name, content: base64Image })
                });
                const data = await response.json();
                if (data.success) {
                    copyToClipboard(null, "🖼️ Concepto subido correctamente");
                    cargarDatosRemotos();
                } else {
                    alert("Error al subir concepto: " + (data.error || "Desconocido"));
                }
            } catch (err) { alert("Error de conexión al subir la imagen"); }
            finally {
                if (btnUploadConcept) {
                    btnUploadConcept.innerHTML = '<span style="font-size: 18px; margin-right: 8px;">🖼️</span> Subir Captura';
                    btnUploadConcept.disabled = false;
                }
                conceptUploadInput.value = "";
            }
        };
        reader.readAsDataURL(file);
    });
}

window.abrirImagenModal = (src) => {
    const modal = document.createElement('div');
    modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:999999; display:flex; justify-content:center; align-items:center; cursor:zoom-out; backdrop-filter: blur(5px); transition: opacity 0.2s;";
    modal.onclick = () => modal.remove();
    const img = document.createElement('img');
    img.src = src;
    img.style = "max-width:90%; max-height:90%; border-radius:10px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); object-fit:contain;";
    modal.appendChild(img);
    document.body.appendChild(modal);
};

function renderConceptos(conceptos) {
    if (!conceptsGrid) return;
    conceptsGrid.innerHTML = "";

    if (!conceptos || conceptos.length === 0) {
        conceptsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #555; padding: 40px;">Aún no se han subido conceptos o diseños.</div>`;
        return;
    }

    conceptos.forEach(c => {
        const card = document.createElement('div');
        card.className = 'concept-card';
        
        const btnBorrarHtml = (currentUserRole === 'ORG_ADMIN' || currentUserRole === 'TWOOSTUDIO') 
            ? `<button class="btn-table btn-kick" style="width: 100%; margin-top: 8px; font-size: 11px; height: auto; padding: 4px;" onclick="eliminarConcepto('${c._id}')">Eliminar</button>` 
            : '';

        card.innerHTML = `
            <img src="${c.url || c.content}" alt="Concepto" style="cursor: zoom-in;" onclick="abrirImagenModal(this.src)">
            <div class="concept-info">
                <div class="concept-title" title="${c.name}">${c.name}</div>
                ${btnBorrarHtml}
            </div>
        `;
        conceptsGrid.appendChild(card);
    });
}

window.eliminarConcepto = async (conceptoId) => {
    if (!confirm("¿Seguro que deseas eliminar este diseño permanentemente?")) return;
    try {
        const hwid = await ipcRenderer.invoke('get-hwid');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_concept', hwid, conceptId: conceptoId })
        });
        const data = await response.json();
        if (data.success) cargarDatosRemotos();
    } catch (e) { alert("Error al eliminar concepto."); }
};


function renderCloudFiles(files) {
    if (!cloudFileList) return;
    cloudFileList.innerHTML = "";
    
    const filtered = files.filter(f => viendoPapelera ? f.isDeleted : !f.isDeleted);

    if (filtered.length === 0) {
        cloudFileList.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #555; padding: 40px;">${viendoPapelera ? 'La papelera está vacía' : 'No hay archivos activos'}</div>`;
        return;
    }

    filtered.forEach(file => {
        const card = document.createElement('div');
        card.className = 'file-card';
        const icon = file.name.endsWith('.twoo') ? '⚡' : '📄';
        const dateSubido = new Date(file.date).toLocaleDateString();
        
        const deleteAction = viendoPapelera 
            ? `deleteCloudFile('${file._id}', '${file.name}', true)` 
            : `deleteCloudFile('${file._id}', '${file.name}', false)`;
        
        const restoreBtn = viendoPapelera 
            ? `<button class="file-delete-btn" style="right: 40px; background: rgba(0, 255, 65, 0.1); color: var(--accent);" onclick="event.stopPropagation(); restaurarArchivo('${file._id}')">↺</button>`
            : '';
        
        const lockIcon = file.lockedBy ? `<span style="position:absolute; top:5px; left:5px; font-size:10px;">🔒 ${file.lockedBy}</span>` : '';

        card.innerHTML = `
            ${lockIcon}
            ${restoreBtn}
            <button class="file-delete-btn" onclick="event.stopPropagation(); ${deleteAction}">${viendoPapelera ? '🗑️' : '×'}</button>
            <div class="file-icon" onclick="${viendoPapelera ? '' : `abrirArchivoNube('${file._id}')`}">${icon}</div>
            <div class="file-name" onclick="${viendoPapelera ? '' : `abrirArchivoNube('${file._id}')`}">${file.name}</div>
            <div class="file-meta">${viendoPapelera ? 'Eliminado el: ' + new Date(file.deletedAt).toLocaleDateString() : 'Subido: ' + dateSubido}</div>
        `;
        cloudFileList.appendChild(card);
    });
}

window.deleteCloudFile = async (fileId, fileName, permanent) => {
    const msg = permanent ? `¿BORRAR PERMANENTEMENTE "${fileName}"? No hay vuelta atrás.` : `¿Mover "${fileName}" a la papelera?`;
    if (!confirm(msg)) return;
    try {
        const hwid = await ipcRenderer.invoke('get-hwid');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_file', hwid, fileId, permanent })
        });
        const data = await response.json();
        if (data.success) cargarDatosRemotos();
    } catch (e) { alert("Error"); }
};

async function abrirArchivoNube(fileId) {
    try {
        const hwid = await ipcRenderer.invoke('get-hwid');
        document.body.style.cursor = 'wait';

        const lockRes = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'lock_file', hwid, fileId })
        });
        const lockData = await lockRes.json();

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_file_content', hwid, fileId })
        });
        const data = await response.json();

        if (data.success) {
            switchTab('editor');
            currentCloudFileId = fileId;
            
            const modoActual = viewModeSelector ? viewModeSelector.value : 'doc';
            
            if (modoActual === 'code') {
                editor.innerText = data.content;
                aplicarResaltado();
            } else {
                editor.innerHTML = data.content;
            }

            if (!lockData.success && lockData.lockedBy) {
                alert(`⚠️ ARCHIVO BLOQUEADO por ${lockData.lockedBy}. Solo lectura.`);
                editor.contentEditable = "false";
                document.getElementById('btnSaveDirect').style.display = "none";
                appTitle.innerText = `[BLOQUEADO] ${data.name} (Nube)`;
            } else {
                editor.contentEditable = "true";
                document.getElementById('btnSaveDirect').style.display = "block";
                appTitle.innerText = `Twoo Projects - ${data.name} (Nube)`;
            }
            
            actualizarEstadoToolbar();
        }
    } catch (e) { 
        console.error(e);
        alert("Error de red al abrir archivo"); 
    }
    finally { document.body.style.cursor = 'default'; }
}

function renderKanban(tasks) {
    const cols = { 
        pending: document.getElementById('col-pending'), 
        progress: document.getElementById('col-progress'), 
        done: document.getElementById('col-done') 
    };
    
    if(!cols.pending) return;
    Object.values(cols).forEach(c => { if (c) c.innerHTML = ''; });

    tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = 'task-card';
        
        div.draggable = true;
        div.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', task._id);
            setTimeout(() => div.style.opacity = '0.4', 0); 
        });
        div.addEventListener('dragend', (e) => {
            div.style.opacity = '1'; 
        });
        
        const asignadosHTML = (task.assignedTo && task.assignedTo.length > 0) 
            ? task.assignedTo.map(u => `<span class="user-tag">${u}</span>`).join('')
            : '';

        let moveButtons = '';
        
        if (task.status === 'pending') {
            moveButtons = `
                <button class="task-action-btn" title="Empezar" onclick="moveTask('${task._id}', 'progress')">▶</button>
            `;
        } else if (task.status === 'progress') {
            moveButtons = `
                <button class="task-action-btn" title="Devolver a Pendiente" onclick="moveTask('${task._id}', 'pending')">◀</button>
                <button class="task-action-btn" title="Finalizar" style="color:var(--accent); border-color:var(--accent);" onclick="moveTask('${task._id}', 'done')">✔</button>
            `;
        } else if (task.status === 'done') {
            moveButtons = `
                <button class="task-action-btn" title="Reabrir" onclick="moveTask('${task._id}', 'progress')">◀</button>
            `;
        }

        div.innerHTML = `
            <button class="btn-delete-absolute" onclick="deleteTask('${task._id}')" title="Eliminar tarea">✕</button>

            <div class="task-header-title" style="cursor: grab;">${task.title}</div>

            <div class="task-body-desc" title="${task.description || ''}">
                ${task.description || '<em style="opacity:0.5">Sin descripción</em>'}
            </div>

            <div class="task-tags">${asignadosHTML}</div>

            <div class="task-footer">
                ${moveButtons}
            </div>
        `;
        
        if (cols[task.status]) cols[task.status].appendChild(div);
    });
}

window.deleteTask = async (taskId) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta tarea permanentemente?")) return;

    const hwid = await ipcRenderer.invoke('get-hwid');
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_task', hwid, taskId })
        });
        const data = await response.json();
        
        if (data.success) {
            cargarDatosRemotos();
        } else {
            alert("Error al borrar: " + (data.error || "Desconocido"));
        }
    } catch (e) {
        alert("Error de conexión al intentar borrar la tarea.");
    }
};

window.moveTask = async (taskId, newStatus) => {
    if (currentOrg && currentOrg.tasks) {
        const taskIndex = currentOrg.tasks.findIndex(t => t._id.toString() === taskId);
        if (taskIndex !== -1 && currentOrg.tasks[taskIndex].status !== newStatus) {
            currentOrg.tasks[taskIndex].status = newStatus;
            renderKanban(currentOrg.tasks); 
        }
    }

    const hwid = await ipcRenderer.invoke('get-hwid');
    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_task', hwid, taskId, newStatus })
    }).catch(err => {
        console.error("Error moviendo tarea en la DB", err);
        cargarDatosRemotos();
    });
}

window.abrirMuroComentarios = async (taskId) => {
    const text = prompt("Escribe tu comentario (Solo usuarios asignados):");
    if (!text) return;

    const hwid = await ipcRenderer.invoke('get-hwid');
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'add_task_comment', hwid, taskId, message: text })
        });
        const data = await res.json();
        if (data.success) {
            copyToClipboard(null, "Comentario añadido");
            cargarDatosRemotos();
        } else {
            alert(data.error);
        }
    } catch (e) { alert("Error de conexión"); }
};

if (btnConfirmTask) {
    btnConfirmTask.onclick = async () => {
        const title = document.getElementById('taskTitleInput').value.trim();
        const description = document.getElementById('taskDescInput').value.trim();
        const assignedStr = document.getElementById('taskAssignedInput').value.trim();
        
        if (!title) return;

        btnConfirmTask.innerText = "...";
        btnConfirmTask.disabled = true;

        const assignedTo = assignedStr.split(',').map(u => u.trim()).filter(u => u !== "");
        const hwid = await ipcRenderer.invoke('get-hwid');

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'create_task', 
                    hwid, title, description, assignedTo 
                })
            });
            const data = await response.json();
            if (data.success) { 
                taskModal.style.display = 'none'; 
                cargarDatosRemotos(); 
            }
        } catch (e) { alert("Error"); }
        finally { 
            btnConfirmTask.innerText = "Crear Tarea"; 
            btnConfirmTask.disabled = false; 
        }
    };
}

if (btnAddTask) {
    btnAddTask.onclick = () => {
        taskModal.style.display = 'flex';
        document.getElementById('taskTitleInput').value = '';
        document.getElementById('taskDescInput').value = '';
        document.getElementById('taskAssignedInput').value = '';
        document.getElementById('taskTitleInput').focus();
    };
}

if (btnCancelTask) {
    btnCancelTask.onclick = () => { taskModal.style.display = 'none'; };
}

window.togglePermisoConceptos = async (targetHwid, newValue) => {
    try {
        const hwid = await ipcRenderer.invoke('get-hwid');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'toggle_concept_permission', 
                hwid: hwid, 
                targetHwid: targetHwid, 
                canView: newValue 
            })
        });
        const data = await response.json();
        if (data.success) {
            copyToClipboard(null, "Permiso de Conceptos Actualizado");
        } else {
            alert("Error al cambiar permisos");
            cargarDatosRemotos();
        }
    } catch (e) {
        alert("Error de conexión.");
        cargarDatosRemotos();
    }
};

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    const totalUsersEl = document.getElementById('stat-total-users');
    const onlineUsersEl = document.getElementById('stat-online-users');
    const totalFilesEl = document.getElementById('stat-total-files');
    if (!tbody) return;
    tbody.innerHTML = '';
    let onlineCount = 0;
    if (totalUsersEl) totalUsersEl.innerText = users.length;
    
    users.forEach(u => {
        if (u.isOnline) onlineCount++;
        const roleClass = (u.role === 'ORG_ADMIN' || u.role === 'TWOOSTUDIO') ? 'role-admin' : '';
        const initial = u.username ? u.username.charAt(0).toUpperCase() : '?';
        const isSelf = u.username === localStorage.getItem('username');
        
        let conceptColHtml = '';
        const isAdminLogged = (currentUserRole === 'ORG_ADMIN' || currentUserRole === 'TWOOSTUDIO');
        
        if (isAdminLogged && !isSelf && u.role !== 'TWOOSTUDIO') {
            conceptColHtml = `<input type="checkbox" class="checkbox-conceptos" onchange="togglePermisoConceptos('${u.hwid}', this.checked)" ${u.canViewConcepts ? 'checked' : ''}>`;
        } else {
            conceptColHtml = `<span style="color: ${u.canViewConcepts ? '#00ff41' : '#ff4b4b'};">${u.canViewConcepts ? '✅' : '❌'}</span>`;
        }

        tbody.innerHTML += `
            <tr>
                <td><div class="user-cell"><div class="user-avatar">${initial}</div><span style="font-weight: 600;">${u.username}</span></div></td>
                <td><span class="role-badge ${roleClass}">${u.role}</span></td>
                <td><span class="${u.isOnline ? 'badge-online' : 'badge-offline'}">${u.isOnline ? '● Online' : '○ Offline'}</span></td>
                <td style="text-align: center; vertical-align: middle;">${conceptColHtml}</td>
                <td><div class="action-buttons"><button class="btn-table btn-notify" onclick="notificarUsuario('${u.username}')">Notificar</button>${!isSelf ? `<button class="btn-table btn-kick" onclick="kickUser('${u.username}')">Kick</button>` : ''}</div></td>
            </tr>
        `;
    });
    
    if (onlineUsersEl) onlineUsersEl.innerText = onlineCount;
    if (totalFilesEl && currentOrg && currentOrg.files) totalFilesEl.innerText = currentOrg.files.length;
}

window.kickUser = async (targetUsername) => {
    if (!confirm(`¿Expulsar a ${targetUsername}?`)) return;
    try {
        const hwid = await ipcRenderer.invoke('get-hwid');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'kick_user', hwid, targetUser: targetUsername })
        });
        const data = await response.json();
        if (data.success) cargarDatosRemotos();
    } catch (e) { alert("Error"); }
};

if (viewModeSelector) {
    viewModeSelector.addEventListener('change', (e) => cambiarVisualizacion(e.target.value));
}

function cambiarVisualizacion(modo) {
    if (!editor) return;
    editor.classList.remove('view-doc', 'view-note', 'view-code');
    editor.classList.add(`view-${modo}`);
    const currentText = editor.innerText;
    if (modo === 'code') aplicarResaltado();
    else { editor.innerHTML = ""; editor.innerText = currentText; }
    actualizarEstadoToolbar();
    localStorage.setItem('preferedViewMode', modo);
}

function aplicarResaltado() {
    if (!editor) return;
    const codeContent = editor.innerText;
    if (typeof hljs !== 'undefined') {
        const highlighted = hljs.highlightAuto(codeContent).value;
        editor.innerHTML = `<pre><code class="hljs" contenteditable="true">${highlighted}</code></pre>`;
    }
}

function actualizarEstadoToolbar() {
    const modo = viewModeSelector ? viewModeSelector.value : 'doc';
    const esModoDoc = modo === 'doc';
    formatButtons.forEach(btn => {
        if (esModoDoc) { btn.style.opacity = "1"; btn.style.pointerEvents = "auto"; }
        else { btn.style.opacity = "0.3"; btn.style.pointerEvents = "none"; }
    });
}

window.format = function (command, value = null) {
    if ((viewModeSelector ? viewModeSelector.value : 'doc') === 'doc') {
        document.execCommand(command, false, value);
        editor.focus();
    }
}

window.guardarEnNube = async function() {
    if (!currentCloudFileId) { alert("Este archivo no pertenece a la nube."); return; }
    const contenido = (viewModeSelector.value === 'code') ? editor.innerText : editor.innerHTML;
    const hwid = await ipcRenderer.invoke('get-hwid');
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'upload_file', hwid, content: contenido, fileId: currentCloudFileId })
        });
        const data = await response.json();
        if (data.success) {
            copyToClipboard(null, "☁️ Sincronizado con la Nube");
            renderCloudFiles(data.files);
        }
    } catch (err) { alert("Error de conexión"); }
};

async function guardar() {
    if (!editor) return;
    const contenido = (viewModeSelector.value === 'code') ? editor.innerText : editor.innerHTML;
    if (currentCloudFileId) { window.guardarEnNube(); return; }
    if (currentFilePath) ipcRenderer.send('save-direct', contenido, currentFilePath);
    else ipcRenderer.send('save-file', contenido);
}

document.getElementById('btnSaveDirect').onclick = guardar;
document.getElementById('btnSaveAs').onclick = () => {
    const contenido = (viewModeSelector.value === 'code' ? editor.innerText : editor.innerHTML);
    ipcRenderer.send('save-file', contenido);
    currentCloudFileId = null;
};

window.addEventListener('keydown', (e) => {
    if (localStorage.getItem('isActivated') === 'true' && e.ctrlKey && e.key.toLowerCase() === 's') { 
        e.preventDefault(); 
        guardar(); 
    }
});

ipcRenderer.on('file-data', (ev, data, path) => {
    currentCloudFileId = null;
    currentFilePath = path;
    showScreen('dashboard');
    switchTab('editor');
    const name = path.split('\\').pop();
    const ext = path.split('.').pop().toLowerCase();
    let modo = localStorage.getItem('preferedViewMode') || 'doc';
    if (['js', 'py', 'html', 'css', 'cpp', 'twoo'].includes(ext)) modo = 'code';
    if (viewModeSelector) viewModeSelector.value = modo;
    if (modo === 'code') editor.innerText = data;
    else editor.innerHTML = data;
    cambiarVisualizacion(modo);
    appTitle.innerText = `Twoo Projects - ${name}`;
    if(btnSaveCloud) btnSaveCloud.style.display = "none";
});

document.getElementById('btnSettings').onclick = () => showScreen('settings');
document.getElementById('btnBackSettings').onclick = () => showScreen('dashboard');

if (btnRemoveLicense) {
    btnRemoveLicense.onclick = () => {
        if (confirm("¿Cerrar sesión?")) {
            window.liberarArchivoActual();
            localStorage.clear();
            location.reload();
        }
    };
}

function aplicarColor(color) {
    document.documentElement.style.setProperty('--accent', color);
    const r = parseInt(color.slice(1, 3), 16), g = parseInt(color.slice(3, 5), 16), b = parseInt(color.slice(5, 7), 16);
    document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
    if (hexInput) hexInput.value = color;
    localStorage.setItem('customColor', color);
}

document.getElementById('btnApplyColor').onclick = () => {
    if (/^#[0-9A-F]{6}$/i.test(hexInput.value)) aplicarColor(hexInput.value);
};

if (btnCheckUpdates) {
    btnCheckUpdates.onclick = () => {
        copyToClipboard(null, "🔍 Buscando actualizaciones...");
        btnCheckUpdates.innerText = "Buscando...";
        btnCheckUpdates.disabled = true;
        ipcRenderer.send('check_for_updates');
    };
}

ipcRenderer.on('update_not_available', () => {
    copyToClipboard(null, "✨ Ya tienes la última versión");
    
    if (btnCheckUpdates) {
        btnCheckUpdates.innerText = "Buscar Actualización";
        btnCheckUpdates.disabled = false;
    }
});

ipcRenderer.on('update_available', (event, version) => {
    if (confirm(`Nueva versión disponible: ${version}. ¿Deseas descargarla ahora?`)) {
        ipcRenderer.send('download_update');
        copyToClipboard(null, "⏬ Descargando actualización...");
        if (updateStatusText) updateStatusText.innerText = "Descargando versión " + version + "...";
    } else {
        if (btnCheckUpdates) {
            btnCheckUpdates.innerText = "Buscar Actualización";
            btnCheckUpdates.disabled = false;
        }
    }
});

ipcRenderer.on('update_downloaded', () => {
    copyToClipboard(null, "✅ Descarga completada");
    
    setTimeout(() => {
        if (confirm('La actualización está lista. La app se reiniciará para aplicar los cambios.')) {
            ipcRenderer.send('restart_app');
        }
    }, 1000);
});

ipcRenderer.on('update_error', (event, message) => {
    copyToClipboard(null, "❌ Error al buscar actualización");
    console.error(message);
    if (btnCheckUpdates) {
        btnCheckUpdates.innerText = "Buscar Actualización";
        btnCheckUpdates.disabled = false;
    }
});

window.auditarOrganizacion = async (orgId) => {
    const hwid = await ipcRenderer.invoke('get-hwid');
    copyToClipboard(null, "📂 Cargando archivos de la organización...");
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'admin_get_org_files', hwid, targetOrgId: orgId })
        });
        const data = await res.json();
        if (data.success) {
            renderAuditoriaFiles(data.files, data.orgName);
        } else {
            alert("Error: " + data.error);
        }
    } catch (e) {
        alert("Error de conexión al auditar.");
    }
};

function renderAuditoriaFiles(files, orgName) {
    const existingModal = document.getElementById('audit-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = "audit-modal";
    modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:100000; display:flex; flex-direction:column; padding:50px; overflow-y:auto; backdrop-filter:blur(10px);";
    
    let filesHTML = files.map(f => `
        <div style="background:#111; border:1px solid #222; padding:15px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div>
                <strong style="color:${f.isDeleted ? '#ff4b4b' : 'var(--accent)'}; font-size:16px;">${f.name}</strong>
                <br><small style="color:#666">Subido por: ${f.uploadedBy} | ${f.isDeleted ? '🗑️ PAPELERA' : '✅ ACTIVO'}</small>
            </div>
            <div class="action-buttons">
                <button class="btn-table" onclick="copyToClipboard(null, 'Ver consola (Ctrl+Shift+I)'); console.log('CONTENIDO DE ${f.name}:', \`${f.content}\`)">📄 Contenido</button>
            </div>
        </div>
    `).join('');

    modal.innerHTML = `
        <div style="max-width:900px; margin:0 auto; width:100%;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; border-bottom: 1px solid #333; padding-bottom:20px;">
                <div>
                    <h2 style="color:gold; margin:0;">Inspección Cloud: ${orgName}</h2>
                    <p style="color:#555; margin:5px 0 0 0;">Visualizando todos los archivos del equipo.</p>
                </div>
                <button class="action-btn" style="background:#333; color:white;" onclick="document.getElementById('audit-modal').remove()">Cerrar Auditoría</button>
            </div>
            ${files.length === 0 ? '<p style="color:#444; text-align:center; padding:50px;">Esta organización no tiene archivos subidos.</p>' : filesHTML}
        </div>
    `;
    document.body.appendChild(modal);
}

async function abrirPanelMaestroOrgs() {
    try {
        const hwid = await ipcRenderer.invoke('get-hwid');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'admin_get_master_stats', hwid })
        });
        const data = await response.json();
        if (data.success) {
            const modal = document.getElementById('admin-orgs-modal');
            const list = document.getElementById('admin-org-list');
            if (modal) modal.style.display = 'flex';
            if (list) {
                list.innerHTML = data.orgs.map(org => `
                    <div style="background:#111; padding:15px; border-radius:8px; border:1px solid #222; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <strong style="color:var(--accent); font-size:16px;">${org.name}</strong><br>
                            <small style="color:#444;">ID: ${org._id}</small>
                        </div>
                        <div class="action-buttons">
                            <button class="btn-table" onclick="auditarOrganizacion('${org._id}')" style="background:#007bff; color:white; border:none;">📂 Auditar</button>
                            <button class="btn-table" onclick="adminJoinOrg('${org._id}')" style="background:white; color:black;">Unirse</button>
                            <button class="btn-table btn-kick" onclick="adminDeleteOrg('${org._id}', '${org.name}')">Borrar</button>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (e) { alert("Error al cargar organizaciones globales."); }
}