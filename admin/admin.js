// admin.js - Logica especifica para administradores

// =========================================================
// MODELO DE DATOS: AULAS (SIMULACION)
// =========================================================

// Array de aulas disponibles en ESPE
let Aulas_ESPE = [
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
// MODELO DE DATOS: RESERVAS
// =========================================================

const Reservas_ESPE = [];
let contadorReservas = 1;

// =========================================================
// MODELO DE DATOS: REPORTES
// =========================================================

let Reportes = [
    {
        id: 1,
        usuario: "L20012345",
        fecha: "15/03/2024 14:30",
        aula: "Aula 203",
        mensaje: "El aula se encuentra sucia con restos de comida en las mesas. Se requiere limpieza urgente.",
        estado: "pendiente"
    },
    {
        id: 2,
        usuario: "L20018765",
        fecha: "14/03/2024 10:15",
        aula: "Aula 105",
        mensaje: "El proyector no funciona correctamente. Ya se realizo el mantenimiento necesario.",
        estado: "resuelto"
    }
];

// =========================================================
// CONFIGURACIONES
// =========================================================

const HORAS_DISPONIBLES = generarHorasRango(7, 20); // de 07:00 a 20:00
let estadoVistaActual = "hoy";

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

/**
 * Genera un rango de horas.
 */
function generarHorasRango(horaInicio, horaFin) {
    const horas = [];
    for (let h = horaInicio; h <= horaFin; h++) {
        const hh = h.toString().padStart(2, "0");
        horas.push(hh + ":00");
    }
    return horas;
}

/**
 * Obtiene el inicio de la semana (lunes).
 */
function obtenerInicioSemana(fechaBase) {
    const fecha = new Date(fechaBase);
    const diaSemana = fecha.getDay();
    const diferencia = (diaSemana === 0 ? -6 : 1) - diaSemana;
    fecha.setDate(fecha.getDate() + diferencia);
    return fecha;
}

/**
 * Suma dias a una fecha.
 */
function sumarDias(fecha, dias) {
    const nueva = new Date(fecha);
    nueva.setDate(nueva.getDate() + dias);
    return nueva;
}

/**
 * Devuelve el nombre del dia en espanol.
 */
function nombreDia(fecha) {
    const dias = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
    return dias[fecha.getDay()];
}

/**
 * Crea un ID unico para nuevas aulas.
 */
function generarIdAula() {
    const ultimoId = Aulas_ESPE.reduce((max, aula) => {
        const num = parseInt(aula.id.split('-')[1]);
        return num > max ? num : max;
    }, 0);
    return `A-${ultimoId + 1}`;
}

/**
 * Actualiza las estadisticas de reportes.
 */
function actualizarEstadisticasReportes() {
    const total = Reportes.length;
    const pendientes = Reportes.filter(r => r.estado === "pendiente").length;
    const resueltos = Reportes.filter(r => r.estado === "resuelto").length;

    const totalElement = document.getElementById('total-reportes');
    const pendientesElement = document.getElementById('reportes-pendientes');
    const resueltosElement = document.getElementById('reportes-resueltos');
    
    if (totalElement) totalElement.textContent = total;
    if (pendientesElement) pendientesElement.textContent = pendientes;
    if (resueltosElement) resueltosElement.textContent = resueltos;
}

/**
 * Busca una reserva en un slot especifico.
 */
function obtenerReservaSlot(id_aula, fechaISO, horaInicio) {
    return Reservas_ESPE.find(r =>
        r.id_aula === id_aula &&
        r.fecha === fechaISO &&
        r.hora_inicio === horaInicio &&
        r.estado !== "Cancelada"
    );
}

// =========================================================
// FUNCION PARA CAMBIAR ESTADO DE AULA (MANTENIMIENTO)
// =========================================================

/**
 * Cambia el estado de un aula (Disponible <-> Mantenimiento)
 */
function cambiarEstadoAula(idAula) {
    const aula = Aulas_ESPE.find(a => a.id === idAula);
    if (!aula) return;
    
    // Confirmar accion
    const nuevoEstado = aula.estado === "Disponible" ? "Mantenimiento" : "Disponible";
    const confirmacion = confirm("Esta seguro de cambiar el aula " + aula.nombre + " a estado: " + nuevoEstado + "?");
    
    if (!confirmacion) return;
    
    // Cambiar estado
    aula.estado = nuevoEstado;
    
    // Actualizar todas las vistas
    actualizarVistas();
    
    // Mostrar mensaje
    alert("Aula " + aula.nombre + " cambiada a " + nuevoEstado);
}

/**
 * Actualiza todas las vistas que dependen de las aulas
 */
function actualizarVistas() {
    // 1. Actualizar tabla de disponibilidad
    renderizarDisponibilidad(estadoVistaActual);
    
    // 2. Actualizar panel de admin
    panelAdminAulas();
    
    // 3. Actualizar panel de creacion (si esta visible)
    const seccionCrear = document.getElementById('seccion-crear-aula');
    if (seccionCrear && !seccionCrear.classList.contains('seccion-oculta')) {
        panelAdminAulas(); // Esto actualiza la lista en creacion tambien
    }
}

// =========================================================
// TABLA DE DISPONIBILIDAD (COMO EN USUARIO)
// =========================================================

/**
 * Renderiza la disponibilidad segun el filtro seleccionado.
 */
function renderizarDisponibilidad(diaFiltro) {
    const contenedor = document.getElementById("grid-disponibilidad");
    const textoFiltro = document.getElementById("texto-filtro-actual");
    
    if (!contenedor) return;
    
    contenedor.innerHTML = "";

    const hoy = new Date();
    let fechasMostrar = [];

    if (diaFiltro === "hoy") {
        const fechaISO = formatearFechaISO(hoy);
        fechasMostrar.push({ fecha: new Date(hoy), fechaISO });
        if (textoFiltro) textoFiltro.textContent = "Vista: Hoy (" + fechaISO + ")";
    } else if (diaFiltro === "manana") {
        const manana = sumarDias(hoy, 1);
        const fechaISO = formatearFechaISO(manana);
        fechasMostrar.push({ fecha: manana, fechaISO });
        if (textoFiltro) textoFiltro.textContent = "Vista: Manana (" + fechaISO + ")";
    } else if (diaFiltro === "semana") {
        const inicioSemana = obtenerInicioSemana(hoy);
        for (let i = 0; i < 5; i++) {
            const fecha = sumarDias(inicioSemana, i);
            const fechaISO = formatearFechaISO(fecha);
            fechasMostrar.push({ fecha, fechaISO });
        }
        if (textoFiltro) textoFiltro.textContent = "Vista: Semana completa (Lunes a Viernes)";
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

/**
 * Crea la tabla de disponibilidad para una fecha especifica.
 */
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
                }
            } else {
                celdaSlot.classList.add("disponible");
                texto = "Disponible";
            }

            celdaSlot.textContent = texto;
            tabla.appendChild(celdaSlot);
        });
    });

    return tabla;
}

