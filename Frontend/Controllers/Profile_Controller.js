// =========================================================
// Configuraciones y Referencias
// =========================================================
const userId = localStorage.getItem('user_id'); 
const authToken = localStorage.getItem('token'); 
const apiBaseUrl = '/api/users'; 

const local_url = "";

// Referencias a elementos del DOM (IDs sensibles a mayúsculas/minúsculas)
const usernameDisplay = document.getElementById('CurrentUsername'); // ID en HTML: CurrentUsername
const newUsernameInput = document.getElementById('newUsername');
const saveButton = document.getElementById('Saveusername');       // ID en HTML: Saveusername

// =========================================================
// Función 1: Cargar el nombre y estadísticas del usuario (GET)
// =========================================================
async function loadUserProfile() {
    if (!userId || !authToken) {
        if (usernameDisplay) {
            usernameDisplay.textContent = 'Error: No autenticado. Redirigiendo...';
        }
        //alert('Sesión no encontrada o Token faltante. Por favor, inicia sesión.');
        // Opcional: Redirigir si no hay autenticación
        window.location.href = './Login.html'; 
        return;
    }

    try {
        const response = await fetch(`${apiBaseUrl}/profile?id=${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 401 || response.status === 403) {
                alert('Token inválido o expirado. Vuelve a iniciar sesión.');
                window.location.href = './Login.html'; 
                return;
            }
            throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
        }

        const userData = await response.json();
        // === ACTUALIZAR BANNER DEL PLAN ===
        const planText = document.querySelector('.plan-type');
        const planBanner = document.querySelector('.plan-banner');
        const icon = document.querySelector('.plan-info i');

        if (planText && planBanner && icon) {
            if (userData.Is_free === false) {
                
                planText.textContent = "PREMIUM";
                planText.style.color = "#ffc857"; 

                icon.className = "fa-solid fa-crown";
                icon.style.color = "#ffc857";

                planBanner.style.background = "rgba(255, 200, 87, 0.12)"; 
                planBanner.style.border = "1px solid rgba(255,200,87,0.35)";
                planBanner.style.boxShadow = "0 0 12px rgba(255,200,87,0.25)";

            } else {
                planText.textContent = "FREE";
                planText.style.color = "#ffffff";

                icon.className = "fa-solid fa-user-shield";
                icon.style.color = "#9bb1c8";

                planBanner.style.background = "rgba(255,255,255,0.06)";
                planBanner.style.border = "1px solid rgba(255,255,255,0.12)";
                planBanner.style.boxShadow = "none";
            }
        }

        
        // 1. Mostrar el nombre actual
        if (usernameDisplay) {
            usernameDisplay.textContent = userData.nombre; 
            // También actualizamos localStorage con el nombre fresco
            localStorage.setItem('user_name', userData.nombre);
        }
        
        // 2. Cargar los contadores para la descripción
        const descriptionCard = document.querySelector('.description-card');
        if (descriptionCard) {
            descriptionCard.innerHTML = `
                <h4>Estadísticas de tu bóveda:</h4>
                <p>Contraseñas guardadas: <strong>${userData.Numero_pass}</strong></p>
                <p>Notas guardadas: <strong>${userData.Numero_notes}</strong></p>
                <p>Imágenes (Stego) guardadas: <strong>${userData.Numero_img}</strong></p>
                <p>Tarjetas guardadas: <strong>${userData.Numero_tarjetas}</strong></p>
            `;
        }

    } catch (error) {
        console.error('Error al cargar el perfil:', error);
        if (usernameDisplay) {
            usernameDisplay.textContent = 'Error al cargar perfil';
        }
        alert('Hubo un problema al cargar los datos del perfil. Revisa la consola del navegador.');
    }
}

// =========================================================
// Función 2: Actualizar el nombre de usuario (PUT)
// =========================================================
async function updateUsername(event) {
    event.preventDefault(); // Previene el comportamiento por defecto si fuera un formulario

    const newUsername = newUsernameInput ? newUsernameInput.value.trim() : '';

    if (!newUsername) {
        alert('Por favor, introduce un nuevo nombre de usuario.');
        return;
    }

    if (!userId || !authToken) {
        alert('Error de autenticación. Recarga la página o inicia sesión.');
        return;
    }

    try {
        const response = await fetch(apiBaseUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}` 
            },
            body: JSON.stringify({
                id: userId,
                nombre: newUsername
            })
        });

        if (!response.ok) {
            // Intenta obtener un mensaje de error del cuerpo
            const errorBody = await response.json().catch(() => ({ message: response.statusText }));
             if (response.status === 401 || response.status === 403) {
                throw new Error('No autorizado. Token inválido o expirado.');
            }
            throw new Error(`La actualización falló: ${errorBody.message || response.statusText}`);
        }

        const data = await response.json();

        // 1. Feedback al usuario
        alert('Nombre de usuario actualizado exitosamente a: ' + data.nombre);
        
        // 2. Actualizar la vista (llama a loadUserProfile para actualizar el DOM)
        await loadUserProfile();

        // 3. Cerrar y limpiar el modal
        const modalElement = document.getElementById('modalEditUsername');
        // Usa la función de Bootstrap para manipular el modal
        const modalInstance = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
        modalInstance.hide();
        newUsernameInput.value = '';

    } catch (error) {
        console.error('Error al actualizar el nombre de usuario:', error);
        alert('Error al actualizar: ' + error.message);
    }
}

