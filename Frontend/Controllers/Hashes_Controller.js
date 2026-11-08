let selectedFiles = {
    1: null,
    2: null
};

async function checkAccess() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/Login.html";
        return;
    }

    const res = await fetch("/hashes/verify", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {

        localStorage.clear();
        window.location.href = "/Login.html";
        return;
    }

    // Token is valid → allow access
}

checkAccess();


function selectFile(num) {
    document.getElementById(`fileInput${num}`).click();
}

function handleFile(num) {
    const input = document.getElementById(`fileInput${num}`);
    const file = input.files[0];

    if (!file) return;

    selectedFiles[num] = file;   // Save file for later

    document.getElementById(`fileName${num}`).textContent = file.name;
    document.getElementById(`hash-placeholder${num}`).textContent = file.name;
}

async function calculateHashes() {
    // 1. Ensure files exist
    if (!selectedFiles[1] || !selectedFiles[2]) {
        alert("Selecciona ambos archivos antes de continuar.");
        return;
    }

    // 2. Detect selected hash format
    const format = document.querySelector("input[name='hashFormat']:checked").id;

    // 3. Compute the hash for each file
    const salt = dcodeIO.bcrypt.genSaltSync(2); 
    const hash1 = await getHash(selectedFiles[1], format, salt);
    const hash2 = await getHash(selectedFiles[2], format, salt);

    // 4. Display results
    document.getElementById("hashOutput1").textContent = hash1;
    document.getElementById("hashOutput2").textContent = hash2;

    if(hash1 === hash2)
    {
        document.getElementById("color1").style.backgroundColor = "#5ddd9d9c";
        document.getElementById("color2").style.backgroundColor = "#5ddd9d9c";
    }
    else
    {
        document.getElementById("color1").style.backgroundColor = "#dbd96e84";
        document.getElementById("color2").style.backgroundColor = "#dbd96e84";
    }
}

async function getHash(file, format, bcryp_salt) {
    const arrayBuffer = await file.arrayBuffer();

    // STANDARD HASHES — Web Crypto API
    if (format === "sha384") {
        return cryptoHash(arrayBuffer, "SHA-384")
    }
    if (format === "sha1") {
        return cryptoHash(arrayBuffer, "SHA-1");
    }
    if (format === "sha256") {
        return cryptoHash(arrayBuffer, "SHA-256");
    }
    if (format === "sha512") {
        return cryptoHash(arrayBuffer, "SHA-512");
    }

    // BCRYPT — browsers lack native support
    if (format === "bcrypt") {
        
        return hashWithBcrypt(arrayBuffer, bcryp_salt);
    }

    return "Formato no soportado";
}

async function cryptoHash(buffer, algorithm) {
    const hashBuffer = await crypto.subtle.digest(algorithm, buffer); //Esto recibe el tipo de hash a usar (algorithm) y los datos a hashear (el arrbuffer del archivo)
    const hashArray = Array.from(new Uint8Array(hashBuffer)); //Como la función anterior devuelve bytes, se deben de convertir a enteros para que sean entendibles
    //Finalmente esta convierte el arreglo de enteros a hexadecimal, para representar el hash en su formato normal.
    //Lo hace de 2 en 2 (cada byte a un par hexadecimal), incluso cuando el dígito sea uno solo (5 -> 05) y luego los junta con join
    // La función map, le aplica alguna transformación a cada elemento de un arreglo 'b', uno por uno.
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join(""); 
}

async function hashWithBcrypt(buffer, salt) {
    const text = new TextDecoder().decode(buffer); // convert file → string
    return dcodeIO.bcrypt.hashSync(text, salt);            // return bcrypt hash
}
