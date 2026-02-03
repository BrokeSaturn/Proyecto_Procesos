// usuario.js - Lógica específica para usuarios

// =========================================================
// MODELO DE DATOS: AULAS Y RESERVAS (SIMULACION)
// =========================================================

// Array de aulas disponibles en ESPE
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

// Array de reservas simuladas
const Reservas_ESPE = [];

// Identificador incremental para reservas nuevas
let contadorReservas = 1;

// Usuario actual simulado (se puede cambiar desde el input)
let USUARIO_ACTUAL = "L20012345";

// Objeto temporal para almacenar los datos del slot a reservar
let reservaPendiente = null;

// Rango de horas para la matriz horaria
const HORAS_DISPONIBLES = generarHorasRango(7, 20); // de 07:00 a 20:00

// Estado actual de la vista de disponibilidad: "hoy", "manana" o "semana"
let estadoVistaActual = "hoy";

// =========================================================
// FUNCIONES DE UTILIDAD GENERALES
// =========================================================

function generarHorasRango(horaInicio, horaFin) {
    const horas = [];
    for (let h = horaInicio; h <= horaFin; h++) {
        const hh = h.toString().padStart(2, "0");
        horas.push(hh + ":00");
    }
    return horas;
}

function obtenerInicioSemana(fechaBase) {
    const fecha = new Date(fechaBase);
    const diaSemana = fecha.getDay(); // 0 domingo, 1 lunes, ... 6 sabado
    const diferencia = (diaSemana === 0 ? -6 : 1) - diaSemana; // ajustar a lunes
    fecha.setDate(fecha.getDate() + diferencia);
    return fecha;
}

function sumarDias(fecha, dias) {
    const nueva = new Date(fecha);
    nueva.setDate(nueva.getDate() + dias);
    return nueva;
}

function formatearFechaISO(fecha) {
    const anyo = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, "0");
    const dia = fecha.getDate().toString().padStart(2, "0");
    return anyo + "-" + mes + "-" + dia;
}

function nombreDia(fecha) {
    const dias = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
    return dias[fecha.getDay()];
}

function buscarReservaPorId(id_reserva) {
    return Reservas_ESPE.find(r => r.id_reserva === id_reserva);
}

function generarIdReserva() {
    contadorReservas += 1;
    return contadorReservas;
}

function existeReservaEnSlot(id_aula, fechaISO, horaInicio) {
    return Reservas_ESPE.some(r =>
        r.id_aula === id_aula &&
        r.fecha === fechaISO &&
        r.hora_inicio === horaInicio &&
        r.estado !== "Cancelada"
    );
}

function obtenerReservaSlot(id_aula, fechaISO, horaInicio) {
    return Reservas_ESPE.find(r =>
        r.id_aula === id_aula &&
        r.fecha === fechaISO &&
        r.hora_inicio === horaInicio &&
        r.estado !== "Cancelada"
    );
}

function calcularHoraFin(horaInicio) {
    const [hh, mm] = horaInicio.split(":").map(Number);
    let nuevaHora = hh + 1;
    if (nuevaHora > 23) nuevaHora = 23;
    return nuevaHora.toString().padStart(2, "0") + ":" + mm.toString().padStart(2, "0");
}

// =========================================================
// SIMULACION: RESERVAS INICIALES PARA LA SEMANA ACTUAL
// =========================================================

function inicializarReservasSimuladas() {
    const hoy = new Date();
    const inicioSemana = obtenerInicioSemana(hoy);

    const lunes = formatearFechaISO(inicioSemana);
    const martes = formatearFechaISO(sumarDias(inicioSemana, 1));
    const miercoles = formatearFechaISO(sumarDias(inicioSemana, 2));
    const jueves = formatearFechaISO(sumarDias(inicioSemana, 3));
    const viernes = formatearFechaISO(sumarDias(inicioSemana, 4));

    const reservasIniciales = [
        {
            id_reserva: contadorReservas++,
            id_aula: "A-1",
            usuario_id: "L20012345",
            fecha: lunes,
            hora_inicio: "09:00",
            hora_fin: "10:00",
            estado: "Activa",
            reportes: 0
        },
        {
            id_reserva: contadorReservas++,
            id_aula: "A-2",
            usuario_id: "L20067890",
            fecha: lunes,
            hora_inicio: "11:00",
            hora_fin: "12:00",
            estado: "Check-in",
            reportes: 0
        },
        {
            id_reserva: contadorReservas++,
            id_aula: "A-3",
            usuario_id: "L20111111",
            fecha: martes,
            hora_inicio: "15:00",
            hora_fin: "16:00",
            estado: "Activa",
            reportes: 1
        },
        {
            id_reserva: contadorReservas++,
            id_aula: "A-1",
            usuario_id: "L20012345",
            fecha: miercoles,
            hora_inicio: "08:00",
            hora_fin: "09:00",
            estado: "Activa",
            reportes: 0
        },
        {
            id_reserva: contadorReservas++,
            id_aula: "A-2",
            usuario_id: "L20099999",
            fecha: viernes,
            hora_inicio: "14:00",
            hora_fin: "15:00",
            estado: "Cancelada",
            reportes: 0
        }
    ];

    reservasIniciales.forEach(r => Reservas_ESPE.push(r));
}

