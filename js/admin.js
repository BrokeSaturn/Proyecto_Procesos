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
    if (rol) rol.textContent = me.rol || "admin";
    if (avatar) avatar.textContent = (full[0] || "A").toUpperCase();
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
      "seccion-crear-aula",
      "seccion-reportes",
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

  // ====== DISPONIBILIDAD (como prototipo) ======
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
    // key: fecha|aula_id|franja_id
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

      const h3 = document.createElement("h3");
      h3.textContent = nombreDiaES(diaISO);

      const span = document.createElement("span");
      span.textContent = diaISO;

      header.appendChild(h3);
      header.appendChild(span);
      bloque.appendChild(header);

      // grid tipo prototipo: 1 col hora + N aulas
      const grid = document.createElement("div");
      grid.className = "tabla-disponibilidad";
      grid.style.gridTemplateColumns = `110px repeat(${aulas.length}, minmax(140px, 1fr))`;

      // header hora
      const hHora = document.createElement("div");
      hHora.className = "celda celda-header";
      hHora.textContent = "hora";
      grid.appendChild(hHora);

      // header aulas
      aulas.forEach((a) => {
        const hA = document.createElement("div");
        hA.className = "celda celda-header";
        hA.textContent = a.codigo;
        grid.appendChild(hA);
      });

      // filas por franja (2 horas por tu tabla)
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

  // ====== AULAS (cards como prototipo) ======
  function nextCodigoFromAulas(aulas) {
    // espera códigos tipo A-1, A-2...
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
      badge.className = "badge " + (aulaEstadoLabel(a.estado) === "mantenimiento" ? "badge-mantenimiento" : "badge-disponible");
      badge.textContent = aulaEstadoLabel(a.estado);

      head.appendChild(t);
      head.appendChild(badge);

      const body = document.createElement("div");
      body.className = "aula-card-body";
      body.innerHTML =
        `<div>id: <strong>${escapeHtml(a.codigo)}</strong></div>` +
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
          await refreshAll();
        } catch (e) {
          alert(e.message || "error");
        }
      });

      const btnDel = document.createElement("button");
      btnDel.className = "btn-secundario";
      btnDel.textContent = "eliminar";
      btnDel.addEventListener("click", async () => {
        if (!confirm(`¿eliminar ${a.nombre}?`)) return;
        try {
          await apiPOST("aulas_delete", { id: Number(a.id) });
          await refreshAll();
        } catch (e) {
          alert(e.message || "error");
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
      alert("llena nombre y capacidad");
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

    await refreshAll();
    alert(`aula creada: ${codigo}`);
  }

  function bindCreateAula() {
    $("#btn-guardar-aula")?.addEventListener("click", async () => {
      try { await createAulaFromForm(); }
      catch (e) { alert(e.message || "error"); }
    });
  }

  // ====== REPORTES (layout prototipo) ======
  async function loadReportes() {
    const box = $("#lista-reportes");
    if (!box) return;

    box.innerHTML = "cargando...";
    const r = await apiGET("reportes_list");
    const rows = r.reportes || [];

    const total = rows.length;
    const pendientes = rows.filter((x) => String(x.estado).toLowerCase() !== "resuelto").length;
    const resueltos = total - pendientes;

    $("#total-reportes").textContent = String(total);
    $("#reportes-pendientes").textContent = String(pendientes);
    $("#reportes-resueltos").textContent = String(resueltos);

    if (rows.length === 0) {
      box.innerHTML = "<p style='padding:1rem;'>sin reportes</p>";
      return;
    }

    box.innerHTML = rows
      .map((x) => {
        const estado = String(x.estado || "").toLowerCase();
        const cls = estado === "resuelto" ? "estado-resuelto" : "estado-pendiente";
        const label = estado === "resuelto" ? "resuelto" : "pendiente";

        return `
          <div class="reporte-item">
            <div class="reporte-header">
              <div>
                <div class="reporte-usuario">${escapeHtml(x.reportante)}</div>
                <div class="reporte-fecha">${escapeHtml(x.fecha)}</div>
              </div>
              <span class="estado-reporte ${cls}">${label}</span>
            </div>
            <div class="reporte-aula">${escapeHtml(x.aula)}</div>
            <div class="reporte-mensaje">${escapeHtml(x.descripcion || "")}</div>
            ${
              estado === "resuelto"
                ? ""
                : `<div class="acciones-reporte">
                     <button class="btn-primario btn-accion-pequeno" data-resolver="${x.id}">marcar como resuelto</button>
                   </div>`
            }
          </div>
        `;
      })
      .join("");

    box.querySelectorAll("[data-resolver]").forEach((b) => {
      b.addEventListener("click", async () => {
        const id = Number(b.getAttribute("data-resolver"));
        try {
          await apiPOST("reportes_resolver", { id });
          await loadReportes();
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

    $("#btn-crear-aula")?.addEventListener("click", async () => {
      showSection("seccion-crear-aula");
      await renderAulasCards("#panel-admin-contenido");
    });

    $("#btn-reportes")?.addEventListener("click", async () => {
      showSection("seccion-reportes");
      await loadReportes();
    });

    $("#btn-admin")?.addEventListener("click", async () => {
      showSection("seccion-admin-panel");
      await renderAulasCards("#panel-admin-aulas");
    });
  }

  async function refreshAll() {
    // refresca lo visible + disponibilidad siempre (para que se vea mantenimiento al instante)
    await Promise.allSettled([
      renderDisponibilidad(),
      renderAulasCards("#panel-admin-contenido"),
      renderAulasCards("#panel-admin-aulas"),
      loadReportes(),
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
    bindCreateAula();

    // inicio: disponibilidad hoy (como prototipo)
    vista = "hoy";
    showSection("seccion-disponibilidad");
    await renderDisponibilidad();
  }

  init().catch(() => (window.location.href = "../index.html"));
})();
