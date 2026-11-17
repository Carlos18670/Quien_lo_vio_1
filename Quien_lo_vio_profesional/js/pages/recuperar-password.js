
import { supabase } from '../supabase.js';

document.addEventListener('DOMContentLoaded', () => {

    const seccionCorreo = document.getElementById('seccion-correo');
    const seccionPassword = document.getElementById('seccion-password');

    const formRecuperar = document.getElementById('form-recuperar');
    const formNuevaPassword = document.getElementById('form-nueva-password');

    const mensaje = document.getElementById('mensaje-recuperacion');

    const botonEnviar = document.getElementById('btn-enviar');
    const botonActualizar = document.getElementById('btn-actualizar');

    let modoRecuperacion = false;

    // MOSTRAR MENSAJES
    function mostrarMensaje(texto, color = '#333') {
        mensaje.textContent = texto;
        mensaje.style.color = color;
    }

    // MOSTRAR FORMULARIO PARA NUEVA CONTRASEÑA
    function mostrarFormularioPassword() {

        modoRecuperacion = true;

        seccionCorreo.classList.add('oculto');
        seccionPassword.classList.remove('oculto');

        mostrarMensaje(
            'Ahora puedes establecer tu nueva contraseña.',
            '#16803c'
        );
    }

    // DETECTAR EL ENLACE DE RECUPERACIÓN
    supabase.auth.onAuthStateChange((evento, session) => {

        if (evento === 'PASSWORD_RECOVERY' && session) {
            mostrarFormularioPassword();
        }

    });

    // COMPROBAR ERRORES EN EL ENLACE
    const parametros = new URLSearchParams(
        window.location.hash.substring(1)
    );

    if (parametros.get('error')) {

        const descripcion = parametros.get('error_description');

        mostrarMensaje(
            descripcion
                ? decodeURIComponent(descripcion.replace(/\+/g, ' '))
                : 'El enlace de recuperación no es válido o ha expirado.',
            '#dc2626'
        );
    }

    // ENVIAR CORREO DE RECUPERACIÓN
    formRecuperar.addEventListener('submit', async (e) => {

        e.preventDefault();

        const correo = document.getElementById('correo-recuperacion').value.trim();

        if (!correo) {
            mostrarMensaje('Escribe tu correo electrónico.', '#dc2626');
            return;
        }

        botonEnviar.disabled = true;
        botonEnviar.textContent = 'Enviando...';

        mostrarMensaje('Procesando solicitud...');

        try {

            const { error } = await supabase.auth.resetPasswordForEmail(
                correo,
                {
                    redirectTo:
                        window.location.origin + window.location.pathname
                }
            );

            if (error) {
                throw error;
            }

            mostrarMensaje(
                'Si existe una cuenta asociada a ese correo, recibirás un enlace de recuperación. Revisa también la carpeta de spam.',
                '#16803c'
            );

            formRecuperar.reset();

        } catch (error) {

            console.error('ERROR COMPLETO DE SUPABASE:', error);

            mostrarMensaje(
                'No se pudo enviar el correo: ' + error.message,
                '#dc2626'
            );

        } finally {

            botonEnviar.disabled = false;
            botonEnviar.textContent = 'Enviar enlace de recuperación';

        }

    });

    // ACTUALIZAR CONTRASEÑA
    formNuevaPassword.addEventListener('submit', async (e) => {

        e.preventDefault();

        if (!modoRecuperacion) {

            mostrarMensaje(
                'Primero debes abrir el enlace de recuperación recibido por correo.',
                '#dc2626'
            );

            return;
        }

        const password = document.getElementById('nueva-password').value;
        const confirmar = document.getElementById('confirmar-password').value;

        if (password.length < 8) {

            mostrarMensaje(
                'La contraseña debe tener al menos 8 caracteres.',
                '#dc2626'
            );

            return;
        }

        if (password !== confirmar) {

            mostrarMensaje(
                'Las contraseñas no coinciden.',
                '#dc2626'
            );

            return;
        }

        botonActualizar.disabled = true;
        botonActualizar.textContent = 'Actualizando...';

        try {

            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                throw error;
            }

            mostrarMensaje(
                '¡Contraseña actualizada correctamente!',
                '#16803c'
            );

            formNuevaPassword.reset();

            await supabase.auth.signOut();

            setTimeout(() => {

                window.location.href = 'login.html';

            }, 2000);

        } catch (error) {

            console.error('ERROR AL ACTUALIZAR CONTRASEÑA:', error);

            mostrarMensaje(
                'No se pudo actualizar la contraseña: ' + error.message,
                '#dc2626'
            );

        } finally {

            botonActualizar.disabled = false;
            botonActualizar.textContent = 'Cambiar contraseña';

        }

    });

});