// =========================================================
// PANEL ADMINISTRADOR DE AULAS (MEJORADO)
// =========================================================

/**
 * Renderiza el panel administrativo para cambiar el estado de las aulas.
 */
function panelAdminAulas() {
    const contenedorCrear = document.getElementById("panel-admin-contenido");
    const contenedorPanel = document.getElementById("panel-admin-aulas");
    
    // Actualizar ambos contenedores si existen
    [contenedorCrear, contenedorPanel].forEach(contenedor => {
        if (!contenedor) return;
        
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
                + "<div>Capacidad: <strong>" + aula.capacidad + " personas</strong></div>"
                + (aula.equipamiento ? "<div>Equipamiento: <strong>" + aula.equipamiento + "</strong></div>" : "");

            const btnToggle = document.createElement("button");
            btnToggle.classList.add("btn-primario");
            btnToggle.textContent = aula.estado === "Disponible"
                ? "Poner en Mantenimiento"
                : "Quitar Mantenimiento";
            
            // Usar funcion centralizada para cambiar estado
            btnToggle.addEventListener("click", () => cambiarEstadoAula(aula.id));

            // Boton adicional para eliminar aula (solo admin)
            const btnEliminar = document.createElement("button");
            btnEliminar.classList.add("btn-secundario");
            btnEliminar.textContent = "Eliminar";
            btnEliminar.style.marginLeft = "10px";
            
            btnEliminar.addEventListener("click", function() {
                if (confirm("Esta seguro de eliminar el aula " + aula.nombre + "?")) {
                    eliminarAula(aula.id);
                }
            });

            const footer = document.createElement("div");
            footer.style.display = "flex";
            footer.style.gap = "10px";
            footer.style.marginTop = "15px";
            
            footer.appendChild(btnToggle);
            footer.appendChild(btnEliminar);

            card.appendChild(header);
            card.appendChild(body);
            card.appendChild(footer);

            contenedor.appendChild(card);
        });
    });
}

