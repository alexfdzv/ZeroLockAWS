// ==========================================
// CONFIGURACIÓN
// ==========================================
const API_URL = 'http://localhost:3000';

// Cache de datos
let cardsCache = [];
let passwordsCache = [];

// Variables de autenticación
let currentToken = null;
let currentUserId = null;

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Passwords_Controller cargado');

    // OBTENER TOKEN Y USER_ID DEL localStorage
    currentToken = localStorage.getItem('token');
    currentUserId = localStorage.getItem('user_id');

    // Validar que existan token y user_id
    if (!currentToken || !currentUserId) {
        console.error('❌ No hay sesión activa. Redirigiendo al login...');
        window.location.href = './Login.html';
        return;
    }

    console.log('🔑 Token encontrado:', currentToken.substring(0, 20) + '...');
    console.log('👤 User ID:', currentUserId);

    // Cargar datos
    loadCards();
    loadPasswords();

    // Configurar formularios
    setupAddCardForm();
    setupAddPasswordForm();

    // Configurar búsqueda
    setupSearch();
});

// ==========================================
// FUNCIÓN AUXILIAR PARA HEADERS CON TOKEN
// ==========================================
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
    };
}

// ==========================================
// FUNCIONES DE TARJETAS
// ==========================================

// Cargar todas las tarjetas
async function loadCards() {
    const container = document.getElementById('cardsContainer');
    if (!container) {
        console.error('❌ No se encontró #cardsContainer');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/passwords/cards?user_id=${currentUserId}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.error('❌ Token inválido o expirado');
                localStorage.removeItem('token');
                localStorage.removeItem('user_id');
                window.location.href = './Login.html';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const cards = await response.json();
        console.log("Cards recibidas en front cifradas")
        console.log(cards[0])
        // //Descifrado
        for (let card of cards) {
            card.cvv = await decryptData(card.cvv);
            card.nombreTarjeta = await decryptData(card.nombreTarjeta);
            card.numeroTarjeta =  await decryptData(card.numeroTarjeta);
            card.titular = await decryptData(card.titular);
            card.vencimiento = await decryptData(card.vencimiento);
        }
        console.log("Cards recibidas POST DESCIFRADO")
        console.log(cards[0])
        //Descifrado
        cardsCache = cards;

        renderCards(cards);
        updateBadge('cardsBadge', cards.length);

    } catch (err) {
        console.error('❌ Error al cargar tarjetas:', err);
        showNotification('Error al cargar las tarjetas', 'error');

        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444; opacity: 0.5;"></i>
                <p class="mt-3" style="color: #ef4444;">Error al conectar con el servidor</p>
                <p style="color: #9ca3af; font-size: 0.9rem;">Verifica que el backend esté corriendo en ${API_URL}</p>
            </div>
        `;
    }
}

// Renderizar tarjetas en el DOM
function renderCards(cards) {
    const container = document.getElementById('cardsContainer');
    container.innerHTML = '';

    if (cards.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-credit-card" style="font-size: 4rem; color: #8b5cf6; opacity: 0.3;"></i>
                <p class="mt-3" style="color: #9ca3af;">No tienes tarjetas guardadas</p>
                <p style="color: #6b7280; font-size: 0.9rem;">Usa el botón flotante morado para agregar una</p>
            </div>
        `;
        return;
    }

    cards.forEach(card => {
        const ultimos4 = card.numeroTarjeta ? card.numeroTarjeta.slice(-4) : '****';
        const id = card._id || card.id;

        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 col-xl-3';

        col.innerHTML = `
            <div class="card-item">
                <div class="card-bank-name">${escapeHtml(card.nombreTarjeta)}</div>
                <div class="card-info">
                    <div class="card-info-item">
                        <span>Titular:</span>
                        <strong>${escapeHtml(card.titular)}</strong>
                    </div>
                    <div class="card-info-item">
                        <span>Últimos 4:</span>
                        <strong>${ultimos4}</strong>
                    </div>
                    <div class="card-info-item">
                        <span>Vencimiento:</span>
                        <strong>${escapeHtml(card.vencimiento || '')}</strong>
                    </div>
                    <div class="card-info-item">
                        <span>CVV:</span>
                        <strong>${escapeHtml(card.cvv || '')}</strong>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn-action btn-copy-card" onclick="copyToClipboard('${card.numeroTarjeta}', 'Número de tarjeta')">
                        <i class="fas fa-copy me-1"></i><br>Copiar
                    </button>
                    <button class="btn-action btn-edit" onclick="openEditCardModal('${id}')">
                        <i class="fas fa-edit me-1"></i><br>Editar
                    </button>
                    <button class="btn-action btn-delete" onclick="openDeleteCardModal('${id}', '${escapeHtml(card.nombreTarjeta)}')">
                        <i class="fas fa-trash me-1"></i><br>Eliminar
                    </button>
                </div>
            </div>
        `;

        container.appendChild(col);
    });
}