// =========================================================
// HU 1 y 4: BUSCAR Y VERIFICAR OCUPACION
// =========================================================

function renderizarDisponibilidad(diaFiltro) {
    const contenedor = document.getElementById("grid-disponibilidad");
    const textoFiltro = document.getElementById("texto-filtro-actual");
    contenedor.innerHTML = "";

    const hoy = new Date();
    let fechasMostrar = [];

    if (diaFiltro === "hoy") {
        const fechaISO = formatearFechaISO(hoy);
        fechasMostrar.push({ fecha: new Date(hoy), fechaISO });
        textoFiltro.textContent = "Vista: Hoy (" + fechaISO + ")";
    } else if (diaFiltro === "manana") {
        const manana = sumarDias(hoy, 1);
        const fechaISO = formatearFechaISO(manana);
        fechasMostrar.push({ fecha: manana, fechaISO });
        textoFiltro.textContent = "Vista: Manana (" + fechaISO + ")";
    } else if (diaFiltro === "semana") {
        const inicioSemana = obtenerInicioSemana(hoy);
        for (let i = 0; i < 5; i++) {
            const fecha = sumarDias(inicioSemana, i);
            const fechaISO = formatearFechaISO(fecha);
            fechasMostrar.push({ fecha, fechaISO });
        }
        textoFiltro.textContent = "Vista: Semana completa (Lunes a Viernes)";
    }

    fechasMostrar.forEach(item => {
        const bloque = document.createElement("div");
        bloque.classList.add("dia-bloque");

        const header = document.createElement("div");
        header.classList.add("dia-bloque-header");

        const h3 = document.createElement("h3");
        h3.textContent = nombreDia(item.fecha);

        const spanFecha = document.createElement("span");
        spanFecha.textContent = item.fechaISO;

        header.appendChild(h3);
        header.appendChild(spanFecha);

        const tabla = crearTablaDisponibilidadParaFecha(item.fechaISO);

        bloque.appendChild(header);
        bloque.appendChild(tabla);
        contenedor.appendChild(bloque);
    });
}

function crearTablaDisponibilidadParaFecha(fechaISO) {
    const tabla = document.createElement("div");
    tabla.classList.add("tabla-disponibilidad");

    // Fila de encabezados
    const celdaHoraHeader = document.createElement("div");
    celdaHoraHeader.classList.add("celda", "celda-header");
    celdaHoraHeader.textContent = "Hora";
    tabla.appendChild(celdaHoraHeader);

    Aulas_ESPE.forEach(aula => {
        const celdaHeaderAula = document.createElement("div");
        celdaHeaderAula.classList.add("celda", "celda-header");
        celdaHeaderAula.textContent = aula.id;
        tabla.appendChild(celdaHeaderAula);
    });

    // Filas de horas
    HORAS_DISPONIBLES.forEach(hora => {
        // Columna de hora
        const celdaHora = document.createElement("div");
        celdaHora.classList.add("celda", "celda-hora");
        celdaHora.textContent = hora;
        tabla.appendChild(celdaHora);

        // Columnas de aulas
        Aulas_ESPE.forEach(aula => {
            const celdaSlot = document.createElement("div");
            celdaSlot.classList.add("celda", "celda-slot");

            const reservaSlot = obtenerReservaSlot(aula.id, fechaISO, hora);
            let texto = "";
            let puedeReservar = false;

            if (aula.estado === "Mantenimiento") {
                celdaSlot.classList.add("mantenimiento");
                texto = "Mantenimiento";
            } else if (reservaSlot) {
                if (reservaSlot.estado === "Activa") {
                    celdaSlot.classList.add("ocupado");
                    texto = "Reservado";
                } else if (reservaSlot.estado === "Check-in") {
                    celdaSlot.classList.add("checkin");
                    texto = "Check-in";
                } else {
                    celdaSlot.classList.add("disponible");
                    texto = "Disponible";
                    puedeReservar = true;
                }
            } else {
                celdaSlot.classList.add("disponible");
                texto = "Disponible";
                puedeReservar = true;
            }

            celdaSlot.textContent = texto;

            if (puedeReservar) {
                celdaSlot.addEventListener("click", function () {
                    abrirModalReserva(aula.id, hora, fechaISO);
                });
            }

            tabla.appendChild(celdaSlot);
        });
    });

    return tabla;
}

