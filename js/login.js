document.addEventListener("DOMContentLoaded", () => {
  let rolSeleccionado = null;
  const rolOptions = document.querySelectorAll(".rol-option");
  const form = document.getElementById("form-login");
  const inputNombre = document.getElementById("input-nombre");
  const errNombre = document.getElementById("error-nombre");
  const errRol = document.getElementById("error-rol");

  function seleccionarRol(option) {
    rolOptions.forEach((opt) => opt.classList.remove("seleccionado"));
    option.classList.add("seleccionado");
    rolSeleccionado = option.dataset.rol;
    errRol.style.display = "none";
  }

  rolOptions.forEach((option) => {
    option.addEventListener("click", () => seleccionarRol(option));
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const nombre = inputNombre.value.trim();
    let hayError = false;

    if (!nombre) {
      errNombre.style.display = "block";
      hayError = true;
    } else {
      errNombre.style.display = "none";
    }

    if (!rolSeleccionado) {
      errRol.style.display = "block";
      hayError = true;
    } else {
      errRol.style.display = "none";
    }

    if (hayError) return;

    localStorage.setItem("usuario_nombre", nombre);
    localStorage.setItem("usuario_rol", rolSeleccionado);

    // index.html está en raíz -> rutas correctas sin "../"
    if (rolSeleccionado === "usuario") window.location.href = "pages/usuario.html";
    if (rolSeleccionado === "admin") window.location.href = "pages/admin.html";
    if (rolSeleccionado === "encargado") window.location.href = "pages/encargado.html";

  });

  if (rolOptions.length > 0) seleccionarRol(rolOptions[0]);
});