// Configurar formulario de agregar tarjeta
function setupAddCardForm() {
    const form = document.getElementById('addCardForm');
    if (!form) {
        console.warn('⚠️ No se encontró #addCardForm');
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nombreTarjetaValue = document.getElementById('addCardName').value.trim();
        console.log("nombreTarjeta:", nombreTarjetaValue);

        const titularValue = document.getElementById('addCardHolder').value.trim();
        console.log("titular:", titularValue);

        const numeroTarjetaValue = document.getElementById('addCardNumber').value.replace(/\s/g, '');
        console.log("numeroTarjeta:", numeroTarjetaValue);

        const vencimientoValue = document.getElementById('addCardExp').value.trim();
        console.log("vencimiento:", vencimientoValue);

        const cvvValue = document.getElementById('addCardCVV').value.trim();
        console.log("cvv:", cvvValue);

        const nuevaTarjeta = {
                nombreTarjeta: await encryptData(nombreTarjetaValue) ,
                titular: await encryptData(titularValue),
                numeroTarjeta: await encryptData(numeroTarjetaValue),
                vencimiento: await encryptData(vencimientoValue),
                cvv: await encryptData(cvvValue),
                user_id: currentUserId

            // nombreTarjeta: await encryptData(document.getElementById('addCardName').value.trim()) ,
            // titular: await encryptData(document.getElementById('addCardHolder').value.trim()) ,
            // numeroTarjeta: await encryptData(document.getElementById('addCardNumber').value.replace(/\s/g, '')),
            // vencimiento: await encryptData(document.getElementById('addCardExp').value.trim()) ,
            // cvv: await encryptData(document.getElementById('addCardCVV').value.trim()) ,
            // user_id: currentUserId 
        };

        try {
            const response = await fetch(`${API_URL}/passwords/cards`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(nuevaTarjeta)
            });

            if (!response.ok) {
                throw new Error('Error al crear tarjeta');
            }

            await loadCards();

            const modal = bootstrap.Modal.getInstance(document.getElementById('addCardModal'));
            if (modal) modal.hide();

            form.reset();
            showNotification('Tarjeta agregada correctamente');

        } catch (err) {
            console.error('❌ Error:', err);
            showNotification('Error al agregar la tarjeta', 'error');
        }
    });
}

// Abrir modal de editar tarjeta
function openEditCardModal(cardId) {
    const card = cardsCache.find(c => (c._id || c.id) === cardId);
    if (!card) {
        showNotification('Tarjeta no encontrada', 'error');
        return;
    }

    const modalHtml = `
        <div class="modal fade" id="dynamicEditCardModal" tabindex="-1">
            <div class="modal-dialog">
                <form class="modal-content" id="editCardForm">
                    <div class="modal-header">
                        <h5 class="modal-title">Editar Tarjeta</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Nombre de la tarjeta</label>
                            <input type="text" class="form-control" id="editCardName" value="${escapeHtml(card.nombreTarjeta)}" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Nombre del titular</label>
                            <input type="text" class="form-control" id="editCardHolder" value="${escapeHtml(card.titular)}" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Número de tarjeta</label>
                            <input type="text" class="form-control" id="editCardNumber" value="${card.numeroTarjeta}" required>
                        </div>
                        <div class="row">
                            <div class="col-6 mb-3">
                                <label class="form-label">Vencimiento</label>
                                <input type="text" class="form-control" id="editCardExp" value="${escapeHtml(card.vencimiento || '')}" placeholder="MM/AA">
                            </div>
                            <div class="col-6 mb-3">
                                <label class="form-label">CVV</label>
                                <input type="text" class="form-control" id="editCardCVV" value="${escapeHtml(card.cvv || '')}" maxlength="4">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const oldModal = document.getElementById('dynamicEditCardModal');
    if (oldModal) oldModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = new bootstrap.Modal(document.getElementById('dynamicEditCardModal'));
    modal.show();

    document.getElementById('editCardForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        // Variables individuales
        const nombreTarjeta = document.getElementById('editCardName').value.trim();
        console.log("nombreTarjeta:", nombreTarjeta);

        const titular = document.getElementById('editCardHolder').value.trim();
        console.log("titular:", titular);

        const numeroTarjeta = document
            .getElementById('editCardNumber')
            .value
            .replace(/\s/g, '');
        console.log("numeroTarjeta:", numeroTarjeta);

        const vencimiento = document.getElementById('editCardExp').value.trim();
        console.log("vencimiento:", vencimiento);

        const cvv = document.getElementById('editCardCVV').value.trim();
        console.log("cvv:", cvv);

        const datosActualizados = {
            nombreTarjeta: await encryptData(nombreTarjeta),
            titular: await encryptData(titular),
            numeroTarjeta: await encryptData(numeroTarjeta),
            vencimiento: await encryptData(vencimiento),
            cvv: await encryptData(cvv)
        };

        try {
            const response = await fetch(`${API_URL}/passwords/cards/${cardId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(datosActualizados)
            });

            if (!response.ok) {
                throw new Error('Error al actualizar');
            }

            await loadCards();
            modal.hide();
            showNotification('✅ Tarjeta actualizada correctamente');

        } catch (err) {
            console.error('❌ Error:', err);
            showNotification('Error al actualizar la tarjeta', 'error');
        }
    });
}

