let selectedImage = null;
let selectedText = null;

function selectStegoFile(type) {
    if (type === "image") document.getElementById("imageInput").click();
    if (type === "text") document.getElementById("textInput").click();
}

function handleStegoFile(type) {
    if (type === "image") {
        selectedImage = document.getElementById("imageInput").files[0];
        document.getElementById("imageName").textContent = selectedImage?.name || "No file selected";
    }
    if (type === "text") {
        selectedText = document.getElementById("textInput").files[0];
        document.getElementById("textName").textContent = selectedText?.name || "No file selected";
    }
}
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);

        reader.readAsText(file);
    });
}

async function sendStegoToBackend() {
    if (!selectedImage || !selectedText) {
        alert("Selecciona la imagen y el archivo de texto primero.");
        return;
    }
        // 1. Read file content (PLAIN TEXT)
    const textContent = await readFileContent(selectedText);
    console.log("Este es el texto a mandar:", textContent)
        // 2. Encrypt
    const encryptedText = await encryptData(textContent);
    console.log("Texto cifrado:", encryptedText);

    const formData = new FormData();
    formData.append("image", selectedImage);
    formData.append("text", encryptedText);
    formData.append("description", document.getElementById("description").value);
    formData.append("token", localStorage.getItem('token'));
    formData.append("user_id", localStorage.getItem('user_id'))
    console.log(formData);
    const response = await fetch("/stego", {
        method: "POST",
        body: formData
    });
    if (response.status === 403) {
        alert("Has alcanzado el máximo de imágenes. Actualiza tu plan a premium para continuar.");
        return;
    }
    if (response.status === 200) {
        loadSavedImages();
        return;
    }
    if (!response.ok) {
        alert("Error creando imagen esteganográfica");
        return;
    }

    // Expecting backend to return a blob (image)
    const resultBlob = await response.blob();
    const url = URL.createObjectURL(resultBlob);

    // Show image or allow download
    //const imgWindow = window.open();
    ///imgWindow.document.write(`<img src="${url}" style="max-width:100%">`);
}

const userId = localStorage.getItem('user_id'); 
const authToken = localStorage.getItem('token'); 
const apiBaseUrl = 'http://localhost:3000/stego';
const delbtn = document.getElementById("btn_borrar")

//Raíz de la tabla (DOM)
const root = document.getElementById('Header_lista');
loadSavedImages();

