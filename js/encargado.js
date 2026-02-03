document.addEventListener("DOMContentLoaded", () => {
  const $ = (s) => document.querySelector(s);

  // ===== guard por rol (temporal) =====
  const rol = (localStorage.getItem("usuario_rol") || "").toLowerCase();
  if (rol !== "encargado" && rol !== "admin") {
    window.location.href = "../index.html";
    return;
  }

  // ===== header =====
  const nombre = localStorage.getItem("usuario_nombre") || "encargado";
  $("#nombre-usuario").textContent = nombre;
  $("#avatar-usuario").textContent = (nombre.trim()[0] || "e").toUpperCase();

  $("#btn-logout").addEventListener("click", () => {
    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_rol");
    window.location.href = "../index.html";
  });

  // ===== navegación =====
  const secciones = {
    inicio: $("#seccion-inicio"),
    horarios: $("#seccion-horarios"),
    reportes: $("#seccion-reportes"),
    checkin: $("#seccion-checkin"),
    multas: $("#seccion-multas"),
  };

  function ver(nombreSec) {
    Object.keys(secciones).forEach((k) => {
      secciones[k].classList.toggle("seccion-activa", k === nombreSec);
      secciones[k].classList.toggle("seccion-oculta", k !== nombreSec);
    });
  }

  $("#btn-inicio").addEventListener("click", () => {
    ver("inicio");
    actualizarKpis();
  });

  $("#btn-horarios").addEventListener("click", () => {
    ver("horarios");
    initHorarios();
    renderHorarios();
  });

  $("#btn-reportes").addEventListener("click", () => {
    ver("reportes");
    renderReportes();
  });

  $("#btn-checkin").addEventListener("click", () => {
    ver("checkin");
  });

  $("#btn-multas").addEventListener("click", () => {
    ver("multas");
    renderMultas();
  });

  // ===== storage =====
  function getArr(key) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
  function setArr(key, arr) {
    localStorage.setItem(key, JSON.stringify(arr));
  }
  function nowISO() {
    return new Date().toISOString();
  }

  // ===== seed mínimo (para que veas datos) =====
  function seedSiVacio() {
    const reportes = getArr("reportes");
    if (reportes.length === 0) {
      setArr("reportes", [
        {
          id: crypto.randomUUID(),
          fecha: nowISO(),
          usuario: "l20012345",
          aula: "aula a-1",
          mensaje: "ruido excesivo y consumo de alimentos",
          gravedad: "media",
          estado: "pendiente",
        },
      ]);
    }

    const reservas = getArr("reservas");
    if (reservas.length === 0) {
      // ojo: fecha en ISO yyyy-mm-dd para que filtros funcionen
      const hoy = dateISO(new Date());
      setArr("reservas", [
        {
          id: crypto.randomUUID(),
          usuario: "l20012345",
          aula: "aula a-1",
          fecha: hoy,
          hora_inicio: "09:00",
          hora_fin: "11:00",
          codigo_checkin: "8k2f-19qx",
          checkin_validado: false,
        },
        {
          id: crypto.randomUUID(),
          usuario: "l20099999",
          aula: "aula a-2",
          fecha: hoy,
          hora_inicio: "13:00",
          hora_fin: "15:00",
          codigo_checkin: "p7aa-3m1z",
          checkin_validado: true,
          checkin_validado_fecha: nowISO(),
          checkin_validado_por: nombre,
        },
      ]);
    }

    // aulas opcional (si no existe lo inventa desde reservas)
    const aulas = getArr("aulas");
    if (aulas.length === 0) {
      setArr("aulas", [
        { id: "A-1", nombre: "aula a-1", estado: "disponible" },
        { id: "A-2", nombre: "aula a-2", estado: "disponible" },
        { id: "A-3", nombre: "aula a-3", estado: "disponible" },
      ]);
    }
  }
  seedSiVacio();

  // ===== kpis =====
  function actualizarKpis() {
    const reportes = getArr("reportes");
    const multas = getArr("multas");
    const reservas = getArr("reservas");

    const pend = reportes.filter((r) => (r.estado || "").toLowerCase() === "pendiente").length;
    const checkins = reservas.filter((r) => r.checkin_validado).length;

    $("#kpi-reportes-total").textContent = String(reportes.length);
    $("#kpi-reportes-pend").textContent = String(pend);
    $("#kpi-multas").textContent = String(multas.length);
    $("#kpi-checkins").textContent = String(checkins);
  }

  // ===== reportes =====
  const filtroEstado = $("#filtro-estado");
  const filtroTexto = $("#filtro-texto");

  $("#btn-refrescar-reportes").addEventListener("click", renderReportes);
  filtroEstado.addEventListener("change", renderReportes);
  filtroTexto.addEventListener("input", renderReportes);

  function gravedadToMonto(gravedad) {
    const g = (gravedad || "").toLowerCase();
    if (g === "alta") return 25;
    if (g === "media") return 10;
    return 5;
  }

  function fmtFecha(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso || "";
    }
  }

  function renderReportes() {
    const tbody = $("#tbody-reportes");
    const estado = (filtroEstado.value || "todos").toLowerCase();
    const q = (filtroTexto.value || "").trim().toLowerCase();

    let reportes = getArr("reportes");

    if (estado !== "todos") {
      reportes = reportes.filter((r) => (r.estado || "").toLowerCase() === estado);
    }
    if (q) {
      reportes = reportes.filter((r) => {
        const s = `${r.usuario} ${r.aula} ${r.mensaje} ${r.gravedad} ${r.estado}`.toLowerCase();
        return s.includes(q);
      });
    }

    tbody.innerHTML = "";

    if (reportes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">sin reportes para el filtro actual</td></tr>`;
      actualizarKpis();
      return;
    }

    reportes.forEach((r) => {
      const tr = document.createElement("tr");

      const badge =
        (r.estado || "").toLowerCase() === "resuelto"
          ? `<span class="badge-mini badge-resuelto">resuelto</span>`
          : `<span class="badge-mini badge-pendiente">pendiente</span>`;

      tr.innerHTML = `
        <td>${fmtFecha(r.fecha)}</td>
        <td>${escapeHtml(r.usuario)}</td>
        <td>${escapeHtml(r.aula)}</td>
        <td>${escapeHtml(r.gravedad || "baja")}</td>
        <td>${badge}</td>
        <td>
          <div class="acciones">
            <button class="btn-secundario" data-accion="ver" data-id="${r.id}">ver</button>
            <button class="btn-secundario" data-accion="resolver" data-id="${r.id}">marcar resuelto</button>
            <button class="btn-primario" data-accion="multa" data-id="${r.id}">emitir multa</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll("button[data-accion]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const accion = btn.dataset.accion;
        const id = btn.dataset.id;
        if (accion === "ver") verDetalleReporte(id);
        if (accion === "resolver") resolverReporte(id);
        if (accion === "multa") emitirMultaDesdeReporte(id);
      });
    });

    actualizarKpis();
  }

  function verDetalleReporte(id) {
    const reportes = getArr("reportes");
    const r = reportes.find((x) => x.id === id);
    if (!r) return alert("reporte no encontrado");

    alert(
      `reporte\n\n` +
        `fecha: ${fmtFecha(r.fecha)}\n` +
        `usuario: ${r.usuario}\n` +
        `aula: ${r.aula}\n` +
        `gravedad: ${r.gravedad}\n` +
        `estado: ${r.estado}\n\n` +
        `mensaje: ${r.mensaje}`
    );
  }

  function resolverReporte(id) {
    const reportes = getArr("reportes");
    const i = reportes.findIndex((x) => x.id === id);
    if (i === -1) return alert("reporte no encontrado");
    reportes[i].estado = "resuelto";
    setArr("reportes", reportes);
    renderReportes();
  }

  function emitirMultaDesdeReporte(id) {
    const reportes = getArr("reportes");
    const r = reportes.find((x) => x.id === id);
    if (!r) return alert("reporte no encontrado");

    const montoSugerido = gravedadToMonto(r.gravedad);
    const monto = Number(
      prompt(`monto sugerido ($): ${montoSugerido}\n\ningresa monto final:`, String(montoSugerido))
    );
    if (!Number.isFinite(monto) || monto <= 0) return;

    const motivo = prompt("motivo de la multa:", r.mensaje || "uso indebido");
    if (!motivo) return;

    const multas = getArr("multas");
    multas.unshift({
      id: crypto.randomUUID(),
      fecha: nowISO(),
      usuario: r.usuario,
      motivo,
      gravedad: r.gravedad || "baja",
      monto,
      reporte_id: r.id,
      emitida_por: nombre,
    });
    setArr("multas", multas);

    r.estado = "resuelto";
    setArr("reportes", reportes);

    alert("multa emitida y registrada");
    renderReportes();
    actualizarKpis();
  }

  // ===== check-in =====
  $("#btn-validar-checkin").addEventListener("click", () => {
    const code = ($("#input-codigo-checkin").value || "").trim();
    if (!code) return mostrarCheckin("ingresa un código", false);

    const reservas = getArr("reservas");
    const idx = reservas.findIndex(
      (r) => String(r.codigo_checkin || "").toLowerCase() === code.toLowerCase()
    );

    if (idx === -1) return mostrarCheckin("código inválido o no existe", false);

    if (reservas[idx].checkin_validado) {
      return mostrarCheckin("este código ya fue validado", true);
    }

    reservas[idx].checkin_validado = true;
    reservas[idx].checkin_validado_fecha = nowISO();
    reservas[idx].checkin_validado_por = nombre;
    setArr("reservas", reservas);

    mostrarCheckin(
      `check-in válido\nusuario: ${reservas[idx].usuario}\naula: ${reservas[idx].aula}\nhorario: ${reservas[idx].hora_inicio}-${reservas[idx].hora_fin}`,
      true
    );
    actualizarKpis();
  });

  function mostrarCheckin(msg, ok) {
    $("#resultado-checkin").innerHTML = `
      <div class="card-mini" style="border-color:${ok ? "var(--color-acento)" : "var(--color-peligro)"}">
        <strong>${ok ? "validación" : "error"}</strong>
        <div style="white-space:pre-line;margin-top:.4rem;">${escapeHtml(msg)}</div>
      </div>
    `;
  }

  // ===== multas =====
  function renderMultas() {
    const tbody = $("#tbody-multas");
    const multas = getArr("multas");

    tbody.innerHTML = "";
    if (multas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5">sin multas registradas</td></tr>`;
      actualizarKpis();
      return;
    }

    multas.forEach((m) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${fmtFecha(m.fecha)}</td>
        <td>${escapeHtml(m.usuario)}</td>
        <td>${escapeHtml(m.motivo)}</td>
        <td>${escapeHtml(m.gravedad || "baja")}</td>
        <td>$${Number(m.monto || 0).toFixed(2)}</td>
      `;
      tbody.appendChild(tr);
    });

    actualizarKpis();
  }

  // ===== horarios (hoy / mañana / semana) =====
  const vistaHorarios = $("#vista-horarios");
  const filtroAulaHorarios = $("#filtro-aula-horarios");
  const contHorarios = $("#contenedor-horarios");
  const btnRefHorarios = $("#btn-refrescar-horarios");

  btnRefHorarios.addEventListener("click", renderHorarios);
  vistaHorarios.addEventListener("change", renderHorarios);
  filtroAulaHorarios.addEventListener("change", renderHorarios);

  function dateISO(d) {
    const x = new Date(d);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const day = String(x.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function addDays(iso, n) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + n);
    return dateISO(dt);
  }

  function fmtFechaCorta(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "2-digit", day: "2-digit" });
  }

  function initHorarios() {
    // llena combo de aulas desde "aulas" o desde reservas
    const reservas = getArr("reservas");
    let aulas = getArr("aulas").map((a) => (a.nombre || "").toLowerCase()).filter(Boolean);

    if (aulas.length === 0) {
      aulas = [...new Set(reservas.map((r) => (r.aula || "").toLowerCase()).filter(Boolean))];
    }
    aulas = [...new Set(aulas)].sort();

    filtroAulaHorarios.innerHTML = "";
    const optAll = document.createElement("option");
    optAll.value = "todas";
    optAll.textContent = "todas";
    filtroAulaHorarios.appendChild(optAll);

    aulas.forEach((a) => {
      const o = document.createElement("option");
      o.value = a;
      o.textContent = a;
      filtroAulaHorarios.appendChild(o);
    });
  }

  function rangoFechasSegunVista() {
    const hoy = dateISO(new Date());
    const v = (vistaHorarios.value || "hoy").toLowerCase();

    if (v === "hoy") return [hoy];
    if (v === "manana") return [addDays(hoy, 1)];

    // semana: hoy + 6
    const dias = [];
    for (let i = 0; i < 7; i++) dias.push(addDays(hoy, i));
    return dias;
  }

  function renderHorarios() {
    const reservas = getArr("reservas");
    const dias = rangoFechasSegunVista();
    const aulaFiltro = (filtroAulaHorarios.value || "todas").toLowerCase();

    contHorarios.innerHTML = "";

    const reservasFiltradas = reservas.filter((r) => {
      const okDia = dias.includes(String(r.fecha || ""));
      const okAula = aulaFiltro === "todas" ? true : String(r.aula || "").toLowerCase() === aulaFiltro;
      return okDia && okAula;
    });

    if (dias.length === 1) {
      const dia = dias[0];
      contHorarios.appendChild(renderBloqueDia(dia, reservasFiltradas));
      return;
    }

    // semana: agrupar por día
    dias.forEach((dia) => {
      const rsDia = reservasFiltradas.filter((r) => String(r.fecha || "") === dia);
      contHorarios.appendChild(renderBloqueDia(dia, rsDia));
    });
  }

  function renderBloqueDia(isoDia, reservasDia) {
    const wrap = document.createElement("div");
    wrap.className = "grupo-dia";

    const h = document.createElement("h3");
    h.textContent = fmtFechaCorta(isoDia);
    wrap.appendChild(h);

    if (!reservasDia || reservasDia.length === 0) {
      const n = document.createElement("div");
      n.className = "nota";
      n.textContent = "sin reservas registradas para este día";
      wrap.appendChild(n);
      return wrap;
    }

    // ordenar por hora
    reservasDia.sort((a, b) => String(a.hora_inicio || "").localeCompare(String(b.hora_inicio || "")));

    const tabla = document.createElement("table");
    tabla.className = "tabla-simple";
    tabla.innerHTML = `
      <thead>
        <tr>
          <th>hora</th>
          <th>aula</th>
          <th>usuario</th>
          <th>check-in</th>
          <th>código</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tb = tabla.querySelector("tbody");

    reservasDia.forEach((r) => {
      const tr = document.createElement("tr");
      const ok = !!r.checkin_validado;
      tr.innerHTML = `
        <td>${escapeHtml(`${r.hora_inicio || ""}-${r.hora_fin || ""}`)}</td>
        <td>${escapeHtml(r.aula || "")}</td>
        <td>${escapeHtml(r.usuario || "")}</td>
        <td>${ok ? '<span class="badge-mini badge-resuelto">validado</span>' : '<span class="badge-mini badge-pendiente">pendiente</span>'}</td>
        <td>${escapeHtml(r.codigo_checkin || "-")}</td>
      `;
      tb.appendChild(tr);
    });

    wrap.appendChild(tabla);
    return wrap;
  }

  // ===== utils =====
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  // inicio
  actualizarKpis();
});
