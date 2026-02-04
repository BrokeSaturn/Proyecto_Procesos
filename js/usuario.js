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
    if (rol) rol.textContent = me.rol || "usuario";
    if (avatar) avatar.textContent = (full[0] || "U").toUpperCase();

    // perfil (si existe)
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
    const ids = [
      "seccion-disponibilidad",
      "seccion-reservas",
      "seccion-perfil",
    ];
    ids.forEach((x) => {
      const el = document.getElementById(x);
      if (!el) return;
      const on = x === id;
      el.classList.toggle("seccion-activa", on);
      el.classList.toggle("seccion-oculta", !on);
    });
  }

  // ====== MODAL RESERVA ======
  let reservaPendiente = null; // {aula_id, franja_id, fecha}

  function openModalReserva({ aula, franja, fechaISO }) {
    reservaPendiente = { aula_id: Number(aula.id), franja_id: Number(franja.id), fecha: fechaISO };

    $("#input-aula").value = aula.codigo;
    $("#input-fecha").value = fechaISO;
    $("#input-hora-inicio").value = String(franja.hora_inicio || "").slice(0,5);
    $("#input-hora-fin").value = String(franja.hora_fin || "").slice(0,5);

    $("#overlay-modal")?.classList.remove("oculto");
    $("#modal-reserva")?.classList.remove("oculto");
  }

  function closeModalReserva() {
    $("#overlay-modal")?.classList.add("oculto");
    $("#modal-reserva")?.classList.add("oculto");
    reservaPendiente = null;
  }

  function bindModal() {
    $("#btn-cerrar-modal")?.addEventListener("click", closeModalReserva);
    $("#btn-cancelar-modal")?.addEventListener("click", closeModalReserva);
    $("#overlay-modal")?.addEventListener("click", closeModalReserva);

    $("#btn-confirmar-reserva")?.addEventListener("click", async () => {
      if (!reservaPendiente) return;
      try {
        const r = await apiPOST("reservas_create", reservaPendiente);
        alert("reserva creada. código: " + (r.codigo_checkin || ""));
        closeModalReserva();
        await renderDisponibilidad();
        await loadMisReservas();
      } catch (e) {
        alert(e.message || "error");
      }
    });
  }

  // ====== DISPONIBILIDAD (HOY / MAÑANA / SEMANA) ======
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

  // ====== MIS RESERVAS ======
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

    box.innerHTML = rows.map((x) => `
      <div class="reporte-item">
        <div class="reporte-header">
          <div>
            <div class="reporte-usuario">reserva #${escapeHtml(x.id)} - ${escapeHtml(x.aula_codigo || "")}</div>
            <div class="reporte-fecha">${escapeHtml(x.fecha)} · ${escapeHtml(x.hora_inicio)}-${escapeHtml(x.hora_fin)}</div>
          </div>
          <span class="estado-reporte ${String(x.estado).toLowerCase()==="activa"?"estado-pendiente":"estado-resuelto"}">${escapeHtml(x.estado)}</span>
        </div>
        <div class="reporte-mensaje"><strong>código check-in:</strong> ${escapeHtml(x.codigo_checkin || "-")}</div>
        <div class="acciones-reporte">
          <button class="btn-primario btn-accion-pequeno" data-cancel="${escapeHtml(x.id)}">cancelar</button>
        </div>
      </div>
    `).join("");

    box.querySelectorAll("[data-cancel]").forEach((b) => {
      b.addEventListener("click", async () => {
        const id = Number(b.getAttribute("data-cancel"));
        try {
          await apiPOST("reservas_cancel", { id });
          await renderDisponibilidad();
          await loadMisReservas();
        } catch (e) {
          alert(e.message || "error");
        }
      });
    });
  }

  // ====== NAV ======
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
    bindModal();

    vista = "hoy";
    showSection("seccion-disponibilidad");
    await renderDisponibilidad();
  }

  init().catch((e) => {
    alert(e.message || "error");
    window.location.href = "../index.html";
  });
})();
