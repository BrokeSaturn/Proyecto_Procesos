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

  async function repGET(action, qs = {}) {
    const url = new URL("../server/reporte.php", window.location.href);
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

  async function repPOST(action, body) {
    const url = new URL("../server/reporte.php", window.location.href);
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
    const dow = (dt.getDay() + 6) % 7;
    dt.setDate(dt.getDate() - dow);
    return dateISO(dt);
  }

  function nombreDiaES(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    return dias[dt.getDay()];
  }

  // ===== Toast =====
  let toastTimer = null;
  function ensureToast() {
    let el = document.getElementById("toast-ui");
    if (el) return el;

    el = document.createElement("div");
    el.id = "toast-ui";
    el.style.position = "fixed";
    el.style.right = "18px";
    el.style.bottom = "18px";
    el.style.zIndex = "9999";
    el.style.minWidth = "260px";
    el.style.maxWidth = "360px";
    el.style.padding = "12px 14px";
    el.style.borderRadius = "14px";
    el.style.boxShadow = "0 20px 50px rgba(0,0,0,.18)";
    el.style.background = "#111827";
    el.style.color = "#fff";
    el.style.fontSize = "14px";
    el.style.lineHeight = "1.35";
    el.style.display = "none";

    document.body.appendChild(el);
    return el;
  }

  function toast(msg, type = "info") {
    const el = ensureToast();
    el.textContent = msg || "";
    el.style.display = msg ? "block" : "none";

    if (type === "ok") el.style.background = "#065f46";
    else if (type === "err") el.style.background = "#991b1b";
    else el.style.background = "#111827";

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.style.display = "none";
    }, 2500);
  }

  // ===== User UI =====
  function setUserUI(me) {
    const nombre = $("#nombre-usuario");
    const avatar = $("#avatar-usuario");
    const rol = $("#rol-usuario");

    const full =
      `${me.nombres || ""} ${me.apellidos || ""}`.trim() ||
      me.nombre_usuario ||
      "usuario";

    if (nombre) nombre.textContent = full;
    if (rol) rol.textContent = me.rol || "usuario";
    if (avatar) avatar.textContent = (full[0] || "U").toUpperCase();

    $("#pf-nombres") && ($("#pf-nombres").textContent = me.nombres || "-");
    $("#pf-apellidos") && ($("#pf-apellidos").textContent = me.apellidos || "-");
    $("#pf-usuario") && ($("#pf-usuario").textContent = me.nombre_usuario || "-");
    $("#pf-correo") && ($("#pf-correo").textContent = me.correo || "-");
    $("#pf-telefono") && ($("#pf-telefono").textContent = me.telefono || "-");
    $("#pf-rol") && ($("#pf-rol").textContent = me.rol || "-");
  }

  async function doLogout() {
    try { await apiPOST("logout", {}); } catch {}
    window.location.href = "../index.html";
  }

  function bindLogout() {
    $("#btn-logout")?.addEventListener("click", doLogout);
  }

  function showSection(id) {
    const ids = ["seccion-disponibilidad", "seccion-reservas", "seccion-perfil"];
    ids.forEach((x) => {
      const el = document.getElementById(x);
      if (!el) return;
      const on = x === id;
      el.classList.toggle("seccion-activa", on);
      el.classList.toggle("seccion-oculta", !on);
    });
  }

  // ===== Modal Código =====
  function openModalCodigo({ codigo, aula, fecha, horario }) {
    const t = document.getElementById("codigo-checkin-texto");
    const meta = document.getElementById("codigo-checkin-meta");

    if (t) t.textContent = String(codigo || "----");
    if (meta) meta.textContent = `${aula || ""} · ${fecha || ""} · ${horario || ""}`.trim();

    document.getElementById("overlay-codigo")?.classList.remove("oculto");
    document.getElementById("modal-codigo")?.classList.remove("oculto");
  }

  function closeModalCodigo() {
    document.getElementById("overlay-codigo")?.classList.add("oculto");
    document.getElementById("modal-codigo")?.classList.add("oculto");
  }

  function bindModalCodigo() {
    document.getElementById("btn-cerrar-codigo")?.addEventListener("click", closeModalCodigo);
    document.getElementById("btn-ok-codigo")?.addEventListener("click", closeModalCodigo);
    document.getElementById("overlay-codigo")?.addEventListener("click", closeModalCodigo);

    document.getElementById("btn-copiar-codigo")?.addEventListener("click", async () => {
      const codigo = document.getElementById("codigo-checkin-texto")?.textContent || "";
      try {
        await navigator.clipboard.writeText(codigo.trim());
        toast("código copiado", "ok");
      } catch {
        toast("no se pudo copiar", "err");
      }
    });
  }

  // ===== Modal Reserva =====
  let reservaPendiente = null;

  function openModalReserva({ aula, franja, fechaISO }) {
    reservaPendiente = {
      aula_id: Number(aula.id),
      franja_id: Number(franja.id),
      fecha: fechaISO,
    };

    $("#input-aula").value = aula.codigo;
    $("#input-fecha").value = fechaISO;
    $("#input-hora-inicio").value = String(franja.hora_inicio || "").slice(0, 5);
    $("#input-hora-fin").value = String(franja.hora_fin || "").slice(0, 5);

    $("#overlay-modal")?.classList.remove("oculto");
    $("#modal-reserva")?.classList.remove("oculto");
  }

  function closeModalReserva() {
    $("#overlay-modal")?.classList.add("oculto");
    $("#modal-reserva")?.classList.add("oculto");
    reservaPendiente = null;
  }

  function bindModalReserva() {
    $("#btn-cerrar-modal")?.addEventListener("click", closeModalReserva);
    $("#btn-cancelar-modal")?.addEventListener("click", closeModalReserva);
    $("#overlay-modal")?.addEventListener("click", closeModalReserva);

    $("#btn-confirmar-reserva")?.addEventListener("click", async () => {
      if (!reservaPendiente) return;

      const btn = $("#btn-confirmar-reserva");
      const old = btn?.textContent || "";
      if (btn) { btn.textContent = "creando..."; btn.disabled = true; }

      try {
        const aula = $("#input-aula")?.value || "";
        const fecha = $("#input-fecha")?.value || "";
        const hi = $("#input-hora-inicio")?.value || "";
        const hf = $("#input-hora-fin")?.value || "";

        const r = await apiPOST("reservas_create", reservaPendiente);

        closeModalReserva();
        await renderDisponibilidad();
        await loadMisReservas();

        openModalCodigo({
          codigo: r.codigo_checkin,
          aula,
          fecha,
          horario: `${hi}-${hf}`,
        });

      } catch (e) {
        toast(e.message || "error al crear reserva", "err");
      } finally {
        if (btn) { btn.textContent = old; btn.disabled = false; }
      }
    });
  }

  // ===== Modal Reporte =====
  let reportePendiente = null;

  function showRpMsg(texto, isError = true) {
    const box = document.getElementById("rp-error");
    if (!box) return;
    box.textContent = texto || "";
    box.style.display = texto ? "block" : "none";
    box.style.color = isError ? "#dc2626" : "#15803d";
    box.style.backgroundColor = isError ? "#fee2e2" : "#dcfce7";
    box.style.padding = "12px";
    box.style.borderRadius = "10px";
  }

  function openModalReporte(row) {
    reportePendiente = {
      reserva_id: Number(row.id),
      aula_id: Number(row.aula_id),
      aula_codigo: String(row.aula_codigo || row.aula || ""),
      fecha: String(row.fecha || ""),
      hora_inicio: String(row.hora_inicio || "").slice(0, 5),
      hora_fin: String(row.hora_fin || "").slice(0, 5),
    };

    document.getElementById("rp-aula").value = reportePendiente.aula_codigo || "-";
    document.getElementById("rp-fecha").value = reportePendiente.fecha || "-";
    document.getElementById("rp-horario").value = `${reportePendiente.hora_inicio}-${reportePendiente.hora_fin}`;
    document.getElementById("rp-gravedad").value = "baja";
    document.getElementById("rp-descripcion").value = "";
    showRpMsg("");

    document.getElementById("overlay-reporte")?.classList.remove("oculto");
    document.getElementById("modal-reporte")?.classList.remove("oculto");
    setTimeout(() => document.getElementById("rp-descripcion")?.focus(), 50);
  }

  function closeModalReporte() {
    document.getElementById("overlay-reporte")?.classList.add("oculto");
    document.getElementById("modal-reporte")?.classList.add("oculto");
    reportePendiente = null;
    showRpMsg("");
  }

  function bindModalReporte() {
    document.getElementById("btn-cerrar-reporte")?.addEventListener("click", closeModalReporte);
    document.getElementById("btn-cancelar-reporte")?.addEventListener("click", closeModalReporte);
    document.getElementById("overlay-reporte")?.addEventListener("click", closeModalReporte);

    document.getElementById("btn-enviar-reporte")?.addEventListener("click", async () => {
      if (!reportePendiente) return;

      const gravedad = (document.getElementById("rp-gravedad")?.value || "baja").toLowerCase();
      const descripcion = (document.getElementById("rp-descripcion")?.value || "").trim();

      if (!descripcion) {
        showRpMsg("describe el uso indebido para poder enviar el reporte");
        return;
      }

      const btn = document.getElementById("btn-enviar-reporte");
      const old = btn?.textContent || "";
      if (btn) { btn.textContent = "enviando..."; btn.disabled = true; }

      try {
        await repPOST("create", {
          reserva_id: reportePendiente.reserva_id,
          aula_id: reportePendiente.aula_id,
          gravedad,
          descripcion,
        });

        showRpMsg("✓ reporte enviado", false);
        toast("reporte enviado", "ok");
        await loadMisReservas();
        setTimeout(closeModalReporte, 450);

      } catch (e) {
        showRpMsg(e.message || "error al enviar reporte");
      } finally {
        if (btn) { btn.textContent = old; btn.disabled = false; }
      }
    });
  }

  // ===== Disponibilidad =====
  let vista = "hoy";

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
    const days = [0, 1, 2, 3, 4].map((i) => addDays(start, i));
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
      cont.innerHTML = "<p style='padding:1rem;'>no hay franjas (horarios). crea las franjas en la base de datos.</p>";
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
            cell.style.cursor = "pointer";
            cell.addEventListener("click", () => {
              openModalReserva({ aula: a, franja: f, fechaISO: diaISO });
            });
          }

          grid.appendChild(cell);
        });
      });

      bloque.appendChild(grid);
      cont.appendChild(bloque);
    });
  }

  // ===== Mis reservas + Ver código =====
  async function loadMisReservas() {
    const box = $("#lista-reservas-usuario");
    if (!box) return;

    box.innerHTML = "cargando...";
    const r = await apiGET("reservas_list");
    const rows = r.reservas || [];

    if (rows.length === 0) {
      box.innerHTML = "<p style='padding:1rem;'>sin reservas</p>";
      return;
    }

    const ids = rows.map((x) => x.id).join(",");
    let counts = {};
    try {
      const c = await repGET("count", { ids });
      counts = c?.counts || {};
    } catch {
      counts = {};
    }

    box.innerHTML = rows.map((x) => {
      const cnt = Number(counts[String(x.id)] || 0);
      const estado = String(x.estado || "").toLowerCase();
      const puedeCancelar = estado === "activa";

      const aula = String(x.aula_codigo || "");
      const fecha = String(x.fecha || "");
      const hi = String(x.hora_inicio || "").slice(0, 5);
      const hf = String(x.hora_fin || "").slice(0, 5);
      const codigo = String(x.codigo_checkin || "");

      return `
        <div class="reporte-item">
          <div class="reporte-header">
            <div>
              <div class="reporte-usuario">reserva #${escapeHtml(x.id)} - ${escapeHtml(aula)}</div>
              <div class="reporte-fecha">fecha: ${escapeHtml(fecha)} · horario: ${escapeHtml(hi)} - ${escapeHtml(hf)}</div>
              <div class="reporte-fecha">código check-in: <strong>${escapeHtml(codigo || "-")}</strong></div>
              <div class="reporte-fecha">reportes: ${cnt}</div>
            </div>
            <span class="estado-reporte ${estado === "activa" ? "estado-pendiente" : "estado-resuelto"}">${escapeHtml(x.estado)}</span>
          </div>

          <div class="acciones-reporte">
            ${puedeCancelar ? `<button class="btn-accion-pequeno" data-action="cancel" data-id="${escapeHtml(x.id)}">cancelar</button>` : ``}

            <button class="btn-accion-pequeno"
              data-action="report"
              data-id="${escapeHtml(x.id)}"
              data-aulaid="${escapeHtml(x.aula_id)}"
              data-aula="${escapeHtml(aula)}"
              data-fecha="${escapeHtml(fecha)}"
              data-hi="${escapeHtml(hi)}"
              data-hf="${escapeHtml(hf)}"
            >reportar uso indebido</button>

            <button class="btn-accion-pequeno"
              data-action="codigo"
              data-codigo="${escapeHtml(codigo)}"
              data-aula="${escapeHtml(aula)}"
              data-fecha="${escapeHtml(fecha)}"
              data-hi="${escapeHtml(hi)}"
              data-hf="${escapeHtml(hf)}"
            >ver código</button>
          </div>
        </div>
      `;
    }).join("");

    box.onclick = async (ev) => {
      const btn = ev.target.closest("button[data-action]");
      if (!btn) return;

      const action = btn.getAttribute("data-action");

      if (action === "cancel") {
        const id = Number(btn.getAttribute("data-id"));
        try {
          await apiPOST("reservas_cancel", { id });
          toast("reserva cancelada", "ok");
          await renderDisponibilidad();
          await loadMisReservas();
        } catch (e) {
          toast(e.message || "error al cancelar", "err");
        }
        return;
      }

      if (action === "report") {
        const row = {
          id: Number(btn.getAttribute("data-id")),
          aula_id: Number(btn.getAttribute("data-aulaid")),
          aula_codigo: btn.getAttribute("data-aula") || "",
          fecha: btn.getAttribute("data-fecha") || "",
          hora_inicio: btn.getAttribute("data-hi") || "",
          hora_fin: btn.getAttribute("data-hf") || "",
        };
        openModalReporte(row);
        return;
      }

      if (action === "codigo") {
        const codigo = (btn.getAttribute("data-codigo") || "").trim();
        const aula = btn.getAttribute("data-aula") || "";
        const fecha = btn.getAttribute("data-fecha") || "";
        const hi = btn.getAttribute("data-hi") || "";
        const hf = btn.getAttribute("data-hf") || "";

        if (!codigo) {
          toast("esta reserva no tiene código todavía", "err");
          return;
        }

        openModalCodigo({
          codigo,
          aula,
          fecha,
          horario: `${hi}-${hf}`,
        });
      }
    };
  }

  // ===== Nav =====
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

    $("#btn-mis-reservas")?.addEventListener("click", async () => {
      showSection("seccion-reservas");
      await loadMisReservas();
    });

    $("#btn-perfil")?.addEventListener("click", () => {
      showSection("seccion-perfil");
    });
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
    bindModalReserva();
    bindModalReporte();
    bindModalCodigo();

    vista = "hoy";
    showSection("seccion-disponibilidad");
    await renderDisponibilidad();
    await loadMisReservas();
  }

  init().catch((e) => {
    console.error(e);
    window.location.href = "../index.html";
  });
})();
