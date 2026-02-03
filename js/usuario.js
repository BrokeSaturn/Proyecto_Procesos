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

  function fillMe(me) {
    const el = $("#me");
    if (el) el.textContent = `${me.nombres} ${me.apellidos} (${me.rol})`;
  }

  async function doLogout() {
    try {
      await apiPOST("logout", {});
    } catch {}
    window.location.href = "../index.html";
  }

  function bindLogout() {
    const btn = $("#btnLogout");
    if (btn) btn.addEventListener("click", doLogout);
  }

  async function loadAulas() {
    const sel = $("#aula_id");
    if (!sel) return;

    const r = await apiGET("aulas_list");
    const aulas = r.aulas || [];

    sel.innerHTML = `<option value="">elige un aula</option>` + aulas
      .map((a) => `<option value="${a.id}">${escapeHtml(a.nombre)} (${escapeHtml(a.codigo)})</option>`)
      .join("");
  }

  async function loadFranjas() {
    const sel = $("#franja_id");
    if (!sel) return;

    const r = await apiGET("franjas_list");
    const franjas = r.franjas || [];

    sel.innerHTML = `<option value="">elige una franja</option>` + franjas
      .map((f) => `<option value="${f.id}">${escapeHtml(f.hora_inicio)} - ${escapeHtml(f.hora_fin)}</option>`)
      .join("");
  }

  async function loadMisReservas() {
    const box = $("#misReservas");
    if (!box) return;

    box.innerHTML = "cargando...";
    const r = await apiGET("reservas_list");
    const rows = r.reservas || [];

    if (rows.length === 0) {
      box.innerHTML = "<p>sin reservas</p>";
      return;
    }

    box.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>fecha</th>
            <th>franja</th>
            <th>aula</th>
            <th>código</th>
            <th>checkin</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (x) => `
            <tr>
              <td>${escapeHtml(x.fecha)}</td>
              <td>${escapeHtml(x.hora_inicio)} - ${escapeHtml(x.hora_fin)}</td>
              <td>${escapeHtml(x.aula)}</td>
              <td>${escapeHtml(x.codigo_checkin || "")}</td>
              <td>${x.checkin_validado == 1 ? "sí" : "no"}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  function bindReservaCreate() {
    const form = $("#reservaForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const aula_id = Number($("#aula_id")?.value || 0);
      const franja_id = Number($("#franja_id")?.value || 0);
      const fecha = $("#fecha")?.value?.trim() || "";

      if (!aula_id || !franja_id || !fecha) {
        alert("llena aula, franja y fecha");
        return;
      }

      try {
        const r = await apiPOST("reservas_create", { aula_id, franja_id, fecha });
        alert("reserva creada. código: " + r.codigo_checkin);
        form.reset();
        await loadMisReservas();
      } catch (err) {
        alert(err.message || "error");
      }
    });
  }

  function bindReporteCreate() {
    const form = $("#reporteForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const aula_id = Number($("#rep_aula_id")?.value || 0);
      const gravedad = $("#rep_gravedad")?.value?.trim() || "";
      const descripcion = $("#rep_descripcion")?.value?.trim() || "";

      if (!aula_id || !gravedad || !descripcion) {
        alert("llena aula, gravedad y descripción");
        return;
      }

      try {
        await apiPOST("reportes_create", { aula_id, gravedad, descripcion });
        alert("reporte enviado");
        form.reset();
      } catch (err) {
        alert(err.message || "error");
      }
    });
  }

  async function init() {
    try {
      const r = await apiGET("me");
      fillMe(r.me);
    } catch {
      window.location.href = "../index.html";
      return;
    }

    bindLogout();
    bindReservaCreate();
    bindReporteCreate();

    try {
      await loadAulas();
      await loadFranjas();
      await loadMisReservas();

      const selRep = $("#rep_aula_id");
      if (selRep) {
        const r = await apiGET("aulas_list");
        const aulas = r.aulas || [];
        selRep.innerHTML = `<option value="">elige un aula</option>` + aulas
          .map((a) => `<option value="${a.id}">${escapeHtml(a.nombre)} (${escapeHtml(a.codigo)})</option>`)
          .join("");
      }
    } catch (e) {
      alert(e.message || "error");
    }
  }

  init();
})();