function base64ToBuffer(base64) {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
}

// Función auxiliar para convertir buffer a base64
function arraytobuffer64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

async function changePassword(event) {
    if(event) event.preventDefault();

    // Obtener valores directamente de los inputs
    const oldPassword = document.getElementById('oldPassword')?.value || 
                       document.querySelector('input[name="oldPassword"]')?.value;
    const newPassword = document.getElementById('newPassword')?.value || 
                       document.querySelector('input[name="newPassword"]')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value || 
                           document.querySelector('input[name="confirmPassword"]')?.value;
    
    // 1. Validar que los campos estén llenos
    if (!oldPassword || !newPassword || !confirmPassword) {
        alert("Por favor completa todos los campos");
        return;
    }
    
    // 2. Validar que las contraseñas nuevas coincidan
    if (newPassword !== confirmPassword) {
        alert("Las contraseñas nuevas no coinciden");
        return;
    }

    const json = { oldPassword, newPassword, confirmPassword };

    try {
        // 2. Obtener la UMK wrapped actual del usuario
        const user = JSON.parse(sessionStorage.getItem("user"));
        if (!user || !user.UMK) {
            alert("No se encontró información del usuario");
            return;
        }

        const currentUMK = user.UMK;
        const saltBuffer = base64ToBuffer(currentUMK.salt);

        // 3. UNWRAP: Derivar KEK con la contraseña ANTIGUA
        const encoder = new TextEncoder();
        const oldPasswordKey = await crypto.subtle.importKey(
            "raw",
            encoder.encode(json.oldPassword),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        const oldKEK = await crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: saltBuffer,
                iterations: 100000,
                hash: "SHA-256"
            },
            oldPasswordKey,
            { name: "AES-KW", length: 256 },
            false,
            ["unwrapKey"]
        );

        // 4. Unwrap la Master Key con la KEK antigua
        const masterKey = await crypto.subtle.unwrapKey(
            "raw",
            base64ToBuffer(currentUMK.wrapped),
            oldKEK,
            "AES-KW",
            { name: "AES-GCM", length: 256 },
            true, //extractable para poder re-wrappearla
            ["encrypt", "decrypt"]
        );


        // 5. RE-WRAP: Generar nuevo salt para la nueva contraseña
        const newSaltBuffer = crypto.getRandomValues(new Uint8Array(16));
        const newSalt64 = btoa(String.fromCharCode(...newSaltBuffer));

        // 6. Derivar nueva KEK con la contraseña NUEVA
        const newPasswordKey = await crypto.subtle.importKey(
            "raw",
            encoder.encode(json.newPassword),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        const newKEK = await crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: newSaltBuffer,
                iterations: 100000,
                hash: "SHA-256"
            },
            newPasswordKey,
            { name: "AES-KW", length: 256 },
            false,
            ["wrapKey"]
        );

        // 7. Re-wrap la Master Key con la nueva KEK
        const newWrappedMK = await crypto.subtle.wrapKey(
            "raw",
            masterKey,
            newKEK,
            "AES-KW"
        );

        const newWrapped64 = arraytobuffer64(newWrappedMK);

        // 8. Preparar el objeto UMK actualizado
        const newUMK = {
            wrapped: newWrapped64,
            salt: newSalt64,
            iteration: 100000
        };


        // 9. Enviar al servidor
        const token = localStorage.getItem('token');
        const user_id = localStorage.getItem('user_id');

        const response = await fetch(local_url + '/api/users', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                id: user_id,
                pass: json.newPassword,
                UMK: newUMK
            })
        });

        if (!response.ok) {
            throw new Error("Error al actualizar contraseña en el servidor");
        }

        const result = await response.json();
        
        // 10. Actualizar sessionStorage
        user.UMK = newUMK;
        sessionStorage.setItem("user", JSON.stringify(user));

        alert("Contraseña actualizada correctamente");
        
        // Limpiar los campos
        document.getElementById('oldPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        
        // Cerrar el modal (Bootstrap 5)
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditPassword'));
        if (modal) {
            modal.hide();
        }

    } catch (error) {
        console.error("Error al cambiar contraseña:", error);
        alert("Error: La contraseña antigua es incorrecta o hubo un problema");
    }
}