/**
 * Elimina un aula del sistema
 */
function eliminarAula(idAula) {
    const aulaIndex = Aulas_ESPE.findIndex(a => a.id === idAula);
    if (aulaIndex === -1) return;
    
    const aula = Aulas_ESPE[aulaIndex];
    
    // Verificar si tiene reservas activas
    const tieneReservas = Reservas_ESPE.some(r => 
        r.id_aula === idAula && 
        r.estado !== "Cancelada"
    );
    
    if (tieneReservas) {
        alert("No se puede eliminar el aula " + aula.nombre + " porque tiene reservas activas.");
        return;
    }
    
    // Eliminar aula
    Aulas_ESPE.splice(aulaIndex, 1);
    
    // Actualizar vistas
    actualizarVistas();
    
    alert("Aula " + aula.nombre + " eliminada correctamente");
}

// =========================================================
// FUNCIONALIDAD PARA CREAR AULAS NUEVAS
// =========================================================

/**
 * Crea una nueva aula y la anade al sistema.
 */
function crearNuevaAula(nombre, capacidad, equipamiento, estado) {
    const nuevaAula = {
        id: generarIdAula(),
        nombre: nombre,
        capacidad: parseInt(capacidad),
        equipamiento: equipamiento,
        estado: estado
    };

    Aulas_ESPE.push(nuevaAula);
    return nuevaAula;
}

/**
 * Maneja el formulario de creacion de aulas.
 */
function configurarFormularioCrearAula() {
    const btnGuardar = document.getElementById('btn-guardar-aula');
    
    if (!btnGuardar) return;

    btnGuardar.addEventListener('click', function(e) {
        e.preventDefault();
        
        const nombre = document.getElementById('input-nombre-aula').value.trim();
        const capacidad = document.getElementById('input-capacidad').value;
        const equipamiento = document.getElementById('input-equipamiento').value.trim();
        const estado = document.getElementById('select-estado-inicial').value;

        // Validaciones
        if (!nombre) {
            alert('Por favor ingrese el nombre del aula');
            return;
        }
        
        if (!capacidad || capacidad < 1) {
            alert('Por favor ingrese una capacidad valida');
            return;
        }

        // Verificar si ya existe un aula con ese nombre
        const aulaExistente = Aulas_ESPE.find(a => 
            a.nombre.toLowerCase() === nombre.toLowerCase()
        );

        
        if (aulaExistente) {
            alert('Ya existe un aula con el nombre "' + nombre + '". Por favor use otro nombre.');
            return;
        }

        // Crear aula
        const nuevaAula = crearNuevaAula(nombre, capacidad, equipamiento, estado);
        
        // Mostrar mensaje de exito
        alert('Aula "' + nuevaAula.nombre + '" creada exitosamente\nID: ' + nuevaAula.id + '\nCapacidad: ' + nuevaAula.capacidad + '\nEstado: ' + nuevaAula.estado);
        
        // Limpiar formulario
        document.getElementById('input-nombre-aula').value = '';
        document.getElementById('input-capacidad').value = '';
        document.getElementById('input-equipamiento').value = '';
        
        // Actualizar paneles
        actualizarVistas();
    });
}