// Abrir modal de eliminar tarjeta
function openDeleteCardModal(cardId, cardName) {
    const modalHtml = `
        <div class="modal fade" id="dynamicDeleteCardModal" tabindex="-1">
            <div class="modal-dialog modal-sm">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Eliminar Tarjeta</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        ¿Estás seguro de eliminar la tarjeta <strong>${escapeHtml(cardName)}</strong>?
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-danger" onclick="confirmDeleteCard('${cardId}')">Eliminar</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const oldModal = document.getElementById('dynamicDeleteCardModal');
    if (oldModal) oldModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('dynamicDeleteCardModal'));
    modal.show();
}

// Confirmar eliminación de tarjeta
async function confirmDeleteCard(cardId) {
    try {
        const response = await fetch(`${API_URL}/passwords/cards/${cardId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Error al eliminar');
        }

        await loadCards();

        const modal = bootstrap.Modal.getInstance(document.getElementById('dynamicDeleteCardModal'));
        if (modal) modal.hide();

        showNotification('Tarjeta eliminada correctamente');

    } catch (err) {
        console.error('❌ Error:', err);
        showNotification('Error al eliminar la tarjeta', 'error');
    }
}

// ==========================================
// FUNCIONES DE CONTRASEÑAS
// ==========================================

// Cargar todas las contraseñas
async function loadPasswords() {
    const container = document.getElementById('passwordsContainer');
    if (!container) {
        console.error('❌ No se encontró #passwordsContainer');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/passwords/sites?user_id=${currentUserId}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.error('❌ Token inválido o expirado');
                localStorage.removeItem('token');
                localStorage.removeItem('user_id');
                window.location.href = './Login.html';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const passwords = await response.json();
        //Descifrado
        console.log("Password PRE CIFRADO")
        console.log(passwords[0])
        
        for (let pwd of passwords) {
            pwd.password = await decryptData(pwd.password);
            pwd.sitio = await decryptData(pwd.sitio);
            pwd.url = await decryptData(pwd.url);
            pwd.usuario = await decryptData(pwd.usuario);
        }

        console.log("Password POST CIFRADO")
        console.log(passwords[0])

        //Descifrado

        passwordsCache = passwords;


        renderPasswords(passwords);
        updateBadge('passwordsBadge', passwords.length);

    } catch (err) {
        console.error('❌ Error al cargar contraseñas:', err);
        showNotification('Error al cargar las contraseñas', 'error');

        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444; opacity: 0.5;"></i>
                <p class="mt-3" style="color: #ef4444;">Error al conectar con el servidor</p>
            </div>
        `;
    }
}

// Renderizar contraseñas
function renderPasswords(passwords) {
    const container = document.getElementById('passwordsContainer');
    container.innerHTML = '';

    if (passwords.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-key" style="font-size: 4rem; color: #ec4899; opacity: 0.3;"></i>
                <p class="mt-3" style="color: #9ca3af;">No tienes contraseñas guardadas</p>
                <p style="color: #6b7280; font-size: 0.9rem;">Usa el botón flotante rosa para agregar una</p>
            </div>
        `;
        return;
    }

    passwords.forEach(pwd => {
        const id = pwd._id || pwd.id;
        const icon = getIconForSite(pwd.sitio);

        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';

        col.innerHTML = `
            <div class="password-card">
                <div class="password-header">
                    <div>
                        <div class="site-icon">
                            <i class="${icon}"></i>
                        </div>
                        <div class="site-name">${escapeHtml(pwd.sitio)}</div>
                    </div>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" onclick="openEditPasswordModal('${id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="openDeletePasswordModal('${id}', '${escapeHtml(pwd.sitio)}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="password-info">
                    <div class="info-row">
                        <div class="info-label">Usuario</div>
                        <div class="info-value">
                            <span>${escapeHtml(pwd.usuario)}</span>
                            <button class="btn-copy" onclick="copyToClipboard('${escapeHtml(pwd.usuario)}', 'Usuario')">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Contraseña</div>
                        <div class="info-value">
                            <span class="password-text" data-real="${escapeHtml(pwd.password)}">••••••••</span>
                            <div>
                                <button class="btn-toggle-password" onclick="togglePassword(this)">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn-copy" onclick="copyToClipboard('${escapeHtml(pwd.password)}', 'Contraseña')">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="password-actions">
                    ${pwd.url ? `<a href="${escapeHtml(pwd.url)}" target="_blank" class="btn-site">
                        <i class="fas fa-external-link-alt"></i>
                        Ir al sitio
                    </a>` : ''}
                </div>
            </div>
        `;

        container.appendChild(col);
    });
}

