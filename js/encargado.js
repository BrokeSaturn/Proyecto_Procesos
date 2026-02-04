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
      cache: "no-store",
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

  function nombreDiaES(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    return dias[dt.getDay()];
  }

  function setUserUI(me) {
    const nombre = $("#nombre-usuario");
    const avatar = $("#avatar-usuario");
    const rol = $("#rol-usuario") || $(".usuario-rol");

    const full = `${me.nombres || ""} ${me.apellidos || ""}`.trim() || me.nombre_usuario || "usuario";
    if (nombre) nombre.textContent = full;
    if (rol) rol.textContent = me.rol || "encargado";
    if (avatar) avatar.textContent = (full[0] || "E").toUpperCase();
  }

  async function doLogout() {
    try {
      await apiPOST("logout", {});
    } catch {}
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
      const on = x === id;
      el.classList.toggle("seccion-activa", on);
      el.classList.toggle("seccion-oculta", !on);
    });
  }

  function bindNav() {
    $("#btn-inicio")?.addEventListener("click", () => showSection("seccion-inicio"));

    $("#btn-horarios")?.addEventListener("click", async () => {
      showSection("seccion-horarios");
      await renderDisponibilidadHoy();
    });

    $("#btn-reportes")?.addEventListener("click", async () => {
      showSection("seccion-reportes");
      await loadReportesTable();
    });

    $("#btn-checkin")?.addEventListener("click", () => showSection("seccion-checkin"));

    $("#btn-multas")?.addEventListener("click", async () => {
      showSection("seccion-multas");
      await loadMultasTableSafe();
    });
  }

  // =========================
  // kpis (robusto: no rompe si falta multas/checkins)
  // =========================
  async function loadKpisSafe() {
    try {
      const rep = await apiGET("reportes_list");
      const reportes = rep?.reportes || [];
      const total = reportes.length;
      const pend = reportes.filter((r) => String(r.estado).toLowerCase() !== "resuelto").length;
      if ($("#kpi-reportes-total")) $("#kpi-reportes-total").textContent = String(total);
      if ($("#kpi-reportes-pend")) $("#kpi-reportes-pend").textContent = String(pend);
    } catch {
      if ($("#kpi-reportes-total")) $("#kpi-reportes-total").textContent = "0";
      if ($("#kpi-reportes-pend")) $("#kpi-reportes-pend").textContent = "0";
    }

    // checkins: depende de reservas_list scope=all
    try {
      const rr = await apiGET("reservas_list", { scope: "all" });
      const reservas = rr?.reservas || [];
      const checkins = reservas.filter((x) => Number(x.checkin_validado) === 1).length;
      if ($("#kpi-checkins")) $("#kpi-checkins").textContent = String(checkins);
    } catch {
      if ($("#kpi-checkins")) $("#kpi-checkins").textContent = "0";
    }

    // multas: si no existe endpoint, no rompe
    try {
      const m = await apiGET("multas_list");
      const rows = m?.multas || [];
      if ($("#kpi-multas")) $("#kpi-multas").textContent = String(rows.length);
    } catch {
      if ($("#kpi-multas")) $("#kpi-multas").textContent = "0";
    }
  }

  // =========================
  // disponibilidad (solo hoy, igual admin)
  // =========================
  function buildReservaIndex(reservas) {
    const map = new Map(); // fecha|aula_id|franja_id
    (reservas || []).forEach((r) => {
      map.set(`${r.fecha}|${r.aula_id}|${r.franja_id}`, r);
    });
    return map;
  }

  function getAulaFilterId() {
    return Number($("#filtro-aula-horarios")?.value || 0);
  }

  async function renderDisponibilidadHoy() {
    const cont = $("#grid-disponibilidad");
    if (!cont) return;

    const hoy = dateISO(new Date());

    const p = $("#texto-filtro-actual");
    if (p) p.textContent = `vista: hoy (${hoy})`;

    cont.innerHTML = "cargando...";

    const data = await apiGET("disponibilidad", { from: hoy, to: hoy });

    let aulas = data.aulas || [];
    const franjas = data.franjas || [];
    const idx = buildReservaIndex(data.reservas || []);
    const aulaFiltro = getAulaFilterId();

    if (aulaFiltro) aulas = aulas.filter((a) => Number(a.id) === aulaFiltro);

    if (aulas.length === 0) {
      cont.innerHTML = "<p style='padding:1rem;'>no hay aulas para mostrar</p>";
      return;
    }
    if (franjas.length === 0) {
      cont.innerHTML = "<p style='padding:1rem;'>no hay franjas en la base</p>";
      return;
    }

    cont.innerHTML = "";

    const diaISO = hoy;

    const bloque = document.createElement("div");
    bloque.className = "dia-bloque";

    const header = document.createElement("div");
    header.className = "dia-bloque-header";

    const h3 = document.createElement("h3");
    h3.textContent = nombreDiaES(diaISO);

    const span = document.createElement("span");
    span.textContent = diaISO;

    header.appendChild(h3);
    header.appendChild(span);
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
          // tooltip útil
          const u = r.usuario ? `usuario: ${r.usuario}` : "";
          cell.title = [u, r.codigo_checkin ? `código: ${r.codigo_checkin}` : ""].filter(Boolean).join("\n");
        } else {
          cell.classList.add("disponible");
          cell.textContent = "disponible";
        }

        grid.appendChild(cell);
      });
    });

    bloque.appendChild(grid);
    cont.appendChild(bloque);
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

  // =========================
  // reportes (mejorados pero simples)
  // =========================
  function badgeEstado(estado) {
    const s = String(estado || "").toLowerCase();
    if (s === "resuelto") return `<span class="badge-mini badge-resuelto">resuelto</span>`;
    return `<span class="badge-mini badge-pendiente">pendiente</span>`;
  }

  async function loadReportesTable() {
    const tbody = $("#tbody-reportes");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="nota">cargando...</td></tr>`;

    const filtroEstado = $("#filtro-estado")?.value || "todos";
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

    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="nota">sin reportes</td></tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map((x) => {
        const estado = String(x.estado || "").toLowerCase();
        const acciones =
          estado === "resuelto"
            ? `<span class="texto-filtro">—</span>`
            : `<div class="acciones">
                 <button class="btn-primario btn-accion-pequeno" data-res="${x.id}">resolver</button>
               </div>`;

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
      })
      .join("");

    tbody.querySelectorAll("[data-res]").forEach((b) => {
      b.addEventListener("click", async () => {
        const id = Number(b.getAttribute("data-res"));
        try {
          await apiPOST("reportes_resolver", { id });
          await refreshAll();
        } catch (e) {
          alert(e.message || "error");
        }
      });
    });
  }

  // =========================
  // check-in (si existe endpoint)
  // =========================
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
      await refreshAll();
    } catch (e) {
      // si el endpoint no existe, no rompemos la app
      box.innerHTML = `<p class="nota">${escapeHtml(e.message || "no disponible")}</p>`;
    }
  }

  function bindCheckin() {
    $("#btn-validar-checkin")?.addEventListener("click", validateCheckin);
    $("#input-codigo-checkin")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") validateCheckin();
    });
  }

  // =========================
  // multas (safe: si no existe endpoint)
  // =========================
  async function loadMultasTableSafe() {
    const tbody = $("#tbody-multas");
    if (!tbody) return;

    try {
      const r = await apiGET("multas_list");
      const rows = r.multas || [];
      if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="nota">sin multas</td></tr>`;
        return;
      }
      tbody.innerHTML = rows
        .map(
          (m) => `
        <tr>
          <td>${escapeHtml(m.fecha)}</td>
          <td>${escapeHtml(m.usuario)}</td>
          <td>${escapeHtml(m.motivo)}</td>
          <td>${escapeHtml(m.gravedad)}</td>
          <td>${escapeHtml(m.monto)}</td>
        </tr>
      `
        )
        .join("");
    } catch {
      tbody.innerHTML = `<tr><td colspan="5" class="nota">módulo de multas no implementado en api.php</td></tr>`;
    }
  }

  // =========================
  // filtros
  // =========================
  function bindFilters() {
    $("#btn-refrescar-reportes")?.addEventListener("click", loadReportesTable);
    $("#filtro-estado")?.addEventListener("change", loadReportesTable);
    $("#filtro-texto")?.addEventListener("input", () => {
      clearTimeout(bindFilters._t);
      bindFilters._t = setTimeout(loadReportesTable, 250);
    });

    $("#btn-refrescar-horarios")?.addEventListener("click", renderDisponibilidadHoy);
    $("#filtro-aula-horarios")?.addEventListener("change", renderDisponibilidadHoy);
  }

  async function refreshAll() {
    await Promise.allSettled([
      loadKpisSafe(),
      loadReportesTable(),
      loadMultasTableSafe(),
      renderDisponibilidadHoy(),
    ]);
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
    bindCheckin();
    bindFilters();

    await loadAulasForFiltro();

    // arranque: panel inicio
    showSection("seccion-inicio");
    await refreshAll();
  }

  init().catch(() => (window.location.href = "../index.html"));
})();
