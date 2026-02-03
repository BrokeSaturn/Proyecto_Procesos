(function () {
  const $ = (s) => document.querySelector(s);

  async function apiGET(action, qs = "") {
    const res = await fetch(`../server/api.php?action=${action}${qs}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (res.status === 401) {
      window.location.href = "../index.html";
      return null;
    }
    const data = await res.json().catch(() => null);
    if (!data || !data.ok) throw new Error((data && data.error) || "error");
    return data;
  }

  async function apiPOST(action, body) {
    const res = await fetch(`../server/api.php?action=${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "include",
      body: JSON.stringify(body || {}),
    });
    if (res.status === 401) {
      window.location.href = "../index.html";
      return null;
    }
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
    const nombre = $("#nombre-usuario");
    const avatar = $("#avatar-usuario");
    const rol = $("#rol-usuario");

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
    const btn = $("#btn-logout");
    if (btn) btn.addEventListener("click", doLogout);
  }

  function showSection(id) {
    const ids = ["seccion-inicio", "seccion-horarios", "seccion-reportes", "seccion-checkin", "seccion-multas"];
    ids.forEach((x) => {
      const el = $("#" + x);
      if (!el) return;
      if (x === id) {
        el.classList.add("seccion-activa");
        el.classList.remove("seccion-oculta");
      } else {
        el.classList.remove("seccion-activa");
        el.classList.add("seccion-oculta");
      }
    });
  }

  function bindNav() {
    $("#btn-inicio")?.addEventListener("click", () => showSection("seccion-inicio"));
    $("#btn-horarios")?.addEventListener("click", () => showSection("seccion-horarios"));
    $("#btn-reportes")?.addEventListener("click", () => showSection("seccion-reportes"));
    $("#btn-checkin")?.addEventListener("click", () => showSection("seccion-checkin"));
    $("#btn-multas")?.addEventListener("click", () => showSection("seccion-multas"));
  }

  async function loadKpis(reportes, multas) {
    const total = reportes.length;
    const pend = reportes.filter((r) => String(r.estado).toLowerCase() !== "resuelto").length;

    $("#kpi-reportes-total") && ($("#kpi-reportes-total").textContent = String(total));
    $("#kpi-reportes-pend") && ($("#kpi-reportes-pend").textContent = String(pend));
    $("#kpi-multas") && ($("#kpi-multas").textContent = String(multas.length));

    // check-ins validados: lo contamos desde reservas (scope=all)
    try {
      const rr = await apiGET("reservas_list", "&scope=all");
      const checkins = (rr.reservas || []).filter((x) => Number(x.checkin_validado) === 1).length;
      $("#kpi-checkins") && ($("#kpi-checkins").textContent = String(checkins));
    } catch {
      $("#kpi-checkins") && ($("#kpi-checkins").textContent = "0");
    }
  }

  function badgeEstado(estado) {
    const s = String(estado || "").toLowerCase();
    if (s === "resuelto") return `<span class="badge-mini badge-resuelto">resuelto</span>`;
    return `<span class="badge-mini badge-pendiente">pendiente</span>`;
  }

  async function loadReportesTable() {
    const tbody = $("#tbody-reportes");
    if (!tbody) return;

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

  async function loadMultasTable() {
    const tbody = $("#tbody-multas");
    if (!tbody) return;

    const r = await apiGET("multas_list");
    const rows = r.multas || [];

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

    return rows;
  }

  async function renderHorarios() {
    const cont = $("#contenedor-horarios");
    if (!cont) return;

    const vista = $("#vista-horarios")?.value || "hoy";
    const aulaId = Number($("#filtro-aula-horarios")?.value || 0);

    const r = await apiGET("reservas_list", "&scope=all");
    let rows = r.reservas || [];

    if (aulaId) {
      rows = rows.filter((x) => Number(x.aula_id || 0) === aulaId);
    }

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const hoy = `${y}-${m}-${d}`;

    const addDays = (iso, n) => {
      const [yy, mm, dd] = iso.split("-").map(Number);
      const dt = new Date(yy, mm - 1, dd);
      dt.setDate(dt.getDate() + n);
      const y2 = dt.getFullYear();
      const m2 = String(dt.getMonth() + 1).padStart(2, "0");
      const d2 = String(dt.getDate()).padStart(2, "0");
      return `${y2}-${m2}-${d2}`;
    };

    let fechas = [hoy];
    if (vista === "manana") fechas = [addDays(hoy, 1)];
    if (vista === "semana") fechas = [0, 1, 2, 3, 4, 5, 6].map((k) => addDays(hoy, k));

    const porDia = {};
    fechas.forEach((f) => (porDia[f] = []));
    rows.forEach((x) => {
      if (porDia[x.fecha]) porDia[x.fecha].push(x);
    });

    cont.innerHTML = fechas
      .map((f) => {
        const items = (porDia[f] || [])
          .sort((a, b) => String(a.hora_inicio).localeCompare(String(b.hora_inicio)))
          .map(
            (x) => `
              <tr>
                <td>${escapeHtml(x.hora_inicio)} - ${escapeHtml(x.hora_fin)}</td>
                <td>${escapeHtml(x.aula)}</td>
                <td>${escapeHtml(x.usuario)}</td>
                <td>${Number(x.checkin_validado) === 1 ? "sí" : "no"}</td>
              </tr>
            `
          )
          .join("");

        return `
          <div class="grupo-dia">
            <h3>${escapeHtml(f)}</h3>
            ${
              items
                ? `<table class="tabla-simple">
                    <thead>
                      <tr><th>hora</th><th>aula</th><th>usuario</th><th>checkin</th></tr>
                    </thead>
                    <tbody>${items}</tbody>
                  </table>`
                : `<div class="nota">sin reservas</div>`
            }
          </div>
        `;
      })
      .join("");
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

  async function refreshAll() {
    const rep = await apiGET("reportes_list");
    const multas = await loadMultasTable();
    await loadKpis(rep.reportes || [], multas || []);
    await loadReportesTable();
    await renderHorarios();
  }

  async function init() {
    try {
      const r = await apiGET("me");
      setUserUI(r.me);
    } catch {
      window.location.href = "../index.html";
      return;
    }

    bindLogout();
    bindNav();
    bindCheckin();
    bindFilters();

    try {
      await loadAulasForFiltro();
      await refreshAll();
    } catch (e) {
      alert(e.message || "error");
    }
  }

  init();
})();
