(function () {
  const $ = (s) => document.querySelector(s);

  async function apiGET(action, qs = {}) {
    const url = new URL("../server/api.php", window.location.href);
    url.searchParams.set("action", action);
    Object.entries(qs || {}).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (res.status === 401) return null;
    const data = await res.json().catch(() => null);
    if (!data || !data.ok) throw new Error((data && data.error) || "error");
    return data;
  }

  async function apiPOST(action, body) {
    const url = new URL("../server/api.php", window.location.href);
    url.searchParams.set("action", action);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "include",
      body: JSON.stringify(body || {}),
    });

    if (res.status === 401) return null;
    const data = await res.json().catch(() => null);
    if (!data || !data.ok) throw new Error((data && data.error) || "error");
    return data;
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

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

  function startOfWeekMonday(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const dow = (dt.getDay() + 6) % 7; // lunes=0
    dt.setDate(dt.getDate() - dow);
    return dateISO(dt);
  }

  function nombreDiaES(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const dias = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
    return dias[dt.getDay()];
  }

  function setUserUI(me) {
    const nombre = $("#nombre-usuario");
    const avatar = $("#avatar-usuario");
    const rol = $("#rol-usuario");

    const full = `${me.nombres || ""} ${me.apellidos || ""}`.trim() || me.nombre_usuario || "usuario";
    if (nombre) nombre.textContent = full;
    if (rol) rol.textContent = me.rol || "encargado";
    if (avatar) avatar.textContent = (full[0] || "E").toUpperCase();
  }

  async function doLogout() {
    try { await apiPOST("logout", {}); } catch {}
    window.location.href = "../index.html";
  }

  function bindLogout() {
    $("#btn-logout")?.addEventListener("click", doLogout);
  }

  function showSection(id) {
    const ids = ["seccion-inicio", "seccion-horarios", "seccion-reportes", "seccion-checkin", "seccion-multas"];
    ids.forEach((x) => {
      const el = $("#" + x);
      if (!el) return;
      el.classList.toggle("seccion-activa", x === id);
      el.classList.toggle("seccion-oculta", x !== id);
    });
  }

  function bindNav() {
    $("#btn-inicio")?.addEventListener("click", () => showSection("seccion-inicio"));
    $("#btn-horarios")?.addEventListener("click", async () => {
      showSection("seccion-horarios");
      await renderHorarios();
    });
    $("#btn-reportes")?.addEventListener("click", async () => {
      showSection("seccion-reportes");
      await loadReportesTable();
    });
    $("#btn-checkin")?.addEventListener("click", () => showSection("seccion-checkin"));
    $("#btn-multas")?.addEventListener("click", async () => {
      showSection("seccion-multas");
      await loadMultasTable();
    });
  }

  // ===== MODAL RESERVA =====
  let reservaPendiente = null;

  function openModal({ aula, franja, fechaISO }) {
    reservaPendiente = { aula_id: Number(aula.id), franja_id: Number(franja.id), fecha: fechaISO };

    $("#input-aula").value = aula.codigo;
    $("#input-fecha").value = fechaISO;
    $("#input-hora-inicio").value = String(franja.hora_inicio || "").slice(0,5);
    $("#input-hora-fin").value = String(franja.hora_fin || "").slice(0,5);

    $("#overlay-modal")?.classList.remove("oculto");
    $("#modal-reserva")?.classList.remove("oculto");
  }

  function closeModal() {
    $("#overlay-modal")?.classList.add("oculto");
    $("#modal-reserva")?.classList.add("oculto");
    reservaPendiente = null;
  }

  function bindModal() {
    $("#overlay-modal")?.addEventListener("click", closeModal);
    $("#btn-cerrar-modal")?.addEventListener("click", closeModal);
    $("#btn-cancelar-modal")?.addEventListener("click", closeModal);

    $("#btn-confirmar-reserva")?.addEventListener("click", async () => {
      if (!reservaPendiente) return;
      try {
        const r = await apiPOST("reservas_create", reservaPendiente);
        alert("reserva creada. código: " + (r.codigo_checkin || ""));
        closeModal();
        await renderHorarios();
      } catch (e) {
        alert(e.message || "error");
      }
    });
  }

  // ===== HORARIOS MEJORADOS (GRID) =====
  function getVistaHorarios() {
    const v = ($("#vista-horarios")?.value || "hoy").toLowerCase();
    if (v === "manana" || v === "mañana") return "manana";
    if (v === "semana") return "semana";
    return "hoy";
  }

  function rangoVista(vista) {
    const hoy = dateISO(new Date());
    if (vista === "hoy") return { from: hoy, to: hoy, days: [hoy] };
    if (vista === "manana") {
      const m = addDays(hoy, 1);
      return { from: m, to: m, days: [m] };
    }
    const start = startOfWeekMonday(hoy);
    const days = [0,1,2,3,4].map((i) => addDays(start, i)); // lunes-viernes
    return { from: days[0], to: days[days.length - 1], days };
  }

  function buildReservaIndex(reservas) {
    const map = new Map();
    (reservas || []).forEach((r) => {
      const k = `${r.fecha}|${r.aula_id}|${r.franja_id}`;
      map.set(k, r);
    });
    return map;
  }

  async function renderHorarios() {
    const cont = $("#contenedor-horarios");
    if (!cont) return;

    cont.innerHTML = "cargando...";

    const vista = getVistaHorarios();
    const aulaId = Number($("#filtro-aula-horarios")?.value || 0);

    const { from, to, days } = rangoVista(vista);
    const data = await apiGET("disponibilidad", { from, to });

    let aulas = data.aulas || [];
    const franjas = data.franjas || [];
    const idx = buildReservaIndex(data.reservas || []);

    if (aulaId) aulas = aulas.filter((a) => Number(a.id) === aulaId);

    if (aulas.length === 0) {
      cont.innerHTML = "<p style='padding:1rem;'>no hay aulas para mostrar</p>";
      return;
    }
    if (franjas.length === 0) {
      cont.innerHTML = "<p style='padding:1rem;'>no hay franjas (horarios) en la base</p>";
      return;
    }

    cont.innerHTML = "";

    days.forEach((diaISO) => {
      const bloque = document.createElement("div");
      bloque.className = "dia-bloque";

      const header = document.createElement("div");
      header.className = "dia-bloque-header";
      header.innerHTML = `<h3>${nombreDiaES(diaISO)}</h3><span>${diaISO}</span>`;
      bloque.appendChild(header);

      const grid = document.createElement("div");
      grid.className = "tabla-disponibilidad";
      grid.style.gridTemplateColumns = `110px repeat(${aulas.length}, minmax(140px, 1fr))`;

      const hHora = document.createElement("div");
      hHora.className = "celda celda-header";
      hHora.textContent = "hora";
      grid.appendChild(hHora);

      aulas.forEach((a) => {
        const hA = document.createElement("div");
        hA.className = "celda celda-header";
        hA.textContent = a.codigo;
        grid.appendChild(hA);
      });

      franjas.forEach((f) => {
        const label = String(f.hora_inicio || "").slice(0, 5);

        const cHora = document.createElement("div");
        cHora.className = "celda celda-hora";
        cHora.textContent = label;
        grid.appendChild(cHora);

        aulas.forEach((a) => {
          const cell = document.createElement("div");
          cell.className = "celda celda-slot";

          const estadoAula = String(a.estado || "").toLowerCase();
          if (estadoAula === "mantenimiento") {
            cell.classList.add("mantenimiento");
            cell.textContent = "mantenimiento";
            grid.appendChild(cell);
            return;
          }

          const k = `${diaISO}|${a.id}|${f.id}`;
          const r = idx.get(k);

          if (r) {
            const checkin = Number(r.checkin_validado || 0) === 1;
            if (checkin) {
              cell.classList.add("checkin");
              cell.textContent = "check-in";
            } else {
              cell.classList.add("ocupado");
              cell.textContent = "reservado";
            }
            cell.title = `usuario: ${r.usuario || ""}`;
          } else {
            cell.classList.add("disponible");
            cell.textContent = "disponible";
            cell.style.cursor = "pointer";
            cell.addEventListener("click", () => openModal({ aula: a, franja: f, fechaISO: diaISO }));
          }

          grid.appendChild(cell);
        });
      });

      bloque.appendChild(grid);
      cont.appendChild(bloque);
    });
  }

  async function loadAulasForFiltro() {
    const sel = $("#filtro-aula-horarios");
    if (!sel) return;

    const r = await apiGET("aulas_list");
    const aulas = r.aulas || [];
    sel.innerHTML =
      `<option value="0">todas</option>` +
      aulas.map((a) => `<option value="${a.id}">${escapeHtml(a.nombre)} (${escapeHtml(a.codigo)})</option>`).join("");
  }

  // ===== KPIs =====
  async function loadKpis() {
    try {
      const rep = await apiGET("reportes_list");
      const reportes = rep?.reportes || [];
      const total = reportes.length;
      const pend = reportes.filter((r) => String(r.estado).toLowerCase() !== "resuelto").length;

      $("#kpi-reportes-total") && ($("#kpi-reportes-total").textContent = String(total));
      $("#kpi-reportes-pend") && ($("#kpi-reportes-pend").textContent = String(pend));

      const multas = await apiGET("multas_list").catch(() => ({ multas: [] }));
      $("#kpi-multas") && ($("#kpi-multas").textContent = String((multas.multas || []).length));

      const rr = await apiGET("reservas_list", { scope: "all" }).catch(() => ({ reservas: [] }));
      const checkins = (rr.reservas || []).filter((x) => Number(x.checkin_validado) === 1).length;
      $("#kpi-checkins") && ($("#kpi-checkins").textContent = String(checkins));
    } catch {
      $("#kpi-reportes-total") && ($("#kpi-reportes-total").textContent = "0");
      $("#kpi-reportes-pend") && ($("#kpi-reportes-pend").textContent = "0");
      $("#kpi-multas") && ($("#kpi-multas").textContent = "0");
      $("#kpi-checkins") && ($("#kpi-checkins").textContent = "0");
    }
  }

  // ===== REPORTES =====
  function badgeEstado(estado) {
    const s = String(estado || "").toLowerCase();
    if (s === "resuelto") return `<span class="badge-mini badge-resuelto">resuelto</span>`;
    return `<span class="badge-mini badge-pendiente">pendiente</span>`;
  }

  async function loadReportesTable() {
    const tbody = $("#tbody-reportes");
    if (!tbody) return;

    const filtroEstado = ($("#filtro-estado")?.value || "todos").toLowerCase();
    const filtroTexto = ($("#filtro-texto")?.value || "").trim().toLowerCase();

    const r = await apiGET("reportes_list");
    let rows = r.reportes || [];

    if (filtroEstado !== "todos") {
      rows = rows.filter((x) => String(x.estado).toLowerCase() === filtroEstado);
    }
    if (filtroTexto) {
      rows = rows.filter((x) => {
        const s = `${x.reportante} ${x.aula} ${x.descripcion} ${x.gravedad}`.toLowerCase();
        return s.includes(filtroTexto);
      });
    }

    tbody.innerHTML = rows.map((x) => {
      const estado = String(x.estado || "").toLowerCase();
      const acciones =
        estado === "resuelto"
          ? `<span class="texto-filtro">—</span>`
          : `<button class="btn-primario btn-accion-pequeno" data-res="${x.id}">resolver</button>`;
      return `
        <tr>
          <td>${escapeHtml(x.fecha)}</td>
          <td>${escapeHtml(x.reportante)}</td>
          <td>${escapeHtml(x.aula)}</td>
          <td>${escapeHtml(x.gravedad)}</td>
          <td>${badgeEstado(x.estado)}</td>
          <td>${acciones}</td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll("[data-res]").forEach((b) => {
      b.addEventListener("click", async () => {
        const id = Number(b.getAttribute("data-res"));
        try {
          await apiPOST("reportes_resolver", { id });
          await loadKpis();
          await loadReportesTable();
        } catch (e) {
          alert(e.message || "error");
        }
      });
    });
  }

  // ===== MULTAS =====
  async function loadMultasTable() {
    const tbody = $("#tbody-multas");
    if (!tbody) return [];

    const r = await apiGET("multas_list");
    const rows = r.multas || [];

    tbody.innerHTML = rows.map((m) => `
      <tr>
        <td>${escapeHtml(m.fecha)}</td>
        <td>${escapeHtml(m.usuario)}</td>
        <td>${escapeHtml(m.motivo)}</td>
        <td>${escapeHtml(m.gravedad)}</td>
        <td>${escapeHtml(m.monto)}</td>
      </tr>
    `).join("");

    return rows;
  }

  // ===== CHECKIN =====
  async function validateCheckin() {
    const input = $("#input-codigo-checkin");
    const box = $("#resultado-checkin");
    if (!input || !box) return;

    const codigo = input.value.trim();
    if (!codigo) {
      box.innerHTML = `<p class="nota">ingresa un código</p>`;
      return;
    }

    try {
      const r = await apiPOST("checkin_validate", { codigo });
      box.innerHTML = r.ya_validado
        ? `<p class="nota">ya estaba validado</p>`
        : `<p class="nota">validado correctamente</p>`;
      input.value = "";
      await loadKpis();
      await renderHorarios();
    } catch (e) {
      box.innerHTML = `<p class="nota">${escapeHtml(e.message || "error")}</p>`;
    }
  }

  function bindCheckin() {
    $("#btn-validar-checkin")?.addEventListener("click", validateCheckin);
    $("#input-codigo-checkin")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") validateCheckin();
    });
  }

  function bindFilters() {
    $("#btn-refrescar-reportes")?.addEventListener("click", loadReportesTable);
    $("#filtro-estado")?.addEventListener("change", loadReportesTable);
    $("#filtro-texto")?.addEventListener("input", () => {
      clearTimeout(bindFilters._t);
      bindFilters._t = setTimeout(loadReportesTable, 250);
    });

    $("#btn-refrescar-horarios")?.addEventListener("click", renderHorarios);
    $("#vista-horarios")?.addEventListener("change", renderHorarios);
    $("#filtro-aula-horarios")?.addEventListener("change", renderHorarios);
  }

  async function init() {
    const meRes = await apiGET("me");
    if (!meRes) {
      window.location.href = "../index.html";
      return;
    }

    setUserUI(meRes.me);
    bindLogout();
    bindNav();
    bindModal();
    bindCheckin();
    bindFilters();

    await loadAulasForFiltro();
    await loadKpis();

    showSection("seccion-horarios");
    await renderHorarios();
  }

  init().catch((e) => {
    alert(e.message || "error");
    window.location.href = "../index.html";
  });
})();
