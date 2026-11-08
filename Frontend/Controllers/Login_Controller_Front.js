const local_url = ""; 

function toggleForms(){
let form_login = document.getElementById('formLogin'),
form_register = document.getElementById('formRegister');

if(form_register.style.display == 'none'){
    form_login.style.display = 'none';
    form_register.style.display = 'block';
}   
else{
    form_login.style.display = 'block';
    form_register.style.display = 'none';
}
}

function base64ToBuffer(base64) {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
}

function bufferTobase64(buffer){
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

async function login(){
    event.preventDefault();
    let data = new FormData(event.target);
    let json = Object.fromEntries(data.entries());
    fetch('/api/login', {
        method: 'POST', 
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(Object.fromEntries(data.entries()))
    })
    .then(response => {
        if(!response.ok) {
            alert("Correo y/o contraseña incorrectos");
            throw new Error("Credenciales incorrectas");
        }
        return response.json();
    })
    .then(async data => {
        localStorage.setItem('token', data.token);
        sessionStorage.setItem('UMK', data.UMK.wrapped);
        localStorage.setItem('user_id', data.user_id);
        sessionStorage.setItem("user", JSON.stringify(data));


        // REDERIVAR LA KEKW

        let salt = base64ToBuffer(data.UMK.salt);
        const encoder = new TextEncoder();
        const passwordKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(json.pass),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

        const KEK = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,  // ✅ Usar el buffer original, no base64
            iterations: 100000, // ✅ Aumentado a 100k (más seguro)
            hash: "SHA-256"
        },
        passwordKey,
        { name: "AES-KW", length: 256 },
        true, // ✅ No extractable (más seguro)
        ["wrapKey", "unwrapKey"]
        );

        const masterKey = await crypto.subtle.unwrapKey(
            "raw",                              // Formato de la key wrapeada
            base64ToBuffer(data.UMK.wrapped),                    // ArrayBuffer del wrapped key
            KEK,                                // La KEK para desencriptar
            "AES-KW",                           // Algoritmo de unwrap
            { name: "AES-GCM", length: 256 },   // Algoritmo de la key resultante
            true,                               // extractable
            ["encrypt", "decrypt"]              // usages de la key resultante
        );
        /////////////////////
        // window.nomirar = {
        //     KEK: KEK
        // };
        sessionStorage.setItem("KEK", KEK);
        const KEKraw = await crypto.subtle.exportKey("raw", KEK);
        sessionStorage.setItem("KEK_raw", bufferTobase64(KEKraw));
        window.location.href = local_url + '/Profile.html';
    })
    .catch(err => {
        console.error("Error en el login: ", err);
    });
};

window.addEventListener("DOMContentLoaded", () => {
    let form = document.getElementById("formLogin");
    if(form){
        form.addEventListener("submit", login);
    }
});



function arraytobuffer64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

async function register(event){
    event.preventDefault();

    let data = new FormData(event.target);
    let json = Object.fromEntries(data.entries());
    
    
    // CREACIÓN DE LA UMK 
    // Derivar UMK con PBKDF2
    const saltBuffer = crypto.getRandomValues(new Uint8Array(16));
    const salt64 = btoa(String.fromCharCode(...saltBuffer));
    
    // 2. Derivar KEK (Key Encryption Key) desde la contraseña
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(json.pass),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    const KEK = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: saltBuffer,  // ✅ Usar el buffer original, no base64
            iterations: 100000, // ✅ Aumentado a 100k (más seguro)
            hash: "SHA-256"
        },
        passwordKey,
        { name: "AES-KW", length: 256 },
        false, // ✅ No extractable (más seguro)
        ["wrapKey", "unwrapKey"]
    );

    // 3. Generar la Master Key (MK) que se usará para encriptar datos
    const masterKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 }, // ✅ AES-GCM para encriptar datos
        true, // ✅ Extractable para poder wrappearla
        ["encrypt", "decrypt"]
    );
    
    // Debug masterkey
    // 4. Wrap (cifrar) la Master Key con la KEK
    const wrappedMK = await crypto.subtle.wrapKey(
        "raw", 
        masterKey, 
        KEK, 
        "AES-KW"
    );
    
    const wrapped64 = arraytobuffer64(wrappedMK);
    
    // 5. Guardar la clave envuelta y metadatos
    json.UMK = {
        wrapped: wrapped64,
        salt: salt64,
        iteration: 100000,
    };



    
    fetch(local_url + '/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json)
    })
    .then(async resp => {
        const result = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            alert(result.error || "No se pudo registrar el usuario");
            return;
        }
        alert("Usuario registrado");
        toggleForms();
    })
    .catch(err => console.error(err));
}

window.addEventListener("DOMContentLoaded", () => {
    let form = document.getElementById("formRegister");
    if(form){
        form.addEventListener("submit", register);
    }
});