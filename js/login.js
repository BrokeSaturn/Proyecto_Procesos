(function() {
    console.log("=== INICIANDO SISTEMA DE LOGIN ===");
    
    // Elementos del DOM
    const form = document.getElementById('form-login');
    const usuarioInput = document.getElementById('input-usuario');
    const passwordInput = document.getElementById('input-password');
    const errorDiv = document.getElementById('error-general');
    const loginBtn = document.getElementById('btn-login');
    
    if (!form) {
        console.error("No se encontró el formulario de login");
        return;
    }
    
    // Función para mostrar mensajes
    function showMessage(message, isError = true) {
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = message ? 'block' : 'none';
            errorDiv.style.color = isError ? '#dc2626' : '#15803d';
            errorDiv.style.backgroundColor = isError ? '#fee2e2' : '#dcfce7';
            errorDiv.style.padding = '12px';
            errorDiv.style.borderRadius = '8px';
            errorDiv.style.margin = '15px 0';
            errorDiv.style.fontSize = '14px';
        }
        console.log(isError ? 'ERROR:' : 'INFO:', message);
    }
    
    // Función para redirigir según rol
    function redirectByRole(rol) {
        rol = String(rol || '').toLowerCase();
        let page = 'pages/usuario.html';
        
        if (rol === 'admin') page = 'pages/admin.html';
        else if (rol === 'encargado') page = 'pages/encargado.html';
        
        console.log(`Redirigiendo a: ${page} (rol: ${rol})`);
        window.location.href = page;
    }
    
    // Verificar si ya hay sesión activa
    async function checkExistingSession() {
        try {
            console.log('Verificando sesión existente...');
            const response = await fetch('server/api.php?action=me', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            const data = await response.json();
            console.log('Respuesta de verificación de sesión:', data);
            
            if (data.ok && data.me) {
                console.log('Sesión ya activa para:', data.me.nombre_usuario);
                redirectByRole(data.me.rol);
                return true;
            }
        } catch (error) {
            console.log('No hay sesión activa o error de conexión:', error.message);
        }
        return false;
    }
    
    // Manejar el envío del formulario
    async function handleLogin(event) {
        event.preventDefault();
        
        // Limpiar mensajes anteriores
        showMessage('');
        
        // Obtener valores
        const usuario = usuarioInput.value.trim();
        const password = passwordInput.value;
        
        // Validaciones básicas
        if (!usuario) {
            showMessage('Por favor, ingresa tu usuario');
            usuarioInput.focus();
            return;
        }
        
        if (!password) {
            showMessage('Por favor, ingresa tu contraseña');
            passwordInput.focus();
            return;
        }
        
        // Cambiar estado del botón
        const originalText = loginBtn.textContent;
        loginBtn.textContent = 'Verificando...';
        loginBtn.disabled = true;
        
        try {
            console.log('Enviando solicitud de login...');
            
            // Enviar solicitud de login
            const response = await fetch('server/api.php?action=login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include', // IMPORTANTE para cookies
                body: JSON.stringify({
                    nombre_usuario: usuario,
                    password: password
                })
            });
            
            const data = await response.json();
            console.log('Respuesta del servidor:', data);
            
            if (data.ok) {
                showMessage('✓ ¡Login exitoso! Redirigiendo...', false);
                console.log('Usuario autenticado:', data.me);
                
                // Pequeña pausa para mostrar el mensaje
                setTimeout(() => {
                    redirectByRole(data.me.rol);
                }, 800);
                
            } else {
                // Mostrar error
                const errorMsg = data.error || 'Usuario o contraseña incorrectos';
                showMessage(`✗ ${errorMsg}`);
                
                // Limpiar contraseña y dar focus
                passwordInput.value = '';
                passwordInput.focus();
            }
            
        } catch (error) {
            console.error('Error de conexión:', error);
            showMessage('Error de conexión con el servidor. Verifica que el servidor esté funcionando.');
        } finally {
            // Restaurar botón
            loginBtn.textContent = originalText;
            loginBtn.disabled = false;
        }
    }
    
    // Inicializar
    async function init() {
        console.log('Inicializando sistema de login...');
        
        // Verificar sesión existente
        const hasSession = await checkExistingSession();
        
        if (!hasSession) {
            // Configurar eventos solo si no hay sesión
            form.addEventListener('submit', handleLogin);
            
            // Auto-focus en usuario
            if (usuarioInput) {
                usuarioInput.focus();
                usuarioInput.value = 'admin'; // Pre-llenar para testing
                passwordInput.value = '1234'; // Pre-llenar para testing
            }
            
            // Permitir Enter para enviar
            [usuarioInput, passwordInput].forEach(input => {
                if (input) {
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            form.dispatchEvent(new Event('submit'));
                        }
                    });
                }
            });
            
            console.log('Formulario de login listo');
        }
    }
    
    // Ejecutar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();