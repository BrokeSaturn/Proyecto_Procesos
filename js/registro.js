(function () {
  const form = document.getElementById("form-registro");
  const err = document.getElementById("rg-error");
  const btn = document.getElementById("btn-registrar");

  const $ = (id) => document.getElementById(id);

  function msg(texto, isError = true) {
    if (!err) return;
    err.textContent = texto || "";
    err.style.display = texto ? "block" : "none";
    err.style.color = isError ? "#dc2626" : "#15803d";
    err.style.backgroundColor = isError ? "#fee2e2" : "#dcfce7";
    err.style.padding = "12px";
    err.style.borderRadius = "8px";
    err.style.margin = "15px 0";
    err.style.fontSize = "14px";
  }

  function emailEspe(c) {
    return /^[^@\s]+@espe\.edu\.ec$/i.test(String(c || "").trim());
  }

  function cedulaOk10Digits(c) {
    return /^\d{10}$/.test(String(c || "").trim());
  }

  async function safeJson(r) {
    const t = await r.text();
    try { return JSON.parse(t); }
    catch { throw new Error("el servidor no devolvió json (revisa warnings en php)"); }
  }

  async function registrar(payload) {
    const r = await fetch("../server/register.php", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      cache: "no-store",
      body: JSON.stringify(payload),
    });
    const j = await safeJson(r);
    if (!j || !j.ok) throw new Error(j?.error || "no se pudo registrar");
    return j;
  }

  async function onSubmit(e) {
    e.preventDefault();
    msg("");

    const nombres = $("rg-nombres").value.trim();
    const apellidos = $("rg-apellidos").value.trim();
    const nombre_usuario = $("rg-usuario").value.trim();
    const cedula = $("rg-cedula").value.trim();
    const correo = $("rg-correo").value.trim();
    const telefono = $("rg-telefono").value.trim();
    const password = $("rg-pass").value;
    const password2 = $("rg-pass2").value;

    if (!nombres || !apellidos || !nombre_usuario || !cedula || !correo || !telefono || !password) {
      msg("completa todos los campos");
      return;
    }
    if (!emailEspe(correo)) {
      msg("el correo debe terminar en @espe.edu.ec");
      return;
    }
    if (!cedulaOk10Digits(cedula)) {
      msg("la cédula debe tener 10 dígitos");
      return;
    }
    if (password.length < 6) {
      msg("la contraseña debe tener mínimo 6 caracteres");
      return;
    }
    if (password !== password2) {
      msg("las contraseñas no coinciden");
      return;
    }

    const old = btn.textContent;
    btn.textContent = "registrando...";
    btn.disabled = true;

    try {
      await registrar({ nombres, apellidos, nombre_usuario, cedula, correo, telefono, password });
      msg("✓ cuenta creada, redirigiendo...", false);
      setTimeout(() => (window.location.href = "../pages/usuario.html"), 350);
    } catch (error) {
      msg("✗ " + (error.message || "error al registrar"));
    } finally {
      btn.textContent = old;
      btn.disabled = false;
    }
  }

  if (form) form.addEventListener("submit", onSubmit);
})();