// =========================================================
// HU 2: REALIZAR UNA RESERVA
// =========================================================

function abrirModalReserva(id_aula, hora, fechaISO) {
    const overlay = document.getElementById("overlay-modal");
    const modal = document.getElementById("modal-reserva");
    const inputAula = document.getElementById("input-aula");
    const inputFecha = document.getElementById("input-fecha");
    const inputHoraInicio = document.getElementById("input-hora-inicio");
    const inputHoraFin = document.getElementById("input-hora-fin");
    const inputUsuario = document.getElementById("input-usuario");

    reservaPendiente = {
        id_aula: id_aula,
        fecha: fechaISO,
        hora_inicio: hora,
        hora_fin: calcularHoraFin(hora)
    };

    inputAula.value = id_aula;
    inputFecha.value = fechaISO;
    inputHoraInicio.value = hora;
    inputHoraFin.value = reservaPendiente.hora_fin;
    inputUsuario.value = USUARIO_ACTUAL || "";

    overlay.classList.remove("oculto");
    modal.classList.remove("oculto");
}

function cerrarModalReserva() {
    const overlay = document.getElementById("overlay-modal");
    const modal = document.getElementById("modal-reserva");
    overlay.classList.add("oculto");
    modal.classList.add("oculto");
    reservaPendiente = null;
}

function confirmarReserva() {
    if (!reservaPendiente) {
        alert("No hay datos de reserva pendientes.");
        return;
    }

    const inputUsuario = document.getElementById("input-usuario");
    const usuarioId = inputUsuario.value.trim();

    if (!usuarioId) {
        alert("Por favor ingrese el ID de usuario ESPE.");
        return;
    }

    const { id_aula, fecha, hora_inicio, hora_fin } = reservaPendiente;

    if (existeReservaEnSlot(id_aula, fecha, hora_inicio)) {
        alert("El slot seleccionado ya se encuentra reservado.");
        return;
    }

    const nuevaReserva = {
        id_reserva: generarIdReserva(),
        id_aula: id_aula,
        usuario_id: usuarioId,
        fecha: fecha,
        hora_inicio: hora_inicio,
        hora_fin: hora_fin,
        estado: "Activa",
        reportes: 0
    };

    Reservas_ESPE.push(nuevaReserva);
    USUARIO_ACTUAL = usuarioId;

    cerrarModalReserva();
    renderizarDisponibilidad(estadoVistaActual);
    renderizarReservasUsuario(USUARIO_ACTUAL);
}

// =========================================================
// HU 3: GESTIONAR MIS RESERVAS
// =========================================================

