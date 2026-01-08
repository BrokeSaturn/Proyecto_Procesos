// login.js - Lógica para la página de login

document.addEventListener('DOMContentLoaded', function() {
    let rolSeleccionado = null;
    const rolOptions = document.querySelectorAll('.rol-option');
    
    // Seleccionar rol
    rolOptions.forEach(option => {
        option.addEventListener('click', function() {
            rolOptions.forEach(opt => opt.classList.remove('seleccionado'));
            this.classList.add('seleccionado');
            rolSeleccionado = this.dataset.rol;
            document.getElementById('error-rol').style.display = 'none';
        });
    });

    // Manejar envío del formulario
    document.getElementById('form-login').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const nombre = document.getElementById('input-nombre').value.trim();
        let hayError = false;

        // Validación simple
        if (!nombre) {
            document.getElementById('error-nombre').style.display = 'block';
            hayError = true;
        } else {
            document.getElementById('error-nombre').style.display = 'none';
        }

        if (!rolSeleccionado) {
            document.getElementById('error-rol').style.display = 'block';
            hayError = true;
        } else {
            document.getElementById('error-rol').style.display = 'none';
        }

        if (!hayError) {
            // Guardar datos en localStorage
            localStorage.setItem('usuario_nombre', nombre);
            localStorage.setItem('usuario_rol', rolSeleccionado);
            
            // Redirigir según el rol
            if (rolSeleccionado === 'usuario') {
                window.location.href = 'usuario/usuario.html';
            } else if (rolSeleccionado === 'admin') {
                window.location.href = 'admin/admin.html';
            }
        }
    });

    // Auto-seleccionar primer rol
    if (rolOptions.length > 0 && !rolSeleccionado) {
        rolOptions[0].click();
    }
});