async function loadSavedImages() {
    // if (!userId || !authToken) {
    //     if (usernameDisplay) {
    //         usernameDisplay.textContent = 'Error: No autenticado. Redirigiendo...';
    //     }
    //     alert('Sesión no encontrada o Token faltante. Por favor, inicia sesión.');
    //     // Opcional: Redirigir si no hay autenticación
    //     window.location.href = './Login.html'; 
    //     return;
    // }

    try {
        const response = await fetch(`${apiBaseUrl}?User_id=${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 401 || response.status === 403) {
                alert('Token inválido o expirado. Vuelve a iniciar sesión.');
                localStorage.clear();
                window.location.href = './Login.html'; 
                return;
            }
            throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
        }

        const image_list = await response.json();
        console.log(image_list)
        // === CREAR TABLA ===
        root.innerHTML = "";
        console.log("Imágenes:", image_list.length)
        if(image_list.length === 0)
        {
            const info = document.createElement('p')
            info.textContent = "No hay imágenes creadas aún."
            info.style.display = "flex";
            info.style.alignItems = "center";
            info.style.color = "#8b5cf6";
            root.append(info);
        }
        else //Si sí hay datos
        {
            const table = document.createElement("table");
            table.classList.add("stego-table");
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Nombre de imagen</th>
                        <th>Fecha de creación</th>
                        <th>Descripción</th>
                        <th>Extraer información</th>
                        <th>Editar</th>
                        <th>Eliminar</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector("tbody");
            //Crear filas con la información de la DB
            for (let index = 0; index < image_list.length; index++) {
                const image = image_list[index];
                const fila = document.createElement('tr');
                //Crear las filas
                    //Crear nombre
                const nombre = document.createElement('td');
                nombre.innerText = image.prettyname;
                fila.append(nombre);
                    //Crear fecha
                const fecha = document.createElement('td');

                const dateObj = new Date(image.creation); // parse ISO date
                const day = dateObj.getDate().toString().padStart(2, '0');
                const month = (dateObj.getMonth() + 1).toString().padStart(2, '0'); // months start at 0
                const year = dateObj.getFullYear();

                fecha.innerText = `${day}/${month}/${year}`;

                fila.append(fecha);

                    //Crear descripción
                const descripción = document.createElement('td');
                descripción.innerText = image.description;
                fila.append(descripción);
                    //Crear Extraer información
                const extract_btn = document.createElement('td');
                const btn = document.createElement('button');
                btn.className = "btn diamond";
                btn.setAttribute("data-bs-toggle", "modal");
                btn.setAttribute("data-bs-target", "#Modal_sacar_info");
                btn.dataset.imageId = image._id;

                // Icono
                const icon = document.createElement('i');
                icon.className = "fa-solid fa-key";

                // Armar estructura
                btn.appendChild(icon);
                extract_btn.appendChild(btn);

                fila.append(extract_btn);

                //Append al cuerpo de la tabla la fila recién creada
                tbody.append(fila)

                // Crear celda para "Editar"
                const edit = document.createElement('td');

                // Crear botón
                const editBtn = document.createElement('button');
                editBtn.className = "btn diamond";
                editBtn.setAttribute("data-bs-toggle", "modal");
                editBtn.setAttribute("data-bs-target", "#Modal_editar");
                editBtn.dataset.imageId = image._id;
                editBtn.dataset.descripción = image.description;
                editBtn.dataset.nombre = image.prettyname;
                // Icono
                const editIcon = document.createElement('i');
                editIcon.className = "fa-solid fa-pencil";

                // Armar estructura
                editBtn.appendChild(editIcon);
                edit.appendChild(editBtn);

                // Agregar a la fila
                fila.append(edit);

                // Crear celda para "Eliminar"
                const borrar = document.createElement('td');

                // Crear botón
                const delBtn = document.createElement('button');
                delBtn.className = "btn diamond del";
                delBtn.setAttribute("data-bs-toggle", "modal");
                delBtn.setAttribute("data-bs-target", "#Modal_borrar");
                delBtn.dataset.imageId = image._id;
                // Icono
                const delIcon = document.createElement('i');
                delIcon.className = "fa-solid fa-x";

                // Armar estructura
                delBtn.appendChild(delIcon);
                borrar.appendChild(delBtn);

                // Agregar a la fila
                fila.append(borrar);


            }
            //Append la tabla entera, ya llenada
            root.append(table);
        }
        

    } catch (error) {
        console.error('Error al cargar el perfil:', error);
        if (usernameDisplay) {
            usernameDisplay.textContent = 'Error al cargar perfil';
        }
        alert('Hubo un problema al cargar los datos del perfil. Revisa la consola del navegador.');
    }
}

//Editar imagen
const modalEdit = document.getElementById('Modal_editar');
const confirmEditBtn = document.getElementById('Edit_btn');

modalEdit.addEventListener('show.bs.modal', (event) => {
    // "event.relatedTarget" = the button that triggered the modal
    const triggerBtn = event.relatedTarget;
    
    // Read the ID from the table button
    const imageId = triggerBtn.dataset.imageId;
    const nombre = triggerBtn.dataset.nombre;
    const desc = triggerBtn.dataset.descripción;
    
    // Store it in the confirm button
    confirmEditBtn.dataset.imageId = imageId;
    
    document.getElementById("Descripción_img").textContent = desc;
    document.getElementById("Nombre_img").value = nombre;
});

confirmEditBtn.addEventListener('click', () => {
        event.preventDefault();
        console.log("Holaaaa");
        let data_raw = new FormData(document.getElementById('FormEdit'));
        const data = Object.fromEntries(data_raw);
        console.log("Data", data);
        let nombre = data_raw.get("nombre");
        let Descripción = data_raw.get("Descripción");
        console.log("Nombre", nombre);
        console.log("Descripción", Descripción);
        const id = confirmEditBtn.dataset.imageId;
        fetch('/stego/' + id, {
            method: 'PUT',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nombre: data_raw.get("nombre"),
                Descripción: data_raw.get("Descripción")
    })
        })
        .then(response => {
            if(!response.ok) alert("Error al editar imagen")
                return response.json();
        })
        .then(res => {
            alert("Imagen editada exitosamente")
            loadSavedImages();
        })
        .catch(err => {
            console.error('Error al editar imagen', err);
        })
})

//Extraer data
const modalExtract = document.getElementById('Modal_sacar_info');

modalExtract.addEventListener('show.bs.modal', (event) => {
    // "event.relatedTarget" = the button that triggered the modal
    const triggerBtn = event.relatedTarget;
    
    // Read the ID from the table button
    const imageId = triggerBtn.dataset.imageId;
    retrieveData(imageId);
    
});

//Borrar imagen
const modal = document.getElementById('Modal_borrar');
const confirmDeleteBtn = document.getElementById('btn_borrar');

modal.addEventListener('show.bs.modal', (event) => {
    // "event.relatedTarget" = the button that triggered the modal
    const triggerBtn = event.relatedTarget;
    
    // Read the ID from the table button
    const imageId = triggerBtn.dataset.imageId;
    
    // Store it in the confirm button
    confirmDeleteBtn.dataset.imageId = imageId;
});

confirmDeleteBtn.addEventListener('click', () => {
    const id = confirmDeleteBtn.dataset.imageId;
    
    // Now you have the correct ID here
    console.log("Deleting image with ID:", id);

    delete_img(id);
});


async function delete_img(img_id)
{
    console.log("Borrando imagen con ID:", img_id);
    const user_id = localStorage.getItem('user_id');
    const response = await fetch(`/stego/${img_id}?user_id=${user_id}`, {
        method: "DELETE",
    });
    if (response.status === 200) {
        alert("Se ha eliminado correctamente la imagen");
        loadSavedImages();
        return;
    }
    if (!response.ok) {
        alert("Error eliminando la imagen");
        return;
    }
}

async function retrieveData(img_id)
{
    console.log("ID", img_id);
    const response = await fetch("/stego/extract/" + img_id, {
        method: "GET",
    });
    console.log(response.body);
    if (response.status === 200) {
        const data = await response.json();
        console.log("Respuesta:", data);
        const info_descifrada = await decryptData(data.text);
        console.log("Info descifrada:", info_descifrada)
        document.getElementById('Display_info').textContent = info_descifrada;
        return;
    }
    if (!response.ok) {
        alert("Error extrayendo los datos");
        return;
    }
}