function renderizarReservasUsuario(usuario_id) {
    const contenedor = document.getElementById("lista-reservas-usuario");
    contenedor.innerHTML = "";

    if (!usuario_id) {
        const p = document.createElement("p");
        p.textContent = "Ingrese un ID de usuario ESPE para ver sus reservas.";
        contenedor.appendChild(p);
        return;
    }

    const reservasUsuario = Reservas_ESPE.filter(r => r.usuario_id === usuario_id);

    if (reservasUsuario.length === 0) {
        const p = document.createElement("p");
        p.textContent = "No se encontraron reservas para el usuario " + usuario_id + ".";
        contenedor.appendChild(p);
        return;
    }

    reservasUsuario.forEach(reserva => {
        const card = document.createElement("article");
        card.classList.add("reserva-card");

        const header = document.createElement("div");
        header.classList.add("reserva-card-header");

        const titulo = document.createElement("h4");
        titulo.textContent = "Reserva #" + reserva.id_reserva + " - " + reserva.id_aula;

        const badgeEstado = document.createElement("span");
        badgeEstado.classList.add("badge");
        if (reserva.estado === "Activa") {
            badgeEstado.classList.add("badge-ocupado");
        } else if (reserva.estado === "Check-in") {
            badgeEstado.classList.add("badge-checkin");
        } else if (reserva.estado === "Cancelada") {
            badgeEstado.classList.add("badge-mantenimiento");
        }
        badgeEstado.textContent = reserva.estado;

        header.appendChild(titulo);
        header.appendChild(badgeEstado);

        const body = document.createElement("div");
        body.classList.add("reserva-card-body");
        body.innerHTML = ""
            + "<div>Fecha: <strong>" + reserva.fecha + "</strong></div>"
            + "<div>Horario: <strong>" + reserva.hora_inicio + " - " + reserva.hora_fin + "</strong></div>"
            + "<div>Reportes: <strong>" + (reserva.reportes || 0) + "</strong></div>";

        const footer = document.createElement("div");
        footer.classList.add("reserva-card-footer");

        if (reserva.estado === "Activa") {
            const btnCancelar = document.createElement("button");
            btnCancelar.classList.add("btn-reserva", "btn-reserva-cancelar");
            btnCancelar.textContent = "Cancelar";
            btnCancelar.addEventListener("click", function () {
                cancelarReserva(reserva.id_reserva);
            });
            footer.appendChild(btnCancelar);
        }

        if (reserva.estado === "Activa") {
            const btnCheckIn = document.createElement("button");
            btnCheckIn.classList.add("btn-reserva", "btn-reserva-checkin");
            btnCheckIn.textContent = "Check-in";
            btnCheckIn.addEventListener("click", function () {
                simularCheckIn(reserva.id_reserva, "QR-" + reserva.id_reserva);
            });
            footer.appendChild(btnCheckIn);
        }

        if (reserva.estado === "Activa" || reserva.estado === "Check-in") {
            const btnReporte = document.createElement("button");
            btnReporte.classList.add("btn-reserva", "btn-reserva-reporte");
            btnReporte.textContent = "Reportar uso indebido";
            btnReporte.addEventListener("click", function () {
                const motivo = prompt("Ingrese el motivo del reporte de uso indebido:");
                if (motivo && motivo.trim() !== "") {
                    reportarUsoIndebido(reserva.id_reserva, motivo.trim());
                    renderizarReservasUsuario(usuario_id);
                }
            });
            footer.appendChild(btnReporte);
        }

        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(footer);
        contenedor.appendChild(card);
    });
}

function cancelarReserva(id_reserva) {
    const reserva = buscarReservaPorId(id_reserva);
    if (!reserva) {
        alert("No se encontro la reserva indicada.");
        return;
    }
    if (reserva.estado === "Cancelada") {
        alert("La reserva ya esta cancelada.");
        return;
    }
    reserva.estado = "Cancelada";

    renderizarDisponibilidad(estadoVistaActual);
    renderizarReservasUsuario(USUARIO_ACTUAL);
}

// =========================================================
// HU 6: EXPERIENCIA DE CHECK-IN
// =========================================================

function simularCheckIn(id_reserva, codigo_qr) {
    const reserva = buscarReservaPorId(id_reserva);
    if (!reserva) {
        alert("Reserva no encontrada para check-in.");
        return;
    }
    if (reserva.estado === "Cancelada") {
        alert("No se puede hacer check-in en una reserva cancelada.");
        return;
    }
    if (reserva.estado === "Check-in") {
        alert("La reserva ya tiene check-in realizado.");
        return;
    }

    reserva.estado = "Check-in";

    renderizarDisponibilidad(estadoVistaActual);
    renderizarReservasUsuario(reserva.usuario_id);
}

// =========================================================
// HU 7: REPORTAR USO INDEBIDO (PERSONAL)
// =========================================================

function reportarUsoIndebido(id_reserva, motivo) {
    const reserva = buscarReservaPorId(id_reserva);
    if (!reserva) {
        alert("Reserva no encontrada para reporte.");
        return;
    }

    if (typeof reserva.reportes !== "number") {
        reserva.reportes = 0;
    }
    reserva.reportes += 1;

    if (!Array.isArray(reserva.motivos_reportes)) {
        reserva.motivos_reportes = [];
    }
    reserva.motivos_reportes.push({
        fecha_reporte: formatearFechaISO(new Date()),
        motivo: motivo
    });

    alert("Reporte registrado para la reserva #" + id_reserva + ".");
}

