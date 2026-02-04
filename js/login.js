(function () {
  console.log("=== INICIANDO SISTEMA DE LOGIN ===");

  const form = document.getElementById("form-login");
  const usuarioInput = document.getElementById("input-usuario");
  const passwordInput = document.getElementById("input-password");
  const errorDiv = document.getElementById("error-general");
  const loginBtn = document.getElementById("btn-login");

  if (!form) {
    console.error("No se encontró el formulario de login");
    return;
  }

  function showMessage(message, isError = true) {
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = message ? "block" : "none";
      errorDiv.style.color = isError ? "#dc2626" : "#15803d";
      errorDiv.style.backgroundColor = isError ? "#fee2e2" : "#dcfce7";
      errorDiv.style.padding = "12px";
      errorDiv.style.borderRadius = "8px";
      errorDiv.style.margin = "15px 0";
      errorDiv.style.fontSize = "14px";
    }
    console.log(isError ? "ERROR:" : "INFO:", message);
  }

  function redirectByRole(rol) {
    rol = String(rol || "").toLowerCase();
    let page = "pages/usuario.html";
    if (rol === "admin") page = "pages/admin.html";
    else if (rol === "encargado") page = "pages/encargado.html";
    console.log(`Redirigiendo a: ${page} (rol: ${rol})`);
    window.location.href = page;
  }

  async function safeJson(response) {
    const txt = await response.text();
    try {
      return JSON.parse(txt);
    } catch {
      console.error("Respuesta no es JSON:", txt.slice(0, 300));
      throw new Error("El servidor no devolvió JSON (revisa api.php / warnings PHP).");
    }
  }

  async function checkExistingSession() {
    try {
      console.log("Verificando sesión existente...");
      const response = await fetch("server/api.php?action=me", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const data = await safeJson(response);
      console.log("Respuesta de verificación de sesión:", data);

      if (data.ok && data.me) {
        console.log("Sesión ya activa para:", data.me.nombre_usuario);
        redirectByRole(data.me.rol);
        return true;
      }
    } catch (error) {
      console.log("No hay sesión activa o error de conexión:", error.message);
    }
    return false;
  }

  async function handleLogin(event) {
    event.preventDefault();
    showMessage("");

    const usuario = usuarioInput?.value?.trim() || "";
    const password = passwordInput?.value || "";

    if (!usuario) {
      showMessage("Por favor, ingresa tu usuario");
      usuarioInput?.focus();
      return;
    }
    if (!password) {
      showMessage("Por favor, ingresa tu contraseña");
      passwordInput?.focus();
      return;
    }

    const originalText = loginBtn.textContent;
    loginBtn.textContent = "Verificando...";
    loginBtn.disabled = true;

    try {
      console.log("Enviando solicitud de login...");

      const response = await fetch("server/api.php?action=login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          usuario: usuario,     // ✅ CLAVE CORRECTA para tu API
          password: password,   // ✅
        }),
      });

      const data = await safeJson(response);
      console.log("Respuesta del servidor:", data);

      if (data.ok) {
        showMessage("✓ ¡Login exitoso! Redirigiendo...", false);
        setTimeout(() => redirectByRole(data.me.rol), 400);
      } else {
        const errorMsg = data.error || "Usuario o contraseña incorrectos";
        showMessage(`✗ ${errorMsg}`);
        passwordInput.value = "";
        passwordInput.focus();
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      showMessage(error.message || "Error de conexión con el servidor.");
    } finally {
      loginBtn.textContent = originalText;
      loginBtn.disabled = false;
    }
  }

  async function init() {
    console.log("Inicializando sistema de login...");

    const hasSession = await checkExistingSession();

    if (!hasSession) {
      form.addEventListener("submit", handleLogin);

      if (usuarioInput) {
        usuarioInput.focus();
        // ❗ esto es solo para testing; bórralo si no quieres autollenar
        // usuarioInput.value = "admin";
        // passwordInput.value = "1234";
      }

      [usuarioInput, passwordInput].forEach((input) => {
        if (!input) return;
        input.addEventListener("keypress", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            form.dispatchEvent(new Event("submit"));
          }
        });
      });

      console.log("Formulario de login listo");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