// =========================================================
// FUNCIONALIDAD DE REPORTES
// =========================================================

/**
 * Renderiza la lista de reportes.
 */
function renderizarReportes() {
    const contenedor = document.getElementById('lista-reportes');
    if (!contenedor) return;

    contenedor.innerHTML = '';

    Reportes.forEach(reporte => {
        const item = document.createElement('div');
        item.classList.add('reporte-item');

        const header = document.createElement('div');
        header.classList.add('reporte-header');

        const infoUsuario = document.createElement('div');
        const usuarioSpan = document.createElement('span');
        usuarioSpan.classList.add('reporte-usuario');
        usuarioSpan.textContent = reporte.usuario;
        
        const fechaSpan = document.createElement('span');
        fechaSpan.classList.add('reporte-fecha');
        fechaSpan.textContent = ' • ' + reporte.fecha;
        
        infoUsuario.appendChild(usuarioSpan);
        infoUsuario.appendChild(fechaSpan);

        const estadoSpan = document.createElement('span');
        estadoSpan.classList.add('estado-reporte');
        estadoSpan.classList.add(reporte.estado === 'pendiente' ? 'estado-pendiente' : 'estado-resuelto');
        estadoSpan.textContent = reporte.estado === 'pendiente' ? 'Pendiente' : 'Resuelto';

        header.appendChild(infoUsuario);
        header.appendChild(estadoSpan);

        const aulaDiv = document.createElement('div');
        aulaDiv.classList.add('reporte-aula');
        aulaDiv.textContent = reporte.aula;

        const mensajeDiv = document.createElement('div');
        mensajeDiv.classList.add('reporte-mensaje');
        mensajeDiv.textContent = reporte.mensaje;

        const accionesDiv = document.createElement('div');
        accionesDiv.classList.add('acciones-reporte');

        const btnResolver = document.createElement('button');
        btnResolver.classList.add('btn-primario', 'btn-accion-pequeno');
        btnResolver.textContent = reporte.estado === 'pendiente' ? 'Marcar como resuelto' : 'Reabrir reporte';
        
        btnResolver.addEventListener('click', function() {
            reporte.estado = reporte.estado === 'pendiente' ? 'resuelto' : 'pendiente';
            renderizarReportes();
            actualizarEstadisticasReportes();
        });

        const btnEliminar = document.createElement('button');
        btnEliminar.classList.add('btn-secundario', 'btn-accion-pequeno');
        btnEliminar.textContent = 'Eliminar';
        
        btnEliminar.addEventListener('click', function() {
            if (confirm('Esta seguro de eliminar el reporte de ' + reporte.usuario + '?')) {
                Reportes = Reportes.filter(r => r.id !== reporte.id);
                renderizarReportes();
                actualizarEstadisticasReportes();
            }
        });

        accionesDiv.appendChild(btnResolver);
        accionesDiv.appendChild(btnEliminar);

        item.appendChild(header);
        item.appendChild(aulaDiv);
        item.appendChild(mensajeDiv);
        item.appendChild(accionesDiv);

        contenedor.appendChild(item);
    });

    actualizarEstadisticasReportes();
}

// =========================================================
// NAVEGACION ENTRE SECCIONES
// =========================================================

