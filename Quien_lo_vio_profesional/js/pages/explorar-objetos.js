import { supabase } from '../supabase.js';
import { protegerPagina } from '../proteger-pagina.js';

document.addEventListener('DOMContentLoaded', async () => {

    // PROTEGER LA PÁGINA
    const accesoPermitido = await protegerPagina();
    if (!accesoPermitido) return;

    // ELEMENTOS HTML
    const buscador = document.getElementById('buscar-objetos');
    const filtroTipo = document.getElementById('tipo-objeto');
    const filtroCategoria = document.getElementById('categoria-objeto');
    const resultados = document.getElementById('resultados-objetos');

    let objetosPerdidos = [];
    let objetosEncontrados = [];
    let usuarioActual = null;

    // OBTENER USUARIO AUTENTICADO
    const { data: { user }, error: errorUsuario } =
        await supabase.auth.getUser();

    if (errorUsuario || !user) {
        window.location.href = 'login.html';
        return;
    }

    usuarioActual = user;

    // CREAR ESTILOS DE LA VENTANA
    const estilosModal = document.createElement('style');

    estilosModal.textContent = `
        .modal-explorar {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: rgba(0, 0, 0, 0.65);
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 15px;
            overflow-y: auto;
        }

        .modal-explorar.oculto {
            display: none;
        }

        .modal-explorar-contenido {
            background: white;
            width: 100%;
            max-width: 550px;
            max-height: 90vh;
            overflow-y: auto;
            border-radius: 16px;
            padding: 25px;
            position: relative;
            box-shadow: 0 10px 35px rgba(0,0,0,.25);
        }

        .modal-explorar-cerrar {
            position: absolute;
            right: 15px;
            top: 12px;
            border: none;
            background: #f1f1f1;
            width: 35px;
            height: 35px;
            border-radius: 50%;
            font-size: 22px;
            cursor: pointer;
        }

        .modal-explorar-imagen {
            width: 100%;
            max-height: 280px;
            object-fit: contain;
            border-radius: 12px;
            background: #f5f5f5;
            margin: 15px 0;
        }

        .modal-explorar h2 {
            margin: 12px 0;
        }

        .modal-explorar-detalles p {
            margin: 10px 0;
            line-height: 1.5;
        }

        .modal-explorar-botones {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 22px;
        }

        .modal-explorar-botones button {
            width: 100%;
            padding: 13px;
            border: none;
            border-radius: 9px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 600;
        }

        .btn-contactar-objeto {
            background: #2563eb;
            color: white;
        }

        .btn-contactar-objeto:hover {
            background: #1d4ed8;
        }

        .btn-contactar-info {
            background: #16803c;
            color: white;
        }

        .btn-contactar-info:hover {
            background: #11632e;
        }

        .btn-contactar-objeto:disabled,
        .btn-contactar-info:disabled {
            opacity: .6;
            cursor: not-allowed;
        }

        .tarjeta-explorar {
            cursor: pointer;
        }

        .tarjeta-explorar:hover {
            transform: translateY(-3px);
            transition: .2s;
        }

        @media (max-width: 600px) {
            .modal-explorar {
                padding: 10px;
                align-items: center;
            }

            .modal-explorar-contenido {
                padding: 18px;
                max-height: 92vh;
            }

            .modal-explorar-imagen {
                max-height: 220px;
            }
        }
    `;

    document.head.appendChild(estilosModal);

    // CREAR VENTANA EMERGENTE
    const modal = document.createElement('div');

    modal.id = 'modal-explorar';
    modal.className = 'modal-explorar oculto';

    modal.innerHTML = `
        <div class="modal-explorar-contenido">

            <button
                type="button"
                class="modal-explorar-cerrar"
                id="cerrar-modal-explorar"
                aria-label="Cerrar"
            >×</button>

            <div id="contenido-modal-explorar"></div>

        </div>
    `;

    document.body.appendChild(modal);

    const contenidoModal = document.getElementById(
        'contenido-modal-explorar'
    );

    let objetoSeleccionado = null;

    // CARGAR OBJETOS DESDE SUPABASE
    async function cargarObjetos() {

        resultados.innerHTML = '<p>Cargando objetos...</p>';

        const [perdidos, encontrados] = await Promise.all([

            supabase
                .from('objetos_perdidos')
                .select('*')
                .order('fecha_registro', { ascending: false }),

            supabase
                .from('objetos_encontrados')
                .select('*')
                .order('fecha_registro', { ascending: false })

        ]);

        if (perdidos.error || encontrados.error) {

            console.error(perdidos.error, encontrados.error);

            resultados.innerHTML =
                '<p>No se pudieron cargar los objetos. Intenta nuevamente.</p>';

            return;
        }

        objetosPerdidos = (perdidos.data || []).map(objeto => ({
            ...objeto,
            tipo: 'perdido',
            lugar: objeto.lugar_perdida,
            fecha: objeto.fecha_perdida
        }));

        objetosEncontrados = (encontrados.data || []).map(objeto => ({
            ...objeto,
            tipo: 'encontrado',
            lugar: objeto.lugar_encontrado,
            fecha: objeto.fecha_encontrado
        }));

        cargarCategorias();
        mostrarObjetos();
    }

    // NORMALIZAR TEXTO
    function normalizar(texto) {

        return String(texto || '')
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    // CARGAR CATEGORÍAS
    function cargarCategorias() {

        const categorias = [
            ...objetosPerdidos,
            ...objetosEncontrados
        ]
            .map(objeto => objeto.categoria)
            .filter(categoria =>
                categoria && categoria.trim() !== ''
            );

        const categoriasUnicas = new Map();

        categorias.forEach(categoria => {

            const clave = normalizar(categoria);

            if (!categoriasUnicas.has(clave)) {
                categoriasUnicas.set(clave, categoria.trim());
            }

        });

        filtroCategoria.innerHTML =
            '<option value="todas">Todas las categorías</option>';

        [...categoriasUnicas.entries()]
            .sort((a, b) => a[1].localeCompare(b[1], 'es'))
            .forEach(([valor, nombre]) => {

                const opcion = document.createElement('option');

                opcion.value = valor;
                opcion.textContent = nombre;

                filtroCategoria.appendChild(opcion);
            });
    }

    // CONVERTIR FECHA
    function mostrarFecha(fecha) {

        if (!fecha) return 'Fecha no especificada';

        const partes = fecha.split('-');

        if (partes.length !== 3) return fecha;

        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    // MOSTRAR OBJETOS
    function mostrarObjetos() {

        const busqueda = normalizar(buscador.value);
        const tipo = filtroTipo.value;
        const categoria = filtroCategoria.value;

        let lista = [
            ...objetosPerdidos,
            ...objetosEncontrados
        ];

        // MOSTRAR SOLAMENTE OBJETOS ACTIVOS
        lista = lista.filter(objeto =>
            !objeto.estado || objeto.estado === 'activo'
        );

        // FILTRAR POR TIPO
        if (tipo === 'perdidos') {
            lista = lista.filter(objeto =>
                objeto.tipo === 'perdido'
            );
        }

        if (tipo === 'encontrados') {
            lista = lista.filter(objeto =>
                objeto.tipo === 'encontrado'
            );
        }

        // FILTRAR POR CATEGORÍA
        if (categoria !== 'todas') {

            lista = lista.filter(objeto =>
                normalizar(objeto.categoria) === categoria
            );
        }

        // FILTRAR POR BÚSQUEDA
        if (busqueda) {

            lista = lista.filter(objeto => {

                const contenido = normalizar([
                    objeto.nombre_objeto,
                    objeto.descripcion,
                    objeto.marca,
                    objeto.color,
                    objeto.lugar,
                    objeto.categoria
                ].join(' '));

                return contenido.includes(busqueda);
            });
        }

        // SIN RESULTADOS
        if (lista.length === 0) {

            resultados.innerHTML = `
                <div class="empty-state">
                    <h3>No encontramos objetos</h3>
                    <p>
                        No hay publicaciones que coincidan con tu búsqueda.
                        Intenta cambiar los filtros.
                    </p>
                </div>
            `;

            return;
        }

        // CREAR TARJETAS
        resultados.innerHTML = `
            <div class="reportes-lista">
                ${lista.map(objeto => crearTarjeta(objeto)).join('')}
            </div>
        `;
    }

    // CREAR TARJETA
    function crearTarjeta(objeto) {

        const esPerdido = objeto.tipo === 'perdido';

        const tipoTexto = esPerdido
            ? 'Objeto perdido'
            : 'Objeto encontrado';

        const claseTipo = esPerdido
            ? 'perdido'
            : 'encontrado';

        const imagen = objeto.imagen_url
            ? `<img
                    src="${escapar(objeto.imagen_url)}"
                    alt="${escapar(objeto.nombre_objeto)}"
                    class="imagen-objeto"
                >`
            : `<div class="imagen-sin-foto">📦</div>`;

        return `
            <article
                class="reporte-card tarjeta-explorar"
                data-id="${escapar(objeto.id)}"
                data-tipo="${objeto.tipo}"
                role="button"
                tabindex="0"
                aria-label="Ver detalles de ${escapar(objeto.nombre_objeto)}"
            >

                ${imagen}

                <div class="reporte-info">

                    <span class="mi-reporte-estado ${claseTipo}">
                        ${tipoTexto}
                    </span>

                    <h3>${escapar(objeto.nombre_objeto)}</h3>

                    <p>
                        ${escapar(objeto.descripcion || 'Sin descripción')}
                    </p>

                    <p>
                        <strong>Categoría:</strong>
                        ${escapar(objeto.categoria || 'No especificada')}
                    </p>

                    <p>
                        <strong>Marca:</strong>
                        ${escapar(objeto.marca || 'No especificada')}
                    </p>

                    <p>
                        <strong>Color:</strong>
                        ${escapar(objeto.color || 'No especificado')}
                    </p>

                    <p>
                        <strong>Lugar:</strong>
                        ${escapar(objeto.lugar || 'No especificado')}
                    </p>

                    <p>
                        <strong>Fecha:</strong>
                        ${mostrarFecha(objeto.fecha)}
                    </p>

                    <small>Haz clic para ver los detalles</small>

                </div>

            </article>
        `;
    }

    // ABRIR VENTANA DE DETALLES
    function abrirModal(objeto) {

        objetoSeleccionado = objeto;

        const esPerdido = objeto.tipo === 'perdido';

        const esPropietario =
            obtenerIdReportante(objeto) === usuarioActual.id;

        const imagen = objeto.imagen_url
            ? `<img
                    src="${escapar(objeto.imagen_url)}"
                    class="modal-explorar-imagen"
                    alt="${escapar(objeto.nombre_objeto)}"
                >`
            : `<div class="imagen-sin-foto">📦</div>`;

        contenidoModal.innerHTML = `

            <span class="mi-reporte-estado ${esPerdido ? 'perdido' : 'encontrado'}">
                ${esPerdido ? 'Objeto perdido' : 'Objeto encontrado'}
            </span>

            <h2>${escapar(objeto.nombre_objeto)}</h2>

            ${imagen}

            <div class="modal-explorar-detalles">

                <p>
                    <strong>Descripción:</strong>
                    ${escapar(objeto.descripcion || 'Sin descripción')}
                </p>

                <p>
                    <strong>Categoría:</strong>
                    ${escapar(objeto.categoria || 'No especificada')}
                </p>

                <p>
                    <strong>Marca:</strong>
                    ${escapar(objeto.marca || 'No especificada')}
                </p>

                <p>
                    <strong>Color:</strong>
                    ${escapar(objeto.color || 'No especificado')}
                </p>

                <p>
                    <strong>Lugar:</strong>
                    ${escapar(objeto.lugar || 'No especificado')}
                </p>

                <p>
                    <strong>Fecha:</strong>
                    ${mostrarFecha(objeto.fecha)}
                </p>

            </div>

            ${
                esPropietario
                    ? `
                        <p>
                            Esta es tu propia publicación.
                        </p>
                    `
                    : `
                        <div class="modal-explorar-botones">

                            <button
                                type="button"
                                class="btn-contactar-objeto"
                                id="btn-encontre"
                            >
                                ${esPerdido ? 'Encontré este objeto' : 'Tengo información'}
                            </button>

                            <button
                                type="button"
                                class="btn-contactar-info"
                                id="btn-informacion"
                            >
                                ${esPerdido ? 'Tengo información' : 'Quiero contactar'}
                            </button>

                        </div>
                    `
            }
        `;

        modal.classList.remove('oculto');

        const botonEncontre = document.getElementById('btn-encontre');
        const botonInformacion = document.getElementById('btn-informacion');

        if (botonEncontre) {

            botonEncontre.addEventListener('click', () => {
                iniciarContacto(objeto, 'encontre');
            });

        }

        if (botonInformacion) {

            botonInformacion.addEventListener('click', () => {
                iniciarContacto(objeto, 'informacion');
            });

        }
    }

    // OBTENER ID DEL REPORTANTE
    function obtenerIdReportante(objeto) {

        return objeto.usuario_id ||
            objeto.id_usuario ||
            objeto.reportante_id ||
            null;
    }

    // INICIAR O REUTILIZAR CONVERSACIÓN
    async function iniciarContacto(objeto, tipoContacto) {

        const reportanteId = obtenerIdReportante(objeto);
        const interesadoId = usuarioActual.id;

        if (!reportanteId) {

            alert(
                'No se pudo identificar al usuario que publicó este objeto.'
            );

            console.error('Objeto sin ID de reportante:', objeto);

            return;
        }

        if (reportanteId === interesadoId) {

            alert('No puedes iniciar una conversación contigo mismo.');
            return;
        }

        const boton = tipoContacto === 'encontre'
            ? document.getElementById('btn-encontre')
            : document.getElementById('btn-informacion');

        if (boton) {
            boton.disabled = true;
            boton.textContent = 'Abriendo conversación...';
        }

        try {

            // BUSCAR CONVERSACIÓN EXISTENTE EN AMBAS DIRECCIONES
            const { data: conversaciones, error: errorBusqueda } =
                await supabase
                    .from('conversaciones')
                    .select('id')
                    .or(
                        `and(reportante_id.eq.${reportanteId},interesado_id.eq.${interesadoId}),and(reportante_id.eq.${interesadoId},interesado_id.eq.${reportanteId})`
                    )
                    .limit(1);

            if (errorBusqueda) {
                throw errorBusqueda;
            }

            let idConversacion = conversaciones?.[0]?.id;

            // CREAR CONVERSACIÓN SI NO EXISTE
            if (!idConversacion) {

                const nuevaConversacion = {
                    objeto_perdido_id:
                        objeto.tipo === 'perdido' ? objeto.id : null,

                    reportante_id: reportanteId,
                    interesado_id: interesadoId,
                    tipo_contacto: tipoContacto
                };

                const { data: creada, error: errorCrear } =
                    await supabase
                        .from('conversaciones')
                        .insert(nuevaConversacion)
                        .select('id')
                        .single();

                if (errorCrear) {

                    // SI OTRO PROCESO LA CREÓ AL MISMO TIEMPO,
                    // BUSCAR Y REUTILIZAR ESA CONVERSACIÓN
                    if (errorCrear.code === '23505') {

                        const { data: existente, error: errorExistente } =
                            await supabase
                                .from('conversaciones')
                                .select('id')
                                .or(
                                    `and(reportante_id.eq.${reportanteId},interesado_id.eq.${interesadoId}),and(reportante_id.eq.${interesadoId},interesado_id.eq.${reportanteId})`
                                )
                                .limit(1);

                        if (errorExistente) {
                            throw errorExistente;
                        }

                        idConversacion = existente?.[0]?.id;

                        if (!idConversacion) {
                            throw errorCrear;
                        }

                    } else {
                        throw errorCrear;
                    }

                } else {

                    idConversacion = creada.id;

                }
            }

            // CREAR MENSAJE INICIAL
            const nombreObjeto = objeto.nombre_objeto || 'un objeto';

            const contenidoMensaje = tipoContacto === 'encontre'
                ? `Hola, encontré el objeto "${nombreObjeto}" que publicaste. Me gustaría ponerme en contacto contigo.`
                : `Hola, tengo información sobre el objeto "${nombreObjeto}" que publicaste.`;

            const { error: errorMensaje } = await supabase
                .from('mensajes')
                .insert({

                    conversacion_id: idConversacion,
                    remitente_id: interesadoId,

                    // La columna referencia objetos_perdidos.
                    // Para objetos encontrados se deja sin referencia.
                    objeto_perdido_id:
                        objeto.tipo === 'perdido' ? objeto.id : null,

                    contenido: contenidoMensaje

                });

            if (errorMensaje) {
                throw errorMensaje;
            }

            // CERRAR MODAL Y ABRIR CHAT
            modal.classList.add('oculto');

            window.location.href =
                `mensajes.html?conversacion=${encodeURIComponent(idConversacion)}`;

        } catch (error) {

            console.error('ERROR AL INICIAR CONVERSACIÓN:', error);

            alert(
                'No se pudo abrir la conversación: ' + error.message
            );

            if (boton) {
                boton.disabled = false;

                boton.textContent = tipoContacto === 'encontre'
                    ? 'Encontré este objeto'
                    : 'Tengo información';
            }
        }
    }

    // CERRAR VENTANA
    function cerrarModal() {

        modal.classList.add('oculto');
        objetoSeleccionado = null;
    }

    document.getElementById('cerrar-modal-explorar')
        .addEventListener('click', cerrarModal);

    modal.addEventListener('click', (e) => {

        if (e.target === modal) {
            cerrarModal();
        }

    });

    document.addEventListener('keydown', (e) => {

        if (e.key === 'Escape') {
            cerrarModal();
        }

    });

    // DETECTAR CLIC EN LAS TARJETAS
    resultados.addEventListener('click', (e) => {

        const tarjeta = e.target.closest('.tarjeta-explorar');

        if (!tarjeta) return;

        const id = tarjeta.dataset.id;
        const tipo = tarjeta.dataset.tipo;

        const lista = tipo === 'perdido'
            ? objetosPerdidos
            : objetosEncontrados;

        const objeto = lista.find(item =>
            String(item.id) === String(id)
        );

        if (objeto) {
            abrirModal(objeto);
        }

    });

    // PERMITIR ABRIR TARJETAS CON ENTER
    resultados.addEventListener('keydown', (e) => {

        if (e.key !== 'Enter' && e.key !== ' ') return;

        const tarjeta = e.target.closest('.tarjeta-explorar');

        if (!tarjeta) return;

        e.preventDefault();

        const lista = tarjeta.dataset.tipo === 'perdido'
            ? objetosPerdidos
            : objetosEncontrados;

        const objeto = lista.find(item =>
            String(item.id) === String(tarjeta.dataset.id)
        );

        if (objeto) {
            abrirModal(objeto);
        }

    });

    // PROTEGER TEXTO MOSTRADO EN HTML
    function escapar(texto) {

        return String(texto ?? '').replace(/[&<>"']/g, caracter => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[caracter]);
    }

    // EVENTOS DE LOS FILTROS
    buscador.addEventListener('input', mostrarObjetos);
    filtroTipo.addEventListener('change', mostrarObjetos);
    filtroCategoria.addEventListener('change', mostrarObjetos);

    // INICIAR
    await cargarObjetos();

});
