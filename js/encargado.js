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
      cache: "no-store",
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

  function setUserUI(me) {
    const full = `${me.nombres || ""} ${me.apellidos || ""}`.trim() || me.nombre_usuario || "usuario";
    $("#nombre-usuario") && ($("#nombre-usuario").textContent = full);
    $("#rol-usuario") && ($("#rol-usuario").textContent = me.rol || "encargado");
    $("#avatar-usuario") && ($("#avatar-usuario").textContent = (full[0] || "E").toUpperCase());
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
      const on = x === id;
      el.classList.toggle("seccion-activa", on);
      el.classList.toggle("seccion-oculta", !on);
    });
  }

  function bindNav() {
    $("#btn-inicio")?.addEventListener("click", async () => {
      showSection("seccion-inicio");
      await loadKpis();
    });

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
      await loadMultasTable();
    });
  }

  // ====== fechas ======
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
    const dias = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
    return dias[dt.getDay()];
  }

  // ====== kpis ======
  async function loadKpis() {
    const rep = await apiGET("reportes_list");
    const multas = await apiGET("multas_list");
    const rr = await apiGET("reservas_list", { scope: "all" });

    const reportes = rep?.reportes || [];
    const multasRows = multas?.multas || [];
    const reservas = rr?.reservas || [];

    const total = reportes.length;
    const pend = reportes.filter((r) => String(r.estado).toLowerCase() !== "resuelto").length;
    const checkins = reservas.filter((x) => Number(x.checkin_validado) === 1).length;

    $("#kpi-reportes-total") && ($("#kpi-reportes-total").textContent = String(total));
    $("#kpi-reportes-pend") && ($("#kpi-reportes-pend").textContent = String(pend));
    $("#kpi-multas") && ($("#kpi-multas").textContent = String(multasRows.length));
    $("#kpi-checkins") && ($("#kpi-checkins").textContent = String(checkins));
  }

  // ====== disponibilidad (tipo admin, SOLO HOY) ======
  function buildReservaIndex(reservas) {
    const map = new Map(); // fecha|aula_id|franja_id
    (reservas || []).forEach((r) => map.set(`${r.fecha}|${r.aula_id}|${r.franja_id}`, r));
    return map;
  }

  function getAulaFilterId() {
    return Number($("#filtro-aula-horarios")?.value || 0);
  }

  async function renderDisponibilidadHoy() {
    const cont = $("#grid-disponibilidad");
    if (!cont) return;

    const hoy = dateISO(new Date());
    $("#texto-filtro-actual") && ($("#texto-filtro-actual").textContent = `vista: hoy (${hoy})`);

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

    const bloque = document.createElement("div");
    bloque.className = "dia-bloque";

    const header = document.createElement("div");
    header.className = "dia-bloque-header";

    const h3 = document.createElement("h3");
    h3.textContent = nombreDiaES(hoy);

    const span = document.createElement("span");
    span.textContent = hoy;

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

        const k = `${hoy}|${a.id}|${f.id}`;
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
          cell.title = `usuario: ${r.usuario}\ncódigo: ${r.codigo_checkin || ""}`;
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

  // ====== reportes ======
  function badgeEstado(estado) {
    const s = String(estado || "").toLowerCase();
    if (s === "resuelto") return `<span class="badge-mini badge-resuelto">resuelto</span>`;
    return `<span class="badge-mini badge-pendiente">pendiente</span>`;
  }

  let multaCtx = { reporte_id: 0, usuario_id: 0, usuario: "", aula: "" };

  function openModalMulta(ctx) {
    multaCtx = ctx;
    $("#multa-contexto").textContent = `reporte #${ctx.reporte_id} · ${ctx.usuario} · ${ctx.aula}`;
    $("#multa-motivo").value = "";
    $("#multa-gravedad").value = "baja";
    $("#multa-monto").value = "";
    $("#overlay-modal").classList.remove("oculto");
    $("#modal-multa").classList.remove("oculto");
  }

  function closeModalMulta() {
    $("#overlay-modal").classList.add("oculto");
    $("#modal-multa").classList.add("oculto");
  }

  async function loadReportesTable() {
    const tbody = $("#tbody-reportes");
    if (!tbody) return;

    const filtroEstado = $("#filtro-estado")?.value || "todos";
    const filtroTexto = ($("#filtro-texto")?.value || "").trim().toLowerCase();

    const r = await apiGET("reportes_list");
    let rows = r.reportes || [];

    if (filtroEstado !== "todos") rows = rows.filter((x) => String(x.estado).toLowerCase() === filtroEstado);
    if (filtroTexto) {
      rows = rows.filter((x) => {
        const s = `${x.reportante} ${x.aula} ${x.descripcion} ${x.gravedad}`.toLowerCase();
        return s.includes(filtroTexto);
      });
    }

    tbody.innerHTML = rows.map((x) => {
      const estado = String(x.estado || "").toLowerCase();
      const acciones = estado === "resuelto"
        ? `<span class="texto-filtro">—</span>`
        : `<div class="acciones">
             <button class="btn-secundario btn-accion-pequeno"
               data-multa="${x.id}"
               data-uid="${x.reportante_id}"
               data-user="${escapeHtml(x.reportante)}"
               data-aula="${escapeHtml(x.aula)}">multa</button>
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
    }).join("");

    tbody.querySelectorAll("[data-res]").forEach((b) => {
      b.addEventListener("click", async () => {
        const id = Number(b.getAttribute("data-res"));
        await apiPOST("reportes_resolver", { id });
        await refreshAll();
      });
    });

    tbody.querySelectorAll("[data-multa]").forEach((b) => {
      b.addEventListener("click", () => {
        const reporte_id = Number(b.getAttribute("data-multa"));
        const usuario_id = Number(b.getAttribute("data-uid"));
        const usuario = b.getAttribute("data-user") || "";
        const aula = b.getAttribute("data-aula") || "";
        if (!reporte_id || !usuario_id) return alert("no se pudo obtener el usuario_id del reporte");
        openModalMulta({ reporte_id, usuario_id, usuario, aula });
      });
    });
  }

  // ====== multas ======
  async function loadMultasTable() {
    const tbody = $("#tbody-multas");
    if (!tbody) return;

    const r = await apiGET("multas_list");
    const rows = r.multas || [];

    tbody.innerHTML = rows.map((m) => `
      <tr>
        <td>${escapeHtml(m.fecha)}</td>
        <td>${escapeHtml(m.usuario)}</td>
        <td>${escapeHtml(m.motivo)}</td>
        <td>${escapeHtml(m.gravedad)}</td>
        <td>${escapeHtml(m.monto)}</td>
        <td>${escapeHtml(m.emitida_por)}</td>
      </tr>
    `).join("");
  }

  // ====== checkin ======
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
        ? `<p class="nota ok">ya estaba validado</p>`
        : `<p class="nota ok">validado correctamente</p>`;
      input.value = "";
      await refreshAll();
    } catch (e) {
      box.innerHTML = `<p class="nota err">${escapeHtml(e.message || "error")}</p>`;
    }
  }

  function bindCheckin() {
    $("#btn-validar-checkin")?.addEventListener("click", validateCheckin);
    $("#input-codigo-checkin")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") validateCheckin();
    });
  }

  function bindFilters() {
    $("#btn-refrescar-horarios")?.addEventListener("click", renderDisponibilidadHoy);
    $("#filtro-aula-horarios")?.addEventListener("change", renderDisponibilidadHoy);

    $("#btn-refrescar-reportes")?.addEventListener("click", loadReportesTable);
    $("#filtro-estado")?.addEventListener("change", loadReportesTable);
    $("#filtro-texto")?.addEventListener("input", () => {
      clearTimeout(bindFilters._t);
      bindFilters._t = setTimeout(loadReportesTable, 250);
    });

    $("#btn-cerrar-multa")?.addEventListener("click", closeModalMulta);
    $("#btn-cancelar-multa")?.addEventListener("click", closeModalMulta);
    $("#overlay-modal")?.addEventListener("click", closeModalMulta);

    $("#btn-emitir-multa")?.addEventListener("click", async () => {
      const motivo = ($("#multa-motivo")?.value || "").trim();
      const gravedad = ($("#multa-gravedad")?.value || "baja").trim();
      const monto = Number($("#multa-monto")?.value || 0);

      if (!motivo || monto <= 0 || !multaCtx.reporte_id || !multaCtx.usuario_id) {
        alert("completa motivo y monto");
        return;
      }

      await apiPOST("multas_create", {
        reporte_id: multaCtx.reporte_id,
        usuario_id: multaCtx.usuario_id,
        motivo,
        gravedad,
        monto,
      });

      closeModalMulta();
      await refreshAll();
      alert("multa emitida");
    });
  }

  async function refreshAll() {
    await Promise.allSettled([
      loadKpis(),
      loadReportesTable(),
      loadMultasTable(),
      renderDisponibilidadHoy(),
    ]);
  }

  async function init() {
    const meRes = await apiGET("me");
    if (!meRes) return (window.location.href = "../index.html");

    setUserUI(meRes.me);
    bindLogout();
    bindNav();
    bindCheckin();
    bindFilters();

    await loadAulasForFiltro();
    await refreshAll();
  }

  init().catch(() => (window.location.href = "../index.html"));
})();