// Event listener para el botón de actualizar
window.addEventListener("DOMContentLoaded", () => {
    let btnUpdatePass = document.getElementById("btnUpdatePass");
    if (btnUpdatePass) {
        btnUpdatePass.addEventListener("click", changePassword);
    }
});

// BOTÓN PARA CAMBIAR EL TEMA DE LA APP
function setTheme(mode) {
    document.body.classList.toggle("light-mode", mode === "light");
    localStorage.setItem("theme", mode);
}

function applyTheme() {
    const mode = localStorage.getItem("theme") || "dark";

    alert(`Tema ${mode === "light" ? "claro" : "oscuro"} aplicado con éxito 🎉`);

    const modal = bootstrap.Modal.getInstance(document.getElementById("modalEditTheme"));
    modal.hide();
}

// ELIMINACIÓN DE LA CUENTA
document.getElementById("btnConfirmDeleteAccount").addEventListener("click", deleteAccount);

async function deleteAccount() {
    const userId = localStorage.getItem("user_id");
    const token  = localStorage.getItem("token");

    if (!userId || !token) {
        alert("No hay sesión activa");
        return;
    }

    try {
        const res = await fetch(`/api/users/${userId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error || "Error al eliminar la cuenta");
            return;
        }

        alert("Cuenta eliminada con éxito.");

        // Limpieza local
        localStorage.clear();
        sessionStorage.clear();

        window.location.href = "./Login.html";

    } catch (err) {
        console.error(err);
        alert("Error al eliminar la cuenta");
    }
}

// ========== SUBIR IMAGEN DE PERFIL ==========

const fileInput = document.getElementById("profileFile");
const uploadBtn = document.getElementById("uploadBtn");
const profileImg = document.getElementById("profileImage");

// CARGAR IMAGEN AL INICIAR
async function loadUserProfileImage() {
    const userId = localStorage.getItem("user_id");
    
    
    if (!userId) {
        return;
    }

    try {
        const res = await fetch(`/api/profile/image?user_id=${userId}`);
        const data = await res.json();


        if (data.success && data.profileImage) {
            profileImg.src = await loadPhotoAsBlobUrl(data.profileImage);
        } else {
            profileImg.src = '../Assets/defualt_usear.jpg';
        }
    } catch (err) {
        console.error("❌ Error cargando imagen:", err);
        profileImg.src = '../Assets/defualt_usear.jpg';
    }
}

// La foto se pide con el token de sesión (la ruta está protegida) y se
// muestra como un objeto local del navegador.
async function loadPhotoAsBlobUrl(path) {
    const res = await fetch(path);
    if (!res.ok) {
        return '../Assets/defualt_usear.jpg';
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
}

// Ejecutar al cargar la página
window.addEventListener('DOMContentLoaded', loadUserProfileImage);

// SUBIR NUEVA IMAGEN
if (uploadBtn && fileInput && profileImg) {

    uploadBtn.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", async () => {
        const file = fileInput.files[0];
        if (!file) return;

        const userId = localStorage.getItem("user_id");
        
        if (!userId) {
            alert('Error: No hay user_id en localStorage. Por favor inicia sesión de nuevo.');
            return;
        }


        const formData = new FormData();
        formData.append("photo", file);
        formData.append("user_id", userId);

        uploadBtn.textContent = 'Subiendo...';
        uploadBtn.disabled = true;

        try {
            const res = await fetch("/api/profile/upload", {
                method: "POST",
                body: formData
            });

            const data = await res.json();


            if (data.success) {
                profileImg.src = await loadPhotoAsBlobUrl(data.path);
                alert("✅ Imagen actualizada con éxito!");
            } else {
                alert("Error: " + data.error);
                console.error('❌ Error del servidor:', data.error);
            }

        } catch (err) {
            console.error("❌ Error subiendo imagen:", err);
            alert("Error al subir imagen");
        } finally {
            uploadBtn.textContent = 'Cambiar foto';
            uploadBtn.disabled = false;
        }
    });
}

// DEBUG: Mostrar user_id actual




// =========================================================
// Inicialización y Listeners
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
    // Estas líneas ahora deberían encontrar los elementos si moviste el script al final del body
    const usernameDisplay = document.getElementById('CurrentUsername'); 
    const saveButton = document.getElementById('Saveusername');       

    // 1. Cargar los datos del perfil al iniciar la página
    loadUserProfile(); 

    // 2. Asignar el listener al botón de guardar
    if (saveButton) {
        saveButton.addEventListener('click', updateUsername);
    } else {
        // Este error ya no debería aparecer si moviste el script
        console.error("El botón 'Saveusername' no se encontró en el DOM.");
    }
    if (!usernameDisplay) {
        // Este error ya no debería aparecer si moviste el script
        console.    error("El elemento 'CurrentUsername' no se encontró en el DOM.");
    } 

    document.getElementById("btnUpdatePass")
        .addEventListener("click", changePassword);
});