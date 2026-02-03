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
    if (rol) rol.textContent = me.rol || "admin";
    if (avatar) avatar.textContent = (full[0] || "A").toUpperCase();
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
    const sections = [
      "#seccion-disponibilidad",
      "#seccion-crear-aula",
      "#seccion-reportes",
      "#seccion-admin-panel",
    ];
    sections.forEach((sel) => {
      const el = $(sel);
      if (!el) return;
      if (sel === `#${id}`) {
        el.classList.add("seccion-activa");
        el.classList.remove("seccion-oculta");
      } else {
        el.classList.remove("seccion-activa");
        el.classList.add("seccion-oculta");
      }
    });
  }

  function bindNav() {
    $("#btn-hoy")?.addEventListener("click", () => {
      $("#texto-filtro-actual").textContent = "Vista: Hoy";
      showSection("seccion-disponibilidad");
    });
    $("#btn-manana")?.addEventListener("click", () => {
      $("#texto-filtro-actual").textContent = "Vista: Mañana";
      showSection("seccion-disponibilidad");
    });
    $("#btn-semana")?.addEventListener("click", () => {
      $("#texto-filtro-actual").textContent = "Vista: Semana completa";
      showSection("seccion-disponibilidad");
    });
    $("#btn-crear-aula")?.addEventListener("click", () => showSection("seccion-crear-aula"));
    $("#btn-reportes")?.addEventListener("click", () => showSection("seccion-reportes"));
    $("#btn-admin")?.addEventListener("click", () => showSection("seccion-admin-panel"));
  }

  async function renderAulasInto(containerId) {
    const cont = $(containerId);
    if (!cont) return;
    cont.innerHTML = "cargando...";

    const r = await apiGET("aulas_list");
    const aulas = r.aulas || [];

    if (aulas.length === 0) {
      cont.innerHTML = "<p>sin aulas</p>";
      return;
    }

    cont.innerHTML = `
      <table class="tabla-simple">
        <thead>
          <tr>
            <th>código</th>
            <th>nombre</th>
            <th>capacidad</th>
            <th>estado</th>
          </tr>
        </thead>
        <tbody>
          ${aulas
            .map(
              (a) => `
            <tr>
              <td>${escapeHtml(a.codigo)}</td>
              <td>${escapeHtml(a.nombre)}</td>
              <td>${a.capacidad}</td>
              <td>${escapeHtml(a.estado)}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  async function createAulaFromForm() {
    const nombre = $("#input-nombre-aula")?.value?.trim() || "";
    const capacidad = Number($("#input-capacidad")?.value || 0);
    const equipamiento = $("#input-equipamiento")?.value?.trim() || "";
    const estado = $("#select-estado-inicial")?.value?.trim() || "Disponible";

    if (!nombre || !capacidad) {
      alert("llena nombre y capacidad");
      return;
    }

    // tu API requiere: codigo, nombre, capacidad, estado
    // como el form no tiene codigo, lo generamos estable (basado en nombre)
    const base = nombre
      .toUpperCase()
      .replaceAll(/[^A-Z0-9]+/g, "-")
      .replaceAll(/^-+|-+$/g, "")
      .slice(0, 12);
    const codigo = (base || "AULA") + "-" + String(Date.now()).slice(-4);

    const estadoApi = String(estado).toLowerCase() === "mantenimiento" ? "mantenimiento" : "disponible";

    await apiPOST("aulas_create", {
      codigo,
      nombre,
      capacidad,
      estado: estadoApi,
      equipamiento,
    });

    $("#input-nombre-aula").value = "";
    $("#input-capacidad").value = "";
    $("#input-equipamiento").value = "";
    $("#select-estado-inicial").value = "Disponible";

    alert("aula creada");
    await renderAulasInto("#panel-admin-contenido");
    await renderAulasInto("#panel-admin-aulas");
  }

  function bindCreateAula() {
    const btn = $("#btn-guardar-aula");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      try {
        await createAulaFromForm();
      } catch (e) {
        alert(e.message || "error");
      }
    });
  }

  async function loadReportes() {
    const box = $("#lista-reportes");
    if (!box) return;
    box.innerHTML = "cargando...";

    // admin puede listar reportes porque en api.php reportes_list es encargado/admin
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
                     <button class="btn-primario btn-accion-pequeno" data-resolver="${x.id}">marcar resuelto</button>
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

  async function init() {
    let me;
    try {
      const r = await apiGET("me");
      me = r.me;
      setUserUI(me);
    } catch {
      window.location.href = "../index.html";
      return;
    }

    bindLogout();
    bindNav();
    bindCreateAula();

    try {
      await renderAulasInto("#panel-admin-contenido");
      await renderAulasInto("#panel-admin-aulas");
      await loadReportes();
    } catch (e) {
      alert(e.message || "error");
    }
  }

  init();
})();