function configurarNavegacion() {
    const secciones = {
        'btn-hoy': 'seccion-disponibilidad',
        'btn-manana': 'seccion-disponibilidad',
        'btn-semana': 'seccion-disponibilidad',
        'btn-crear-aula': 'seccion-crear-aula',
        'btn-reportes': 'seccion-reportes',
        'btn-admin': 'seccion-admin-panel'
    };

    function mostrarSeccion(idSeccion) {
        // Ocultar todas las secciones
        document.querySelectorAll('.seccion').forEach(seccion => {
            seccion.classList.remove('seccion-activa');
            seccion.classList.add('seccion-oculta');
        });
        
        // Mostrar la seccion seleccionada
        const seccion = document.getElementById(idSeccion);
        if (seccion) {
            seccion.classList.remove('seccion-oculta');
            seccion.classList.add('seccion-activa');
        }
    }

    // Anadir eventos a los botones
    Object.entries(secciones).forEach(([botonId, seccionId]) => {
        const boton = document.getElementById(botonId);
        if (boton) {
            boton.addEventListener('click', () => {
                mostrarSeccion(seccionId);
                
                // Actualizar vista de disponibilidad
                if (seccionId === 'seccion-disponibilidad') {
                    const textoFiltro = document.getElementById('texto-filtro-actual');
                    if (botonId === 'btn-hoy') {
                        estadoVistaActual = "hoy";
                        if (textoFiltro) textoFiltro.textContent = 'Vista: Hoy';
                        renderizarDisponibilidad("hoy");
                    }
                    if (botonId === 'btn-manana') {
                        estadoVistaActual = "manana";
                        if (textoFiltro) textoFiltro.textContent = 'Vista: Manana';
                        renderizarDisponibilidad("manana");
                    }
                    if (botonId === 'btn-semana') {
                        estadoVistaActual = "semana";
                        if (textoFiltro) textoFiltro.textContent = 'Vista: Semana completa';
                        renderizarDisponibilidad("semana");
                    }
                }
                
                // Si es la seccion de reportes, renderizarlos
                if (seccionId === 'seccion-reportes') {
                    renderizarReportes();
                }
                
                // Si es la seccion de admin o crear aula, actualizar panel
                if (seccionId === 'seccion-admin-panel' || seccionId === 'seccion-crear-aula') {
                    panelAdminAulas();
                }
            });
        }
    });

    // Mostrar seccion inicial
    mostrarSeccion('seccion-disponibilidad');
}

// =========================================================
// INICIALIZACION DEL ADMINISTRADOR
// =========================================================

function inicializarAdmin() {
    const nombre = localStorage.getItem('usuario_nombre');
    const rol = localStorage.getItem('usuario_rol');
    
    // Verificar que este logueado como admin
    if (!nombre || rol !== 'admin') {
        window.location.href = '../index.html';
        return;
    }
    
    // Mostrar informacion del admin
    document.getElementById('nombre-usuario').textContent = nombre;
    
    // Crear avatar con primera letra
    const avatar = document.getElementById('avatar-usuario');
    avatar.textContent = nombre.charAt(0).toUpperCase();
    
    // Inicializar componentes
    renderizarDisponibilidad("hoy");
    panelAdminAulas();
    configurarNavegacion();
    configurarFormularioCrearAula();
    actualizarEstadisticasReportes();
}

// =========================================================
// CONFIGURACION DE EVENTOS

// =========================================================

function configurarEventosAdmin() {
    const btnLogout = document.getElementById('btn-logout');

    btnLogout.addEventListener('click', function () {
        if (confirm('Esta seguro de cerrar sesion?')) {
            localStorage.removeItem('usuario_nombre');
            localStorage.removeItem('usuario_rol');
            window.location.href = '../index.html';
        }
    });
}

// =========================================================
// INICIALIZACION DE DATOS SIMULADOS
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
        }
    ];

    reservasIniciales.forEach(r => Reservas_ESPE.push(r));
}

// =========================================================
// INICIALIZACION GENERAL DEL SISTEMA
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    inicializarReservasSimuladas();
    inicializarAdmin();
    configurarEventosAdmin();
});