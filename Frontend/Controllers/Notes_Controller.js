const apiNotesUrl = "/api/notes";
const userId = localStorage.getItem("user_id");
const authToken = localStorage.getItem('token');


// Elementos del DOM
const notesGrid = document.querySelector(".notes-grid");

// Inputs modales
const newTitle = document.getElementById("noteTitle");
const newContent = document.getElementById("noteContent");

const editTitle = document.getElementById("editNoteTitle");
const editContent = document.getElementById("editNoteContent");

let editingNoteId = null;
let deletingNoteId = null;

let quillNew, quillEdit;

document.addEventListener("DOMContentLoaded", () => {

    quillNew = new Quill('#noteEditor', {
        theme: 'snow',             // light clean theme
        placeholder: 'Escribe tu nota...',
        modules: {
            toolbar: [
                [{ header: [1, 2, false] }],
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['link', 'blockquote', 'code-block'],
                ['clean']
            ]
        }
    });

    quillEdit = new Quill('#editNoteEditor', {
        theme: 'snow',
        placeholder: 'Editar contenido...',
        modules: {
            toolbar: [
                [{ header: [1, 2, false] }],
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['link', 'blockquote', 'code-block'],
                ['clean']
            ]
        }
    });
});


// ======================================================
//  Cargar notas del usuario
// ======================================================
async function loadNotes() {
    const authToken = localStorage.getItem("token");

    if (!userId || !authToken) {
        window.location.href = "./Login.html";
        return;
    }

    notesGrid.innerHTML = `<p style="color:white;">Cargando...</p>`;

    try {
        const res = await fetch(`${apiNotesUrl}?User_id=${userId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${authToken}`,  // ✔️ CORRECTÍSIMO
                "Content-Type": "application/json"
            }
        });

        if (res.status === 401 || res.status === 403) {
            alert("Sesión expirada o token inválido. Inicia sesión de nuevo.");
            window.location.href = "./Login.html";
            return;
        }

        if (!res.ok) throw new Error("Error cargando notas");

        const notes = await res.json();

        if (notes.length === 0) {
            notesGrid.innerHTML = `<p class="text-center" style="color:#ccc;">No tienes notas aún</p>`;
            return;
        }

        notesGrid.innerHTML = "";

        // DESCIFRAR TODAS LAS NOTAS
        for (const note of notes) {

            const tituloDescifrado = await decryptData(note.titulo);
            const contenidoDescifrado = await decryptData(note.contenido);

            const card = document.createElement("div");
            card.classList.add("note-card");

            card.innerHTML = `
                <div class="note-title">${tituloDescifrado}</div>
                <div class="note-content">${contenidoDescifrado}</div>

                <div class="note-actions">
                    <button class="note-btn btnEdit" data-id="${note._id}">
                        <i class="fa-solid fa-pen-to-square"></i> Editar
                    </button>

                    <button class="note-btn btnDelete" data-id="${note._id}">
                        <i class="fa-solid fa-trash"></i> Borrar
                    </button>
                </div>
            `;

            notesGrid.appendChild(card);
        }

        activateButtons();

    } catch (err) {
        console.error(err);
        notesGrid.innerHTML = `<p style="color:red;">Error al cargar notas</p>`;
    }
}

// ======================================================
//  Guardar nueva nota
// ======================================================
async function createNote() {
    const titulo = newTitle.value.trim();
    const contenido = quillNew.root.innerHTML.trim();

    if (!titulo || !contenido) {
        alert("Completa todos los campos");
        return;
    }

    try {
        const tituloCifrado = await encryptData(titulo);
        const contenidoCifrado = await encryptData(contenido);

        const res = await fetch(apiNotesUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                User_id: userId,
                titulo: tituloCifrado,
                contenido: contenidoCifrado
            })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error || "Error al guardar nota");
            return;
        }

        // limpiar solo el título
        newTitle.value = "";

        // limpiar el editor quill
        quillNew.root.innerHTML = "";

        bootstrap.Modal
            .getInstance(document.getElementById("modalNewNote"))
            .hide();

        loadNotes();

    } catch (err) {
        console.error("Error:", err);
        alert("Error al guardar la nota");
    }
}

// ======================================================
//  Abrir modal para editar nota
// ======================================================
function openEditModal(noteId) {
    editingNoteId = noteId;

    const card = document.querySelector(`button[data-id="${noteId}"]`).closest(".note-card");

    editTitle.value = card.querySelector(".note-title").textContent;

    // ⬇ cargar contenido HTML al editor
    quillEdit.root.innerHTML = card.querySelector(".note-content").innerHTML;

    new bootstrap.Modal(document.getElementById("modalEditNote")).show();
}

// ======================================================
// Editar nota
// ======================================================
async function updateNote() {
    if (!editingNoteId) return;

    try {
        // Título (sigue igual)
        const tituloCifrado = await encryptData(editTitle.value);

        // ⬇ Ahora el contenido viene del editor enriquecido
        const contenidoHTML = quillEdit.root.innerHTML.trim();
        const contenidoCifrado = await encryptData(contenidoHTML);

        const res = await fetch(`${apiNotesUrl}/${editingNoteId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                titulo: tituloCifrado,
                contenido: contenidoCifrado
            })
        });

        if (!res.ok) throw new Error("Error actualizando nota");

        // Cerrar modal
        bootstrap.Modal.getInstance(document.getElementById("modalEditNote")).hide();

        // Recargar notas
        loadNotes();

    } catch (err) {
        console.error(err);
        alert("Error al actualizar nota");
    }
}


// ======================================================
// Eliminar nota
// ======================================================
function openDeleteModal(noteId) {
    deletingNoteId = noteId;
    new bootstrap.Modal(document.getElementById("modalDeleteNote")).show();
}

async function deleteNote() {
    if (!deletingNoteId) return;

    try {
        const res = await fetch(`${apiNotesUrl}/${deletingNoteId}`, {
            method: "DELETE"
        });

        if (!res.ok) throw new Error("Error al eliminar nota");

        bootstrap.Modal.getInstance(document.getElementById("modalDeleteNote")).hide();

        loadNotes();

    } catch (err) {
        console.error(err);
        alert("Error al eliminar nota");
    }
}

// ======================================================
// Activar botones de Edit y Delete
// ======================================================
function activateButtons() {
    document.querySelectorAll(".btnEdit").forEach(btn => {
        btn.addEventListener("click", () => openEditModal(btn.dataset.id));
    });

    document.querySelectorAll(".btnDelete").forEach(btn => {
        btn.addEventListener("click", () => openDeleteModal(btn.dataset.id));
    });
}

// ======================================================
// Inicializar
// ======================================================
document.addEventListener("DOMContentLoaded", () => {
    loadNotes();

    document.querySelector("#modalNewNote button.btn-primary")
        .addEventListener("click", createNote);

    document.querySelector("#modalEditNote button.btn-primary")
        .addEventListener("click", updateNote);

    document.querySelector("#modalDeleteNote button.btn-primary")
        .addEventListener("click", deleteNote);
});