// Obtener icono según el sitio
function getIconForSite(sitio) {
    const sitioLower = sitio.toLowerCase();
    const icons = {
        'gmail': 'fab fa-google',
        'google': 'fab fa-google',
        'facebook': 'fab fa-facebook',
        'twitter': 'fab fa-twitter',
        'instagram': 'fab fa-instagram',
        'linkedin': 'fab fa-linkedin',
        'github': 'fab fa-github',
        'amazon': 'fab fa-amazon',
        'netflix': 'fab fa-netflix',
        'spotify': 'fab fa-spotify',
        'apple': 'fab fa-apple',
        'microsoft': 'fab fa-microsoft',
        'dropbox': 'fab fa-dropbox',
        'slack': 'fab fa-slack'
    };

    for (const [key, icon] of Object.entries(icons)) {
        if (sitioLower.includes(key)) return icon;
    }

    return 'fas fa-globe';
}

// Configurar formulario de agregar contraseña
function setupAddPasswordForm() {
    const form = document.getElementById('addPasswordForm');
    if (!form) {
        console.warn('⚠️ No se encontró #addPasswordForm');
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const sitioInput = document.getElementById('addPasswordSite').value.trim();
        console.log("sitioInput:", sitioInput);

        const usuarioInput = document.getElementById('addPasswordUsername').value.trim();
        console.log("usuarioInput:", usuarioInput);

        const passwordInput = document.getElementById('addPasswordPassword').value;
        console.log("passwordInput:", passwordInput);

        const urlInput = document.getElementById('addPasswordUrl').value.trim();
        console.log("urlInput:", urlInput);

        const nuevaPassword = {
            sitio: await encryptData(sitioInput),
            usuario: await encryptData(usuarioInput),
            password: await encryptData(passwordInput),
            url: await encryptData(urlInput),
            user_id: currentUserId
        };

        try {
            const response = await fetch(`${API_URL}/passwords/sites`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(nuevaPassword)
            });

            if (!response.ok) {
                throw new Error('Error al crear contraseña');
            }

            await loadPasswords();

            const modal = bootstrap.Modal.getInstance(document.getElementById('addPasswordModal'));
            if (modal) modal.hide();

            form.reset();
            showNotification('Contraseña guardada correctamente');

        } catch (err) {
            console.error('❌ Error:', err);
            showNotification('Error al guardar la contraseña', 'error');
        }
    });
}

