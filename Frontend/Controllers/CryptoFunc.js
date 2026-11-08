// =======================
// Helpers base64 <-> buffer
// =======================
function base64ToBuffer(base64) {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
}

function bufferToBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

// Alias por si en algún sitio usabas el viejo nombre
const bufferTobase64 = bufferToBase64;

// =======================
// Obtener KEK desde sessionStorage
// =======================
async function getKEKFromSession() {
    const kekBase64 = sessionStorage.getItem("KEK_raw");
    if (!kekBase64) {
        throw new Error("KEK_raw no encontrada en sessionStorage. Vuelve a iniciar sesión.");
    }

    const kekRaw = base64ToBuffer(kekBase64);

    const KEK = await crypto.subtle.importKey(
        "raw",
        kekRaw,
        { name: "AES-KW" },
        false,                  // no extractable
        ["wrapKey", "unwrapKey"]
    );

    return KEK;
}

// =======================
// Unwrap de la Master Key usando la KEK guardada
// =======================
// OJO: dejo el parámetro 'password' para no romper código viejo,
// pero ya NO se usa para nada.
async function unwrapMasterKey(_passwordIgnorado) {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (!user || !user.UMK) {
        throw new Error("No se encontró información de usuario. Por favor, inicia sesión.");
    }

    // 1) Sacamos KEK desde sessionStorage
    const KEK = await getKEKFromSession();

    // 2) Unwrap de la Master Key usando UMK.wrapped + KEK
    const masterKey = await crypto.subtle.unwrapKey(
        "raw",
        base64ToBuffer(user.UMK.wrapped),
        KEK,
        "AES-KW",
        { name: "AES-GCM", length: 256 },
        false,                  // NO extractable (más seguro)
        ["encrypt", "decrypt"]
    );

    return masterKey;
};

// =======================
// Cifrar texto con la MK
// =======================
// password ahora es OPCIONAL e ignorado
async function encryptData(plaintext, _passwordIgnorado) {
    try {
        // Unwrapeamos la MK para esta operación
        const masterKey = await unwrapMasterKey();

        // Generamos IV aleatorio (12 bytes recomendado para GCM)
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // Codificamos texto
        const encoder = new TextEncoder();
        const data = encoder.encode(plaintext);

        // Ciframos
        const ciphertext = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            masterKey,
            data
        );

        const encryptedPackage = {
            iv: bufferToBase64(iv),
            ciphertext: bufferToBase64(ciphertext)
        };

        // Lo devolvemos como JSON en base64 (como ya hacías)
        return btoa(JSON.stringify(encryptedPackage));

    } catch (error) {
        console.error("Error al cifrar:", error);
        throw error; 
    }
}

// =======================
// Descifrar texto con la MK
// =======================
async function decryptData(encryptedData, _passwordIgnorado) {
    try {
        const masterKey = await unwrapMasterKey();

        // Desempaquetar
        const encryptedPackage = JSON.parse(atob(encryptedData));
        const iv = base64ToBuffer(encryptedPackage.iv);
        const ciphertext = base64ToBuffer(encryptedPackage.ciphertext);
        
        // Descifrar
        const decryptedData = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            masterKey,
            ciphertext
        );
        
        const decoder = new TextDecoder();
        return decoder.decode(decryptedData);
        
    } catch (error) {
        console.error("Error al descifrar:", error);
        throw error;
    }
}

// =======================
// Objetos completos
// =======================
async function encryptObject(obj, passwordOpcional) {
    const jsonString = JSON.stringify(obj);
    return await encryptData(jsonString, passwordOpcional);
}

async function decryptObject(encryptedData, passwordOpcional){
    const jsonString = await decryptData(encryptedData, passwordOpcional);
    return JSON.parse(jsonString);
}

// =======================
// Exponer en window
// =======================
window.encryptData = encryptData;
window.decryptData = decryptData;
window.encryptObject = encryptObject;
window.decryptObject = decryptObject;
window.unwrapMasterKey = unwrapMasterKey;
