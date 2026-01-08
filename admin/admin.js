// admin.js - Lógica específica para administradores

// =========================================================
// MODELO DE DATOS: AULAS (SIMULACION)
// =========================================================

// Array de aulas disponibles en ESPE (Mismo que en usuario.js)
const Aulas_ESPE = [
    {
        id: "A-1",
        nombre: "Aula A-1",
        capacidad: 10,
        estado: "Disponible"
    },
    {
        id: "A-2",
        nombre: "Aula A-2",
        capacidad: 8,
        estado: "Disponible"
    },
    {
        id: "A-3",
        nombre: "Aula A-3",
        capacidad: 12,
        estado: "Disponible"
    },
    {
        id: "A-4",
        nombre: "Aula A-4",
        capacidad: 6,
        estado: "Mantenimiento"
    }
];

// =========================================================
// FUNCIONES DE UTILIDAD
// =========================================================

/**
 * Formatea una fecha a AAAA-MM-DD.
 */
function formatearFechaISO(fecha) {
    const anyo = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, "0");
    const dia = fecha.getDate().toString().padStart(2, "0");
    return anyo + "-" + mes + "-" + dia;
}

// =========================================================
// PANEL ADMINISTRADOR DE AULAS
// =========================================================

/**
 * Renderiza el panel administrativo para cambiar el estado de las aulas.
 */
function panelAdminAulas() {
    const contenedor = document.getElementById("panel-admin-contenido");
    contenedor.innerHTML = "";

    Aulas_ESPE.forEach(aula => {
        const card = document.createElement("article");
        card.classList.add("aula-card");

        const header = document.createElement("div");
        header.classList.add("aula-card-header");

        const titulo = document.createElement("h3");
        titulo.textContent = aula.nombre;

        const badgeEstado = document.createElement("span");
        badgeEstado.classList.add("badge");
        if (aula.estado === "Disponible") {
            badgeEstado.classList.add("badge-disponible");
        } else {
            badgeEstado.classList.add("badge-mantenimiento");
        }
        badgeEstado.textContent = aula.estado;

        header.appendChild(titulo);
        header.appendChild(badgeEstado);

        const body = document.createElement("div");
        body.classList.add("aula-card-body");
        body.innerHTML = ""
            + "<div>ID: <strong>" + aula.id + "</strong></div>"
            + "<div>Capacidad: <strong>" + aula.capacidad + " personas</strong></div>";

        const btnToggle = document.createElement("button");
        btnToggle.classList.add("btn-primario");
        btnToggle.textContent = aula.estado === "Disponible"
            ? "Pasar a mantenimiento"
            : "Marcar como disponible";

        btnToggle.addEventListener("click", function () {
            if (aula.estado === "Disponible") {
                aula.estado = "Mantenimiento";
            } else {
                aula.estado = "Disponible";
            }
            panelAdminAulas();
        });

        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(btnToggle);

        contenedor.appendChild(card);
    });
}

// =========================================================
// INICIALIZACION DEL ADMINISTRADOR
// =========================================================

function inicializarAdmin() {
    const nombre = localStorage.getItem('usuario_nombre');
    const rol = localStorage.getItem('usuario_rol');
    
    // Verificar que esté logueado como admin
    if (!nombre || rol !== 'admin') {
        window.location.href = '../index.html';
        return;
    }
    
    // Mostrar información del admin
    document.getElementById('nombre-usuario').textContent = nombre;
    
    // Crear avatar con primera letra
    const avatar = document.getElementById('avatar-usuario');
    avatar.textContent = nombre.charAt(0).toUpperCase();
    
    // Inicializar panel
    panelAdminAulas();
}

// =========================================================
// CONFIGURACION DE EVENTOS
// =========================================================

function configurarEventosAdmin() {
    const btnLogout = document.getElementById('btn-logout');

    btnLogout.addEventListener('click', function () {
        localStorage.removeItem('usuario_nombre');
        localStorage.removeItem('usuario_rol');
        window.location.href = '../index.html';
    });
}

// =========================================================
// INICIALIZACION GENERAL DEL SISTEMA
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    inicializarAdmin();
    configurarEventosAdmin();
});