// =========================================================
// GESTION DE VISTAS Y EVENTOS DE INTERFAZ
// =========================================================

function cambiarSeccion(idSeccion) {
    const secciones = document.querySelectorAll(".seccion");
    secciones.forEach(sec => {
        if (sec.id === idSeccion) {
            sec.classList.remove("seccion-oculta");
            sec.classList.add("seccion-activa");
        } else {
            sec.classList.remove("seccion-activa");
            sec.classList.add("seccion-oculta");
        }
    });
}

function configurarEventosUI() {
    const btnHoy = document.getElementById("btn-hoy");
    const btnManana = document.getElementById("btn-manana");
    const btnSemana = document.getElementById("btn-semana");
    const btnMisReservas = document.getElementById("btn-mis-reservas");
    const btnConfirmarReserva = document.getElementById("btn-confirmar-reserva");
    const btnCerrarModal = document.getElementById("btn-cerrar-modal");
    const btnCancelarModal = document.getElementById("btn-cancelar-modal");
    const overlayModal = document.getElementById("overlay-modal");
    const btnCargarReservas = document.getElementById("btn-cargar-reservas");
    const inputUsuarioReservas = document.getElementById("input-usuario-reservas");
    const btnLogout = document.getElementById("btn-logout");

    btnHoy.addEventListener("click", function () {
        estadoVistaActual = "hoy";
        cambiarSeccion("seccion-disponibilidad");
        renderizarDisponibilidad("hoy");
    });

    btnManana.addEventListener("click", function () {
        estadoVistaActual = "manana";
        cambiarSeccion("seccion-disponibilidad");
        renderizarDisponibilidad("manana");
    });

    btnSemana.addEventListener("click", function () {
        estadoVistaActual = "semana";
        cambiarSeccion("seccion-disponibilidad");
        renderizarDisponibilidad("semana");
    });

    btnMisReservas.addEventListener("click", function () {
        cambiarSeccion("seccion-reservas");
        if (USUARIO_ACTUAL) {
            inputUsuarioReservas.value = USUARIO_ACTUAL;
        }
        renderizarReservasUsuario(USUARIO_ACTUAL);
    });

    btnConfirmarReserva.addEventListener("click", function () {
        confirmarReserva();
    });

    btnCerrarModal.addEventListener("click", function () {
        cerrarModalReserva();
    });

    btnCancelarModal.addEventListener("click", function () {
        cerrarModalReserva();
    });

    overlayModal.addEventListener("click", function () {
        cerrarModalReserva();
    });

    btnCargarReservas.addEventListener("click", function () {
        const usuarioId = inputUsuarioReservas.value.trim();
        USUARIO_ACTUAL = usuarioId || USUARIO_ACTUAL;
        renderizarReservasUsuario(usuarioId);
    });

    btnLogout.addEventListener("click", function () {
        localStorage.removeItem('usuario_nombre');
        localStorage.removeItem('usuario_rol');
        window.location.href = '../index.html';
    });
}

// =========================================================
// INICIALIZACION DEL USUARIO
// =========================================================

function inicializarUsuario() {
    const nombre = localStorage.getItem('usuario_nombre');
    const rol = localStorage.getItem('usuario_rol');
    
    // Verificar que esté logueado como usuario
    if (!nombre || rol !== 'usuario') {
        window.location.href = '../login/login.html';
        return;
    }
    
    // Mostrar información del usuario
    document.getElementById('nombre-usuario').textContent = nombre;
    
    // Crear avatar con primera letra
    const avatar = document.getElementById('avatar-usuario');
    avatar.textContent = nombre.charAt(0).toUpperCase();
    
    // Ocultar botón de admin
    const btnAdmin = document.getElementById('btn-admin');
    if (btnAdmin) {
        btnAdmin.style.display = 'none';
    }
}

// =========================================================
// INICIALIZACION GENERAL DEL SISTEMA
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    inicializarUsuario();
    inicializarReservasSimuladas();
    configurarEventosUI();
    renderizarDisponibilidad("hoy");
});