// Abrir modal de editar contraseña
function openEditPasswordModal(passwordId) {
    const pwd = passwordsCache.find(p => (p._id || p.id) === passwordId);
    if (!pwd) {
        showNotification('Contraseña no encontrada', 'error');
        return;
    }

    const modalHtml = `
        <div class="modal fade" id="dynamicEditPasswordModal" tabindex="-1">
            <div class="modal-dialog">
                <form class="modal-content" id="editPasswordForm">
                    <div class="modal-header">
                        <h5 class="modal-title">Editar Contraseña</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Sitio</label>
                            <input type="text" class="form-control" id="editPwdSite" value="${escapeHtml(pwd.sitio)}" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Usuario</label>
                            <input type="text" class="form-control" id="editPwdUsername" value="${escapeHtml(pwd.usuario)}" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Contraseña</label>
                            <input type="text" class="form-control" id="editPwdPassword" value="${escapeHtml(pwd.password)}" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">URL (opcional)</label>
                            <input type="url" class="form-control" id="editPwdUrl" value="${escapeHtml(pwd.url || '')}" placeholder="https://">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const oldModal = document.getElementById('dynamicEditPasswordModal');
    if (oldModal) oldModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = new bootstrap.Modal(document.getElementById('dynamicEditPasswordModal'));
    modal.show();

    document.getElementById('editPasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        // Obtener valores en variables
        const sitio = document.getElementById('editPwdSite').value.trim();
        console.log("sitio:", sitio);

        const usuario = document.getElementById('editPwdUsername').value.trim();
        console.log("usuario:", usuario);

        const password = document.getElementById('editPwdPassword').value;
        console.log("password:", password);

        const url = document.getElementById('editPwdUrl').value.trim();
        console.log("url:", url);

        // Construir el objeto con las variables
        const datosActualizados = {
            sitio: await encryptData(sitio),
            usuario: await encryptData(usuario),
            password: await encryptData(password),
            url: await encryptData(url)
        };


        try {
            const response = await fetch(`${API_URL}/passwords/sites/${passwordId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(datosActualizados)
            });

            if (!response.ok) {
                throw new Error('Error al actualizar');
            }

            await loadPasswords();
            modal.hide();
            showNotification('Contraseña actualizada correctamente');

        } catch (err) {
            console.error('❌ Error:', err);
            showNotification('Error al actualizar la contraseña', 'error');
        }
    });
}

// Abrir modal de eliminar contraseña
function openDeletePasswordModal(passwordId, siteName) {
    const modalHtml = `
        <div class="modal fade" id="dynamicDeletePasswordModal" tabindex="-1">
            <div class="modal-dialog modal-sm">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Eliminar Contraseña</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        ¿Estás seguro de eliminar la contraseña de <strong>${escapeHtml(siteName)}</strong>?
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-danger" onclick="confirmDeletePassword('${passwordId}')">Eliminar</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const oldModal = document.getElementById('dynamicDeletePasswordModal');
    if (oldModal) oldModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('dynamicDeletePasswordModal'));
    modal.show();
}

// Confirmar eliminación de contraseña
async function confirmDeletePassword(passwordId) {
    try {
        const response = await fetch(`${API_URL}/passwords/sites/${passwordId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Error al eliminar');
        }

        await loadPasswords();

        const modal = bootstrap.Modal.getInstance(document.getElementById('dynamicDeletePasswordModal'));
        if (modal) modal.hide();

        showNotification('Contraseña eliminada correctamente');

    } catch (err) {
        console.error('❌ Error:', err);
        showNotification('Error al eliminar la contraseña', 'error');
    }
}

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

// Toggle password visibility
function togglePassword(btn) {
    const passwordSpan = btn.closest('.info-value').querySelector('.password-text');
    const icon = btn.querySelector('i');
    const realPassword = passwordSpan.getAttribute('data-real');

    if (passwordSpan.textContent === '••••••••') {
        passwordSpan.textContent = realPassword;
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordSpan.textContent = '••••••••';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Copiar al portapapeles
function copyToClipboard(text, label) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification(`${label} copiado al portapapeles`);
    }).catch(err => {
        console.error('Error al copiar:', err);
        showNotification('Error al copiar', 'error');
    });
}

// Mostrar notificación
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.style.background = type === 'error' ? '#ef4444' : '#10b981';
    notification.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'} me-2"></i>${message}`;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Actualizar badge
function updateBadge(badgeId, count) {
    const badge = document.getElementById(badgeId);
    if (badge) {
        badge.textContent = count;
    }
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Configurar búsqueda
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', function (e) {
        const searchTerm = e.target.value.toLowerCase();

        // Filtrar tarjetas
        document.querySelectorAll('#cardsContainer .card-item').forEach(card => {
            const text = card.textContent.toLowerCase();
            const col = card.closest('.col-md-6, .col-lg-4, .col-xl-3');
            if (col) {
                col.style.display = text.includes(searchTerm) ? '' : 'none';
            }
        });

        // Filtrar contraseñas
        document.querySelectorAll('#passwordsContainer .password-card').forEach(card => {
            const text = card.textContent.toLowerCase();
            const col = card.closest('.col-md-6, .col-lg-4');
            if (col) {
                col.style.display = text.includes(searchTerm) ? '' : 'none';
            }
        });
    });
}