(function () {
  const $ = (s) => document.querySelector(s);

  // =========================
  // API
  // =========================
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

  // =========================
  // Toast (sin alert)
  // =========================
  let toastTimer = null;
  function ensureToast() {
    let t = $("#toast");
    if (t) return t;

    t = document.createElement("div");
    t.id = "toast";
    t.style.position = "fixed";
    t.style.right = "16px";
    t.style.bottom = "16px";
    t.style.zIndex = "9999";
    t.style.maxWidth = "420px";
    t.style.padding = "12px 14px";
    t.style.borderRadius = "12px";
    t.style.boxShadow = "0 12px 30px rgba(0,0,0,.18)";
    t.style.background = "#0b1220";
    t.style.color = "#fff";
    t.style.fontSize = "14px";
    t.style.display = "none";
    t.style.cursor = "default";
    document.body.appendChild(t);
    return t;
  }

  function toast(msg, type = "ok") {
    const t = ensureToast();
    t.textContent = msg || "";
    t.style.display = msg ? "block" : "none";
    t.style.background =
      type === "err" ? "#7f1d1d" :
      type === "warn" ? "#7c2d12" :
      "#0b1220";

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.style.display = "none"), 2600);
  }

  // =========================
  // UI helpers
  // =========================
  function showSection(id) {
    const ids = [
      "seccion-disponibilidad",
      "seccion-crear-aula",
      "seccion-reportes",
      "seccion-multas",
      "seccion-admin-panel",
    ];
    ids.forEach((x) => {
      const el = document.getElementById(x);
      if (!el) return;
      const on = x === id;
      el.classList.toggle("seccion-activa", on);
      el.classList.toggle("seccion-oculta", !on);
    });
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
    const dow = (dt.getDay() + 6) % 7;
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
    const full =
      `${me.nombres || ""} ${me.apellidos || ""}`.trim() ||
      me.nombre_usuario ||
      "admin";
    $("#nombre-usuario") && ($("#nombre-usuario").textContent = full);
    $("#rol-usuario") && ($("#rol-usuario").textContent = me.rol || "admin");
    $("#avatar-usuario") && ($("#avatar-usuario").textContent = (full[0] || "A").toUpperCase());
  }

  async function doLogout() {
    try { await apiPOST("logout", {}); } catch {}
    window.location.href = "../index.html";
  }

  function bindLogout() {
    $("#btn-logout")?.addEventListener("click", doLogout);
  }

  // =========================
  // DISPONIBILIDAD
  // =========================
  let vista = "hoy"; // hoy | manana | semana

  function setTextoVista() {
    const p = $("#texto-filtro-actual");
    if (!p) return;
    if (vista === "hoy") p.textContent = `vista: hoy (${dateISO(new Date())})`;
    if (vista === "manana") p.textContent = `vista: mañana (${addDays(dateISO(new Date()), 1)})`;
    if (vista === "semana") p.textContent = "vista: semana completa (lunes a viernes)";
  }

  function rangoVista() {
    const hoy = dateISO(new Date());
    if (vista === "hoy") return { from: hoy, to: hoy, days: [hoy] };
    if (vista === "manana") {
      const m = addDays(hoy, 1);
      return { from: m, to: m, days: [m] };
    }
    const start = startOfWeekMonday(hoy);
    const days = [0,1,2,3,4].map((i) => addDays(start, i));
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

  async function renderDisponibilidad() {
    const cont = $("#grid-disponibilidad");
    if (!cont) return;

    cont.innerHTML = "cargando...";
    setTextoVista();

    const { from, to, days } = rangoVista();
    const data = await apiGET("disponibilidad", { from, to });

    const aulas = data.aulas || [];
    const franjas = data.franjas || [];
    const idx = buildReservaIndex(data.reservas || []);

    if (aulas.length === 0) {
      cont.innerHTML = "<p style='padding:1rem;'>no hay aulas en la base</p>";
      return;
    }
    if (franjas.length === 0) {
      cont.innerHTML = "<p style='padding:1rem;'>no hay franjas en la base</p>";
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
          } else {
            cell.classList.add("disponible");
            cell.textContent = "disponible";
          }

          grid.appendChild(cell);
        });
      });

      bloque.appendChild(grid);
      cont.appendChild(bloque);
    });
  }

  // =========================
  // AULAS (cards)
  // =========================
  function nextCodigoFromAulas(aulas) {
    let max = 0;
    (aulas || []).forEach((a) => {
      const m = String(a.codigo || "").match(/A-(\d+)/i);
      if (m) max = Math.max(max, Number(m[1]));
    });
    return `A-${max + 1}`;
  }

  function aulaEstadoLabel(estado) {
    return String(estado || "").toLowerCase() === "mantenimiento" ? "mantenimiento" : "disponible";
  }

  async function renderAulasCards(containerSel) {
    const cont = $(containerSel);
    if (!cont) return;

    cont.innerHTML = "cargando...";
    const r = await apiGET("aulas_list");
    const aulas = r.aulas || [];

    if (aulas.length === 0) {
      cont.innerHTML = "<p style='padding:1rem;'>sin aulas</p>";
      return;
    }

    cont.innerHTML = "";
    aulas.forEach((a) => {
      const card = document.createElement("article");
      card.className = "aula-card";

      const head = document.createElement("div");
      head.className = "aula-card-header";

      const t = document.createElement("h3");
      t.textContent = a.nombre;

      const badge = document.createElement("span");
      badge.className =
        "badge " +
        (aulaEstadoLabel(a.estado) === "mantenimiento" ? "badge-mantenimiento" : "badge-disponible");
      badge.textContent = aulaEstadoLabel(a.estado);

      head.appendChild(t);
      head.appendChild(badge);

      const body = document.createElement("div");
      body.className = "aula-card-body";
      body.innerHTML =
        `<div>código: <strong>${escapeHtml(a.codigo)}</strong></div>` +
        `<div>capacidad: <strong>${Number(a.capacidad)} personas</strong></div>`;

      const foot = document.createElement("div");
      foot.className = "aula-card-footer";

      const estadoNow = aulaEstadoLabel(a.estado);
      const btnEstado = document.createElement("button");
      btnEstado.className = "btn-primario";
      btnEstado.textContent = estadoNow === "disponible" ? "poner en mantenimiento" : "quitar mantenimiento";

      btnEstado.addEventListener("click", async () => {
        try {
          const nuevo = estadoNow === "disponible" ? "mantenimiento" : "disponible";
          await apiPOST("aulas_set_estado", { id: Number(a.id), estado: nuevo });
          toast("estado actualizado");
          await refreshAll();
        } catch (e) {
          toast(e.message || "error", "err");
        }
      });

      const btnDel = document.createElement("button");
      btnDel.className = "btn-secundario";
      btnDel.textContent = "eliminar";
      btnDel.addEventListener("click", async () => {
        if (!confirm(`¿eliminar ${a.nombre}?`)) return;
        try {
          await apiPOST("aulas_delete", { id: Number(a.id) });
          toast("aula eliminada");
          await refreshAll();
        } catch (e) {
          toast(e.message || "error", "err");
        }
      });

      foot.appendChild(btnEstado);
      foot.appendChild(btnDel);

      card.appendChild(head);
      card.appendChild(body);
      card.appendChild(foot);
      cont.appendChild(card);
    });
  }

  async function createAulaFromForm() {
    const nombre = $("#input-nombre-aula")?.value?.trim() || "";
    const capacidad = Number($("#input-capacidad")?.value || 0);
    const estado = $("#select-estado-inicial")?.value?.trim() || "disponible";

    if (!nombre || capacidad < 1) {
      toast("llena nombre y capacidad", "warn");
      return;
    }

    const r = await apiGET("aulas_list");
    const codigo = nextCodigoFromAulas(r.aulas || []);

    await apiPOST("aulas_create", {
      codigo,
      nombre,
      capacidad,
      estado: String(estado).toLowerCase() === "mantenimiento" ? "mantenimiento" : "disponible",
    });

    $("#input-nombre-aula").value = "";
    $("#input-capacidad").value = "";
    $("#select-estado-inicial").value = "disponible";
    toast(`aula creada: ${codigo}`);
    await refreshAll();
  }

  function bindCreateAula() {
    $("#btn-guardar-aula")?.addEventListener("click", async () => {
      try { await createAulaFromForm(); }
      catch (e) { toast(e.message || "error", "err"); }
    });
  }

  // =========================
  // MODAL resolver + multa
  // =========================
  let accionCtx = null; // { reporte, infractor: {usuario_id, nombre_usuario}, ... }

  function modalMsg(msg, isError = true) {
    const el = $("#ma-msg");
    if (!el) return;
    el.textContent = msg || "";
    el.style.display = msg ? "block" : "none";
    el.style.color = isError ? "#dc2626" : "#15803d";
    el.style.backgroundColor = isError ? "#fee2e2" : "#dcfce7";
    el.style.padding = "10px";
    el.style.borderRadius = "10px";
  }

  function openModalAccion(ctx) {
    accionCtx = ctx;

    $("#ma-reportante").value = ctx?.reporte?.reportante || "-";
    $("#ma-infractor").value = ctx?.infractor?.nombre_usuario || "(sin reserva asociada)";
    $("#ma-aula").value = ctx?.reporte?.aula || "-";
    $("#ma-fecha").value = ctx?.reporte?.fecha || "-";
    $("#ma-gravedad").value = (ctx?.reporte?.gravedad || "baja").toLowerCase();
    $("#ma-desc").value = ctx?.reporte?.descripcion || "";

    $("#ma-aplicar-multa").checked = false;
    $("#ma-bloque-multa").style.display = "none";
    $("#ma-monto").value = "";
    $("#ma-motivo").value = "";

    modalMsg("");

    $("#overlay-accion")?.classList.remove("oculto");
    $("#modal-accion")?.classList.remove("oculto");
  }

  function closeModalAccion() {
    $("#overlay-accion")?.classList.add("oculto");
    $("#modal-accion")?.classList.add("oculto");
    accionCtx = null;
    modalMsg("");
  }

  function bindModalAccion() {
    $("#ma-cerrar")?.addEventListener("click", closeModalAccion);
    $("#ma-cancelar")?.addEventListener("click", closeModalAccion);
    $("#overlay-accion")?.addEventListener("click", closeModalAccion);

    $("#ma-aplicar-multa")?.addEventListener("change", (e) => {
      const on = !!e.target.checked;
      $("#ma-bloque-multa").style.display = on ? "block" : "none";

      // sugerencias rápidas
      if (on) {
        const g = ($("#ma-gravedad").value || "baja").toLowerCase();
        if (!$("#ma-monto").value) {
          $("#ma-monto").value = g === "alta" ? "10" : g === "media" ? "5" : "2";
        }
        if (!$("#ma-motivo").value) {
          $("#ma-motivo").value = `multa por uso indebido (${g})`;
        }
      }
    });

    $("#ma-guardar")?.addEventListener("click", async () => {
      if (!accionCtx?.reporte) return;

      const reporte_id = Number(accionCtx.reporte.id);
      const aplicarMulta = !!$("#ma-aplicar-multa").checked;

      // 1) resolver
      try {
        $("#ma-guardar").disabled = true;

        await apiPOST("reportes_resolver", { id: reporte_id });

        // 2) multa (opcional)
        if (aplicarMulta) {
          const usuario_id = Number(accionCtx?.infractor?.usuario_id || 0);
          if (usuario_id < 1) {
            modalMsg("no se puede multar: el reporte no tiene reserva asociada.", true);
            $("#ma-guardar").disabled = false;
            return;
          }

          const motivo = ($("#ma-motivo").value || "").trim();
          const gravedad = ($("#ma-gravedad").value || "baja").toLowerCase();
          const monto = Number($("#ma-monto").value || 0);

          if (!motivo) return modalMsg("ingresa un motivo para la multa.", true);
          if (!(monto > 0)) return modalMsg("ingresa un monto válido.", true);

          await apiPOST("multas_create", {
            reporte_id,
            usuario_id,
            motivo,
            gravedad,
            monto,
          });
        }

        closeModalAccion();
        toast(aplicarMulta ? "reporte resuelto y multa emitida" : "reporte resuelto");
        await Promise.allSettled([loadReportes(), loadMultas()]);
      } catch (e) {
        modalMsg(e.message || "error", true);
      } finally {
        $("#ma-guardar").disabled = false;
      }
    });
  }

  // =========================
  // REPORTES + infractor (dueño de reserva)
  // =========================
  async function fetchInfractoresPorReserva(reservaIds) {
    // usamos reservas_list scope=all y mapeamos id -> usuario
    // (no requiere tocar api.php)
    if (!reservaIds.length) return new Map();

    const all = await apiGET("reservas_list", { scope: "all" });
    const map = new Map();
    (all?.reservas || []).forEach((r) => {
      map.set(Number(r.id), {
        usuario_id: Number(r.usuario_id),
        nombre_usuario: String(r.usuario || r.nombre_usuario || "").trim() || `usuario#${r.usuario_id}`,
      });
    });

    const out = new Map();
    reservaIds.forEach((id) => {
      if (map.has(id)) out.set(id, map.get(id));
    });
    return out;
  }

  async function loadReportes() {
    const box = $("#lista-reportes");
    if (!box) return;

    box.innerHTML = "cargando...";
    const r = await apiGET("reportes_list");
    const rows = r.reportes || [];

    const total = rows.length;
    const pendientes = rows.filter((x) => String(x.estado).toLowerCase() !== "resuelto").length;
    const resueltos = total - pendientes;

    $("#total-reportes") && ($("#total-reportes").textContent = String(total));
    $("#reportes-pendientes") && ($("#reportes-pendientes").textContent = String(pendientes));
    $("#reportes-resueltos") && ($("#reportes-resueltos").textContent = String(resueltos));

    if (rows.length === 0) {
      box.innerHTML = "<p style='padding:1rem;'>sin reportes</p>";
      return;
    }

    // buscar infractor por reserva_id (si existe)
    const reservaIds = rows
      .map((x) => Number(x.reserva_id || 0))
      .filter((id) => id > 0);

    let infractores = new Map();
    try {
      infractores = await fetchInfractoresPorReserva(reservaIds);
    } catch {
      infractores = new Map();
    }

    box.innerHTML = rows.map((x) => {
      const estado = String(x.estado || "").toLowerCase();
      const cls = estado === "resuelto" ? "estado-resuelto" : "estado-pendiente";
      const label = estado === "resuelto" ? "resuelto" : "pendiente";

      const rid = Number(x.reserva_id || 0);
      const infr = rid > 0 ? infractores.get(rid) : null;

      return `
        <div class="reporte-item">
          <div class="reporte-header">
            <div>
              <div class="reporte-usuario">${escapeHtml(x.reportante || "-")}</div>
              <div class="reporte-fecha">${escapeHtml(x.fecha || "")}</div>
            </div>
            <span class="estado-reporte ${cls}">${label}</span>
          </div>

          <div class="reporte-aula"><strong>aula:</strong> ${escapeHtml(x.aula || "")}</div>

          ${
            rid > 0
              ? `<div class="reporte-fecha"><strong>reserva:</strong> #${escapeHtml(rid)} · <strong>infractor:</strong> ${escapeHtml(infr?.nombre_usuario || "desconocido")}</div>`
              : `<div class="reporte-fecha"><strong>reserva:</strong> (no asociada)</div>`
          }

          <div class="reporte-mensaje">${escapeHtml(x.descripcion || "")}</div>

          ${
            estado === "resuelto"
              ? ""
              : `<div class="acciones-reporte">
                   <button class="btn-primario btn-accion-pequeno" data-accion="${escapeHtml(x.id)}">resolver / multar</button>
                 </div>`
          }
        </div>
      `;
    }).join("");

    box.querySelectorAll("[data-accion]").forEach((b) => {
      b.addEventListener("click", () => {
        const repId = Number(b.getAttribute("data-accion"));
        const rep = rows.find((x) => Number(x.id) === repId);
        if (!rep) return;

        const rid = Number(rep.reserva_id || 0);
        const infr = rid > 0 ? infractores.get(rid) : null;

        openModalAccion({
          reporte: rep,
          infractor: infr ? { usuario_id: infr.usuario_id, nombre_usuario: infr.nombre_usuario } : null,
        });
      });
    });
  }

  // =========================
  // MULTAS
  // =========================
  async function loadMultas() {
    const box = $("#lista-multas");
    if (!box) return;

    box.innerHTML = "cargando...";
    const r = await apiGET("multas_list");
    const rows = r.multas || [];

    if (rows.length === 0) {
      box.innerHTML = "<p style='padding:1rem;'>sin multas</p>";
      return;
    }

    box.innerHTML = rows.map((m) => {
      const g = String(m.gravedad || "baja").toLowerCase();
      const badge =
        g === "alta" ? "badge-mantenimiento" :
        g === "media" ? "badge-ocupado" :
        "badge-disponible";

      return `
        <div class="reporte-item">
          <div class="reporte-header">
            <div>
              <div class="reporte-usuario">${escapeHtml(m.usuario || "-")}</div>
              <div class="reporte-fecha">${escapeHtml(m.fecha || "")} · emitida por: ${escapeHtml(m.emitida_por || "-")}</div>
            </div>
            <span class="badge ${badge}">${escapeHtml(g)}</span>
          </div>
          <div class="reporte-mensaje"><strong>monto:</strong> $${escapeHtml(Number(m.monto || 0).toFixed(2))}</div>
          <div class="reporte-mensaje"><strong>motivo:</strong> ${escapeHtml(m.motivo || "")}</div>
        </div>
      `;
    }).join("");
  }

  // =========================
  // NAV
  // =========================
  function bindNav() {
    $("#btn-hoy")?.addEventListener("click", async () => {
      vista = "hoy";
      showSection("seccion-disponibilidad");
      await renderDisponibilidad();
    });

    $("#btn-manana")?.addEventListener("click", async () => {
      vista = "manana";
      showSection("seccion-disponibilidad");
      await renderDisponibilidad();
    });

    $("#btn-semana")?.addEventListener("click", async () => {
      vista = "semana";
      showSection("seccion-disponibilidad");
      await renderDisponibilidad();
    });

    $("#btn-crear-aula")?.addEventListener("click", async () => {
      showSection("seccion-crear-aula");
      await renderAulasCards("#panel-admin-contenido");
    });

    $("#btn-reportes")?.addEventListener("click", async () => {
      showSection("seccion-reportes");
      await loadReportes();
    });

    $("#btn-multas")?.addEventListener("click", async () => {
      showSection("seccion-multas");
      await loadMultas();
    });

    $("#btn-admin")?.addEventListener("click", async () => {
      showSection("seccion-admin-panel");
      await renderAulasCards("#panel-admin-aulas");
    });
  }

  async function refreshAll() {
    await Promise.allSettled([
      renderDisponibilidad(),
      renderAulasCards("#panel-admin-contenido"),
      renderAulasCards("#panel-admin-aulas"),
      loadReportes(),
      loadMultas(),
    ]);
  }

  // =========================
  // INIT
  // =========================
  async function init() {
    const meRes = await apiGET("me");
    if (!meRes) {
      window.location.href = "../index.html";
      return;
    }

    setUserUI(meRes.me);
    bindLogout();
    bindNav();
    bindCreateAula();
    bindModalAccion();

    vista = "hoy";
    showSection("seccion-disponibilidad");
    await renderDisponibilidad();
  }

  init().catch((e) => {
    toast(e.message || "error", "err");
    window.location.href = "../index.html";
  });
})();
