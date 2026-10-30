/* =====================================================================
   UNIMO · AVENTURA EN EL BOSQUE — Lógica de todo el juego
   Base: código de la profe (15 secciones) con personaje, enemigo,
   escenario, mapa y rampa propios.

   ÍNDICE
     1.  Configuración
     2.  Diseño del nivel (TILEMAP, rampas y estanques)
     3.  Escena, cámara, renderizador y luces
     4.  Texturas desde imágenes (TextureLoader + LoadingManager) y fondo
     5.  Modelos 3D: Unimo (jugador), caracol (enemigo), farol, cabaña
     6.  Construcción del nivel
     7.  Entrada del teclado
     8.  Física y colisiones (bloques + rampa)
     9.  Bloques: romper y cajas misteriosas
     10. Jugador (Unimo)
     11. Enemigos
     12. Partículas y animaciones del nivel
     13. Cámara que sigue al jugador
     14. Interfaz (HUD y pantallas)
     15. Estados del juego y bucle principal (animate)

   SISTEMA DE COORDENADAS:
     - Bloque 1x1x1
     - Eje X -> Derecha (avance del jugador)
     - Eje Y -> Arriba (altura del jugador)
     - Eje Z -> Adelante (profundidad, solo visual: el juego se mueve en X e Y)

   ESTRUCTURA DE CARPETAS
     index.html
     src/css/style.css
     src/js/game.js      ← este archivo
     src/js/recursos.js  (copia de las imágenes como texto: respaldo si falta alguna)
     src/img/unimo-meta.png     (imagen de la pantalla final)
     src/img/texture/    cesped, tierra, tierra-lado, caja, misterio, vacio,
                         roca, tronco, arbol, pino, arbusto, roca-deco, hongo,
                         flor, margarita, pasto, tronco-deco, estrella,
                         cielo, montanas, nubes   (todos .png)
   ===================================================================== */
import * as THREE from 'three';

// Respaldo de imágenes: si falta un archivo en src/img/texture/, se usa la copia de recursos.js.
// Se importa con await import() dentro de try/catch para que el juego arranque aunque recursos.js no esté.
let RECURSOS = {};
try {
    ({ RECURSOS } = await import('./recursos.js'));
} catch (e) {
    console.warn('No se encontró src/js/recursos.js: solo se usarán las imágenes de la carpeta texture.', e);
}


/* =====================================================================
   1. CONFIGURACIÓN
   Cambiar estos números cambia cómo "se siente" el juego.
   ===================================================================== */
const CONFIG = {
    GRAVEDAD: -32,          // aceleración hacia abajo (unidades/segundo²)
    VEL_CAMINAR: 6,         // velocidad máxima caminando
    VEL_CORRER: 9,          // velocidad máxima con SHIFT
    ACELERACION: 40,        // qué tan rápido alcanza la velocidad máxima
    FRICCION: 30,           // qué tan rápido frena al soltar las teclas
    FUERZA_SALTO: 15,       // velocidad vertical inicial del salto (sube ≈ 3.5 bloques). El mapa está
                            // diseñado con este valor: las plataformas altas necesitan ≈ 3.3, así que NO bajar de 15
    MULT_CAIDA: 1.6,        // al CAER la gravedad es mayor: el salto se siente firme y no flotante
    REBOTE_PISADA: 0.75,    // al pisar un enemigo rebota FUERZA_SALTO * este valor
    CORTE_SALTO: 0.45,      // si sueltas el botón antes, el salto se corta
    VEL_MAX_CAIDA: -20,     // límite de velocidad al caer
    TIEMPO_COYOTE: 0.1,     // gracia para saltar justo después de salir del borde
    BUFFER_SALTO: 0.12,     // si presionas saltar un poco antes de tocar el suelo, igual salta
    VIDAS_INICIALES: 3,
    TIEMPO_NIVEL: 300,      // segundos para completar el nivel
    LIMITE_CAIDA: -5,       // si el jugador baja de esta Y, se cayó al vacío
    VEL_ENEMIGO: 1.0,       // el caracol es lento
    INVULNERABLE: 1.0,      // segundos de invulnerabilidad al reaparecer (parpadea y los enemigos no le hacen daño)
    RADIO_BOLA: 0.4,        // radio de Unimo (su caja de colisión mide el doble)
    RADIO_RECOGER: 0.85,    // a qué distancia (centro a centro) Unimo toma una semilla

    // --- Rampa: Unimo es casi una bolita y rueda cuesta abajo ---
    G_RAMPA: 30,            // qué tanto lo empuja la cuesta (más = acelera más)
    VEL_RODAR: 13,          // velocidad máxima rodando
    FRICCION_RODAR: 5,      // al rodar casi no frena (en plano va perdiendo velocidad poco a poco)
};


/* =====================================================================
   2. DISEÑO DEL NIVEL (TILEMAP)
   Cada carácter es una casilla de 1x1. La PRIMERA fila es la de ARRIBA.
   **************************************************
    BLOQUES (sólidos)
    # Suelo con pasto             T Tierra (relleno de colinas)
    = Plataforma flotante         B Caja de madera (se rompe desde abajo)
    G Caja misteriosa (fruta estelar)   U Caja ya usada (aparece al golpear una G)
    S Roca (escalones)            C Tronco (columna)
    L Tronco flotante (estanque)
    OBJETOS
    E Caracol (enemigo)           K Farol (punto de control)
    o Semilla dorada              P Posición inicial de Unimo
    F Cabaña (meta)
    DECORACIÓN (no choca con nada)
    A árbol   Y pino   a arbusto   r roca   h hongo   f flor azul
    m margarita   g pasto alto   l tronco caído
   ***************************************************** */
const MAPA_NIVEL = [
  "",
  "",
  "                                               G                 G                                                                                       G",
  "                                                                                                                          G",
  "                                              ooo            ooo",
  "                 ooo                          ===           m Y a h Ef  o                                                                                 E",
  "                                         E         oooo    ############   o o                               BGB          oooo                           ====",
  "                GBGBG                   ====       ====   #TTTTTTTTTTTT       o                 o  o                     ====    S                 ooo",
  "           ooo                                           #TTTTTTTTTTTTT         o                               ooo             SSS    C  C",
  "  P f  A ra m aa     ah Y  E  r A ah   Y     E g ah    f#TTTTTTTTTTTTTT           o  ag K A af          Y E  a      E A f      SSSSS h CE C rgaf E    E    a  E A  Y af m F   A ga",
  "####################################  ##################TTTTTTTTTTTTTTT              ######### L LL L ##############################################################################",
];

// Caracteres SÓLIDOS: el jugador choca con ellos.
// OJO: K (farol) y F (cabaña) NO van aquí. No son bloques: son objetos
// que el jugador debe ATRAVESAR para activarlos. Si fueran sólidos, la meta
// sería una pared y nunca se podría ganar.
// U = caja ya usada (no está en el mapa: aparece cuando golpeas una G).
const SOLIDOS = new Set(["#", "T", "=", "B", "G", "S", "C", "L", "U"]);

// RAMPAS: la superficie NO está hecha de bloques, sino de una curva suave.
//   x0..x1 = de dónde a dónde va la rampa (las casillas de esa zona van VACÍAS en el mapa)
//   hIzq / hDer = altura de la superficie en cada extremo
// La curva empieza y termina plana (smoothstep), por eso se une sin escalón con el suelo.
const RAMPAS = [
    { x0: 71, x1: 85, hIzq: 5, hDer: 1 },
];

// ESTANQUES: agua decorativa en los huecos del suelo (x0 inclusive, x1 exclusivo)
const ESTANQUES = [
    { x0: 36, x1: 38 },
    { x0: 94, x1: 102 },
];


/* =====================================================================
   3. ESCENA, CÁMARA, RENDERIZADOR Y LUCES
   ===================================================================== */
const COLOR_CIELO = 0x5aa0ea;

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLOR_CIELO);   // se reemplaza por la imagen del cielo al cargar (sección 4)
// FOG: lo lejano se mezcla con el cielo (da profundidad)
scene.fog = new THREE.Fog(0x7dbdf5, 30, 90);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(5, 5, 14);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // máx. 2: nítido sin exigir demasiado a la GPU
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
    // 1. Actualizar el tamaño del renderizador
    renderer.setSize(window.innerWidth, window.innerHeight);
    // 2. Actualizar la relación de aspecto de la cámara
    camera.aspect = window.innerWidth / window.innerHeight;
    // 3. Recalcular la matriz de proyección con el nuevo aspecto
    camera.updateProjectionMatrix();
});

// LUCES
// Una AmbientLight sola ilumina todo por igual: no hay sombras ni volumen
// (los cubos se ven planos). Por eso combinamos dos luces:
//  - HemisphereLight: luz de relleno, color del cielo arriba y del pasto abajo.
//  - DirectionalLight: el "sol". Es la única de las dos que proyecta sombras.
const luzAmbiente = new THREE.HemisphereLight(0xffffff, 0x7caa5c, 2.2);
scene.add(luzAmbiente);

const luzSol = new THREE.DirectionalLight(0xffffff, 2.6);
luzSol.castShadow = true;
luzSol.shadow.mapSize.set(2048, 2048);     // resolución de la sombra
luzSol.shadow.camera.left = -22;           // zona que recibe sombras
luzSol.shadow.camera.right = 22;
luzSol.shadow.camera.top = 15;
luzSol.shadow.camera.bottom = -10;
luzSol.shadow.camera.near = 1;
luzSol.shadow.camera.far = 60;
scene.add(luzSol);
scene.add(luzSol.target);                  // el objetivo de la luz también va en la escena


/* =====================================================================
   4. TEXTURAS DESDE IMÁGENES
   - TextureLoader descarga una imagen y la convierte en textura.
   - La carga es ASÍNCRONA: load() devuelve la textura de inmediato (vacía)
     y la imagen llega después. Por eso usamos un LoadingManager, que nos
     avisa cuando TODAS las imágenes terminaron de cargar.
   - Las rutas son relativas al index.html (no a este archivo .js).
     Por eso escribimos './src/img/texture/' y no '../img/texture/'.
   - Todas las texturas son pixel art: NearestFilter evita que se vean borrosas.
   ===================================================================== */
const RUTA_TEXTURAS = './src/img/texture/';

// 1. El LoadingManager vigila todas las cargas
const manager = new THREE.LoadingManager();

manager.onProgress = (url, cargadas, total) => {
    // Mostramos el progreso en el botón de jugar
    const boton = document.getElementById('btn-jugar');
    if (boton) boton.textContent = `CARGANDO ${cargadas}/${total}`;
};

manager.onLoad = () => {
    // Todas las texturas listas: habilitamos el botón
    const boton = document.getElementById('btn-jugar');
    if (boton) { boton.textContent = 'JUGAR'; boton.disabled = false; }
};

manager.onError = (url) => {
    // Error típico: la ruta está mal escrita o el archivo no existe.
    if (!url.startsWith('data:')) {
        console.warn(`No se encontró la imagen: ${url}. Se usa la copia de recursos.js. Revisa que esté en src/img/texture/`);
    }
};

// 2. Crear el cargador de texturas usando el manager
const textureLoader = new THREE.TextureLoader(manager);

// 3. Función de ayuda: carga una imagen y la configura
//    corregir: si la imagen no es cuadrada, muestra solo una porción cuadrada (para caras de cubos)
//    alCargar: función opcional que se ejecuta cuando la imagen ya está lista
const imageLoader = new THREE.ImageLoader(manager);

function cargarTextura(archivo, { corregir = true, pixel = true, alCargar } = {}) {
    // Se ejecuta cuando la imagen YA llegó (del archivo o del respaldo)
    const alLlegar = (tex) => {
        if (corregir) {
            // Corrección de proporción: cada cara del cubo es cuadrada (1x1).
            const { width, height } = tex.image;
            if (width > height) tex.repeat.set(height / width, 1);   // más ancha: recortamos en X
            if (height > width) tex.repeat.set(1, width / height);   // más alta: recortamos en Y
        }
        if (alCargar) alCargar(tex);
    };

    // Si el archivo no existe, se carga la copia guardada en recursos.js
    const alFallar = () => {
        const respaldo = RECURSOS[archivo];
        if (!respaldo) return;
        imageLoader.load(respaldo, (imagen) => {
            textura.image = imagen;
            textura.needsUpdate = true;
            alLlegar(textura);
        });
    };

    const textura = textureLoader.load(RUTA_TEXTURAS + archivo, alLlegar, undefined, alFallar);
    // Indica que la imagen está en sRGB. Sin esto los colores se ven lavados.
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.anisotropy = renderer.capabilities.getMaxAnisotropy();
    // Pixel art: al acercarse, los píxeles se ven cuadrados y nítidos
    if (pixel) textura.magFilter = THREE.NearestFilter;
    return textura;
}

// ---------- Cielo (imagen de franjas que se estira a toda la pantalla) ----------
// Hasta que llega la imagen se ve el color liso de scene.background; luego se reemplaza.
cargarTextura('cielo.png', { corregir: false, alCargar: (tex) => { scene.background = tex; } });

// ---------- Texturas de los bloques ----------
const texTierra    = cargarTextura('tierra.png');
// La tierra de relleno es una caja de 1x4: si usamos la imagen una sola vez,
// se ve estirada 4 veces hacia abajo. Con RepeatWrapping + repeat(1, 4)
// la imagen se REPITE 4 veces en vertical y conserva su proporción.
const texTierraRelleno = cargarTextura('tierra.png');
texTierraRelleno.wrapS = THREE.RepeatWrapping;
texTierraRelleno.wrapT = THREE.RepeatWrapping;
texTierraRelleno.repeat.set(1, 4);
const texSuelo     = cargarTextura('cesped.png');       // parte de arriba del suelo
const texSueloLado = cargarTextura('tierra-lado.png');  // lados del suelo (tierra + borde de pasto)
const texCaja      = cargarTextura('caja.png');
const texMisterio  = cargarTextura('misterio.png');
const texUsado     = cargarTextura('vacio.png');
const texRoca      = cargarTextura('roca.png');
const texTronco    = cargarTextura('tronco.png');

// La rampa usa estas dos texturas repetidas (1 imagen por cada unidad del mundo)
const texTierraRampa = cargarTextura('tierra.png');
texTierraRampa.wrapS = texTierraRampa.wrapT = THREE.RepeatWrapping;
const texCespedRampa = cargarTextura('cesped.png');
texCespedRampa.wrapS = texCespedRampa.wrapT = THREE.RepeatWrapping;

// La fruta estelar (tu dibujo) para cuando sale de una caja misteriosa
const texEstrella = cargarTextura('estrella.png', { corregir: false });

// CREAR LOS MATERIALES
// MeshLambertMaterial: material sencillo que reacciona a la luz.
const matSueloLado = new THREE.MeshLambertMaterial({ map: texSueloLado });
const MATERIALES = {
    // Un BoxGeometry tiene 6 caras, en este orden: [+X, -X, +Y (arriba), -Y (abajo), +Z, -Z]
    // Pasando un ARREGLO de materiales, cada cara usa uno distinto.
    suelo: [
        matSueloLado,
        matSueloLado,
        new THREE.MeshLambertMaterial({ map: texSuelo }),   // arriba: pasto
        new THREE.MeshLambertMaterial({ map: texTierra }),  // abajo: tierra
        matSueloLado,
        matSueloLado,
    ],
    tierra:       new THREE.MeshLambertMaterial({ map: texTierraRelleno }),
    tierraBloque: new THREE.MeshLambertMaterial({ map: texTierra }),
    caja:         new THREE.MeshLambertMaterial({ map: texCaja }),
    // emissive: el bloque "brilla" un poco aunque esté en sombra
    misterio:     new THREE.MeshLambertMaterial({ map: texMisterio, emissive: 0x332200 }),
    usado:        new THREE.MeshLambertMaterial({ map: texUsado }),
    roca:         new THREE.MeshLambertMaterial({ map: texRoca }),
    tronco:       new THREE.MeshLambertMaterial({ map: texTronco }),
    // La semilla dorada no usa imagen: un color brillante se ve mejor en un objeto pequeño
    semilla:      new THREE.MeshPhongMaterial({ color: 0xffc414, emissive: 0x6b4200, shininess: 90 }),
    agua:         new THREE.MeshLambertMaterial({ color: 0x3a8de0, transparent: true, opacity: 0.78 }),
    rampaTierra:  new THREE.MeshLambertMaterial({ map: texTierraRampa }),
    rampaPasto:   new THREE.MeshLambertMaterial({ map: texCespedRampa }),
    estrella:     new THREE.MeshBasicMaterial({ map: texEstrella, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }),
};

// Reutilizamos UNA sola geometría para todos los bloques (ahorra memoria)
const GEO_BLOQUE = new THREE.BoxGeometry(1, 1, 1);
const GEO_TIERRA = new THREE.BoxGeometry(1, 4, 1);
const GEO_SEMILLA = new THREE.SphereGeometry(0.2, 14, 10);
const GEO_ESTRELLA = new THREE.PlaneGeometry(0.95, 1.0);

// ---------- Decoración: dibujos planos (sprites) que se colocan DETRÁS de Unimo ----------
// ancho y alto en unidades del mundo (16 píxeles de la imagen = 1 unidad). z = qué tan al fondo.
const DECORADO = {
    'A': { archivo: 'arbol.png',       ancho: 3,   alto: 4,     z: -1.4 },
    'Y': { archivo: 'pino.png',        ancho: 2,   alto: 3,     z: -1.2 },
    'a': { archivo: 'arbusto.png',     ancho: 2,   alto: 1,     z: -0.7 },
    'r': { archivo: 'roca-deco.png',   ancho: 1.5, alto: 0.875, z: -0.7 },
    'h': { archivo: 'hongo.png',       ancho: 1,   alto: 1,     z: -0.6 },
    'f': { archivo: 'flor.png',        ancho: 1,   alto: 1,     z: -0.6 },
    'm': { archivo: 'margarita.png',   ancho: 1,   alto: 1,     z: -0.6 },
    'g': { archivo: 'pasto.png',       ancho: 1,   alto: 1,     z: -0.6 },
    'l': { archivo: 'tronco-deco.png', ancho: 2,   alto: 0.875, z: -0.7 },
};
const MAT_DECOR = {}, GEO_DECOR = {};
for (const [letra, d] of Object.entries(DECORADO)) {
    // Se crean aquí (al inicio) para que el LoadingManager cuente estas imágenes también
    MAT_DECOR[letra] = new THREE.MeshBasicMaterial({
        map: cargarTextura(d.archivo, { corregir: false }),
        transparent: true,
        alphaTest: 0.5,            // los píxeles transparentes no se dibujan
    });
    GEO_DECOR[letra] = new THREE.PlaneGeometry(d.ancho, d.alto);
}

// ---------- Fondo con parallax: montañas y nubes lejanas ----------
// Cada capa es un plano grande y lejano que SIGUE a la cámara. Moviendo la textura
// (offset) más despacio que la cámara, parece que está muy lejos.
const capasFondo = [];
function crearCapaFondo(archivo, { ancho, alto, tile, z, factor, deriva = 0, tipo }) {
    const tex = cargarTextura(archivo, { corregir: false });
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(ancho / tile, 1);
    const malla = new THREE.Mesh(
        new THREE.PlaneGeometry(ancho, alto),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false })
    );
    malla.position.z = z;
    scene.add(malla);
    capasFondo.push({ malla, tex, tile, z, alto, factor, deriva, tipo });
}
// 128 px de montaña = 38.4 unidades (0.3 por píxel)
crearCapaFondo('montanas.png', { ancho: 240, alto: 14.4, tile: 38.4, z: -40, factor: 0.12, tipo: 'montana' });
crearCapaFondo('nubes.png',    { ancho: 240, alto: 19.2, tile: 76.8, z: -30, factor: 0.22, deriva: 0.8, tipo: 'nube' });

function actualizarFondo(tiempo) {
    const cy = camera.position.y;
    for (const c of capasFondo) {
        c.malla.position.x = camera.position.x;
        c.tex.offset.x = (camera.position.x * c.factor + tiempo * c.deriva) / c.tile;
        if (c.tipo === 'montana') {
            // La base de las montañas se alinea con la línea del suelo, vista desde la cámara
            const f = (14 - c.z) / 14;
            c.malla.position.y = cy - (cy - 1) * f - 3 + c.alto / 2;
        } else {
            c.malla.position.y = cy + 4;
        }
    }
}


/* =====================================================================
   5. MODELOS 3D
   Personajes hechos juntando primitivas dentro de un THREE.Group.
   ===================================================================== */

// Ayuda: crea una malla, la ubica y activa sombras
function pieza(geometria, material, x, y, z) {
    const malla = new THREE.Mesh(geometria, material);
    malla.position.set(x, y, z);
    malla.castShadow = true;
    return malla;
}

// ---------- Jugador: Unimo ----------
// El cuerpo, la carita y el tallito van en "cuerpoRot": es lo que GIRA cuando rueda.
// Brazos y piernas van aparte (en "extremidades") y se esconden al rodar: Unimo se hace bolita.
const R_CUERPO = 0.38;
const Y_CENTRO = 0.44;      // altura del centro del cuerpo cuando camina

function crearModeloJugador() {
    const grupo = new THREE.Group();   // el origen del grupo está en los PIES
    const matCuerpo = new THREE.MeshLambertMaterial({ color: 0x0cc510 });
    const matClaro = new THREE.MeshLambertMaterial({ color: 0x48db4f });
    const matOscuro = new THREE.MeshLambertMaterial({ color: 0x06590a });
    const matHoja = new THREE.MeshLambertMaterial({ color: 0x0a9610 });
    const matNegro = new THREE.MeshLambertMaterial({ color: 0x101010 });
    const matMejilla = new THREE.MeshLambertMaterial({ color: 0xff88cc });

    const cuerpoRot = new THREE.Group();
    cuerpoRot.position.y = Y_CENTRO;

    // Cuerpo esférico
    cuerpoRot.add(pieza(new THREE.SphereGeometry(R_CUERPO, 24, 18), matCuerpo, 0, 0, 0));
    // "Tapa" clara arriba y centro oscuro (casquetes de esfera: solo la parte de arriba)
    cuerpoRot.add(pieza(new THREE.SphereGeometry(R_CUERPO + 0.012, 24, 8, 0, Math.PI * 2, 0, Math.PI * 0.3), matClaro, 0, 0, 0));
    cuerpoRot.add(pieza(new THREE.SphereGeometry(R_CUERPO + 0.02, 20, 6, 0, Math.PI * 2, 0, Math.PI * 0.14), matOscuro, 0, 0, 0));
    // Tallito y hojita
    cuerpoRot.add(pieza(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), matNegro, 0, R_CUERPO + 0.08, 0));
    const hoja = pieza(new THREE.BoxGeometry(0.15, 0.05, 0.03), matHoja, 0.07, R_CUERPO + 0.2, 0);
    hoja.rotation.z = 0.5;
    cuerpoRot.add(hoja);
    // Carita (se apoya sobre la superficie de la esfera, mirando a +Z)
    cuerpoRot.add(pieza(new THREE.BoxGeometry(0.07, 0.11, 0.03), matNegro, -0.15, 0.04, 0.35));
    cuerpoRot.add(pieza(new THREE.BoxGeometry(0.07, 0.11, 0.03), matNegro, 0.15, 0.04, 0.35));
    cuerpoRot.add(pieza(new THREE.BoxGeometry(0.1, 0.06, 0.03), matMejilla, -0.22, -0.07, 0.31));
    cuerpoRot.add(pieza(new THREE.BoxGeometry(0.1, 0.06, 0.03), matMejilla, 0.22, -0.07, 0.31));
    cuerpoRot.add(pieza(new THREE.BoxGeometry(0.04, 0.03, 0.02), matOscuro, 0, -0.07, 0.375));
    grupo.add(cuerpoRot);

    // Brazos y piernas: delgaditos y negros, con un pivote para poder girarlos
    const extremidades = new THREE.Group();
    function brazo(lado) {
        const pivote = new THREE.Group();
        pivote.position.set(lado * 0.36, 0.46, 0);
        pivote.add(pieza(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 6), matNegro, 0, -0.11, 0));
        pivote.add(pieza(new THREE.SphereGeometry(0.04, 8, 8), matNegro, 0, -0.23, 0));
        pivote.rotation.z = lado * 0.9;
        return pivote;
    }
    function pierna(lado) {
        const pivote = new THREE.Group();
        pivote.position.set(lado * 0.13, 0.1, 0);
        pivote.add(pieza(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 6), matNegro, 0, -0.05, 0));
        pivote.add(pieza(new THREE.BoxGeometry(0.11, 0.03, 0.09), matNegro, lado * 0.02, -0.095, 0.02));
        return pivote;
    }
    const armIzq = brazo(-1), armDer = brazo(1), legIzq = pierna(-1), legDer = pierna(1);
    extremidades.add(armIzq, armDer, legIzq, legDer);
    grupo.add(extremidades);

    grupo.userData = { cuerpoRot, extremidades, armIzq, armDer, legIzq, legDer };
    return grupo;
}

// ---------- Enemigo: un caracol del bosque (mira hacia +X; se voltea con scale.x) ----------
function crearModeloEnemigo() {
    const grupo = new THREE.Group();
    const matCuerpo = new THREE.MeshLambertMaterial({ color: 0xdcb86a });
    const matConcha = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
    const matEspiral = new THREE.MeshLambertMaterial({ color: 0xd19a5a });
    const matBlanco = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const matNegro = new THREE.MeshBasicMaterial({ color: 0x111111 });

    const cuerpo = pieza(new THREE.SphereGeometry(0.3, 16, 12), matCuerpo, 0.05, 0.14, 0);
    cuerpo.scale.set(1.5, 0.5, 0.85);                    // cuerpo alargado y bajito
    const cabeza = pieza(new THREE.SphereGeometry(0.15, 12, 10), matCuerpo, 0.34, 0.26, 0);
    grupo.add(cuerpo, cabeza);

    for (const z of [-0.07, 0.07]) {                     // dos ojitos en tallos
        grupo.add(pieza(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 6), matCuerpo, 0.38, 0.4, z));
        grupo.add(pieza(new THREE.SphereGeometry(0.05, 8, 8), matBlanco, 0.38, 0.51, z));
        grupo.add(pieza(new THREE.SphereGeometry(0.025, 6, 6), matNegro, 0.415, 0.51, z));
    }

    const concha = pieza(new THREE.SphereGeometry(0.27, 16, 12), matConcha, -0.1, 0.4, 0);
    concha.scale.set(1, 1, 0.8);
    grupo.add(concha);
    // Espiral de la concha: dos anillos (toros) de distinto tamaño en la cara que ve la cámara
    grupo.add(pieza(new THREE.TorusGeometry(0.15, 0.035, 8, 20), matEspiral, -0.1, 0.4, 0.215));
    grupo.add(pieza(new THREE.TorusGeometry(0.075, 0.03, 8, 16), matEspiral, -0.1, 0.4, 0.225));
    return grupo;
}

// ---------- Farol (punto de control) ----------
function crearFarol() {
    const grupo = new THREE.Group();
    const matMadera = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
    grupo.add(pieza(new THREE.CylinderGeometry(0.05, 0.07, 1.6, 8), matMadera, 0, 0.8, 0));
    grupo.add(pieza(new THREE.BoxGeometry(0.4, 0.06, 0.06), matMadera, 0.15, 1.55, 0));
    // La lámpara empieza apagada (gris) y se enciende al pasar
    const lampara = pieza(
        new THREE.BoxGeometry(0.26, 0.34, 0.26),
        new THREE.MeshLambertMaterial({ color: 0x9e9e9e, emissive: 0x000000 }),
        0.3, 1.35, 0
    );
    grupo.add(lampara);
    const techo = pieza(new THREE.ConeGeometry(0.22, 0.18, 4), matMadera, 0.3, 1.61, 0);
    techo.rotation.y = Math.PI / 4;
    grupo.add(techo);
    grupo.userData.tela = lampara;      // (se llama "tela" igual que la bandera de la profe)
    return grupo;
}

// ---------- Cabaña (meta) ----------
function crearCabana() {
    const grupo = new THREE.Group();
    const matPared = new THREE.MeshLambertMaterial({ color: 0xb77a45 });
    const matTecho = new THREE.MeshLambertMaterial({ color: 0xb5523b });
    const matPuerta = new THREE.MeshLambertMaterial({ color: 0x5a3a1e });
    const matVentana = new THREE.MeshLambertMaterial({ color: 0xffe9a0, emissive: 0x886600 });
    const matPiedra = new THREE.MeshLambertMaterial({ color: 0x8d8d96 });
    const matTela = new THREE.MeshLambertMaterial({ color: 0xff595e, side: THREE.DoubleSide });

    grupo.add(pieza(new THREE.BoxGeometry(2.6, 1.6, 1.4), matPared, 0, 0.8, 0));
    const techo = pieza(new THREE.ConeGeometry(2.1, 1.1, 4), matTecho, 0, 2.15, 0);
    techo.rotation.y = Math.PI / 4;
    techo.scale.z = 0.62;
    grupo.add(techo);
    grupo.add(pieza(new THREE.BoxGeometry(0.6, 1.0, 0.05), matPuerta, 0, 0.5, 0.72));
    grupo.add(pieza(new THREE.BoxGeometry(0.5, 0.45, 0.05), matVentana, 0.85, 1.0, 0.72));
    grupo.add(pieza(new THREE.BoxGeometry(0.5, 0.45, 0.05), matVentana, -0.85, 1.0, 0.72));
    grupo.add(pieza(new THREE.BoxGeometry(0.35, 0.7, 0.35), matPiedra, 0.8, 2.3, -0.2));
    grupo.add(pieza(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), matPuerta, 0, 3.1, 0));
    const tela = pieza(new THREE.BoxGeometry(0.5, 0.3, 0.03), matTela, 0.28, 3.3, 0);
    grupo.add(tela);
    grupo.userData.tela = tela;         // la banderita de la cabaña ondea
    return grupo;
}


/* =====================================================================
   6. CONSTRUCCIÓN DEL NIVEL
   Recorremos el mapa de texto y creamos un objeto por cada carácter.
   Los bloques sólidos se guardan en un Map con la clave "x,y" para
   encontrarlos rápido al calcular colisiones.
   IMPORTANTE: construirNivel() se llama UNA vez al iniciar la partida,
   nunca dentro de animate(). Si se llamara en cada cuadro, crearíamos
   cientos de mallas 60 veces por segundo y el juego se volvería lento.
   ===================================================================== */
let grupoNivel = null,
    bloques = new Map(),             // "x,y" -> { x, y, tipo, malla, rebote }
    gemas = [],                      // las semillas doradas
    enemigos = [],
    particulas = [],
    posicionInicial = { x: 2.5, y: 1 },
    puntoControl = null,             // { x, y, bandera, activo }
    banderaMeta = null;              // { x, bandera }

const clave = (x, y) => x + "," + y;

function construirNivel() {
    // Eliminar el grupo de nivel anterior
    if (grupoNivel) scene.remove(grupoNivel);

    grupoNivel = new THREE.Group();
    scene.add(grupoNivel);

    bloques = new Map();
    gemas = [];
    enemigos = [];
    particulas = [];
    puntoControl = null;
    banderaMeta = null;

    RAMPAS.forEach(crearRampa);
    ESTANQUES.forEach(crearEstanque);

    const alto = MAPA_NIVEL.length;
    MAPA_NIVEL.forEach((fila, y) => {
        // Invertir el eje Y: la fila 0 del arreglo es la de ARRIBA del nivel
        const yMundo = alto - 1 - y;

        for (let index = 0; index < fila.length; index++) {
            const element = fila[index];

            if (SOLIDOS.has(element)) {
                crearBloque(index, yMundo, element);         // bloque sólido
            } else if (DECORADO[element]) {
                crearDecoracion(element, index, yMundo);
            } else if (element === "o") {
                crearGema(index, yMundo);
            } else if (element === "E") {
                crearEnemigo(index, yMundo);
            } else if (element === "P") {
                posicionInicial = { x: index + 0.5, y: yMundo };
            } else if (element === "K") {
                const farol = crearFarol();
                farol.position.set(index + 0.5, yMundo, -0.3);
                grupoNivel.add(farol);
                puntoControl = { x: index + 0.5, y: yMundo, bandera: farol, activo: false };
            } else if (element === "F") {
                const cabana = crearCabana();
                cabana.position.set(index + 0.5, yMundo, -1.0);   // un poco atrás: Unimo pasa por delante
                grupoNivel.add(cabana);
                banderaMeta = { x: index + 0.5, bandera: cabana };
            }
        }
    });
}

function crearBloque(x, y, tipo) {
    // Seleccionar el material que se le va a colocar al bloque según su tipo
    const material = {
        "#": MATERIALES.suelo,
        "=": MATERIALES.suelo,
        "T": MATERIALES.tierraBloque,
        "B": MATERIALES.caja,
        "G": MATERIALES.misterio,
        "S": MATERIALES.roca,
        "C": MATERIALES.tronco,
        "L": MATERIALES.tronco,
        "U": MATERIALES.usado,
    }[tipo];

    const malla = new THREE.Mesh(GEO_BLOQUE, material);
    // +0.5 porque el cubo se ubica desde su centro, pero la casilla va de x a x+1
    malla.position.set(x + 0.5, y + 0.5, 0);
    malla.castShadow = true;
    malla.receiveShadow = true;
    grupoNivel.add(malla);
    bloques.set(clave(x, y), { x, y, tipo, malla, rebote: 0 });

    // Debajo del suelo de la fila de abajo agregamos tierra (solo decorativa, sin colisión)
    if (tipo === "#" && y === 0) {
        const tierra = new THREE.Mesh(GEO_TIERRA, MATERIALES.tierra);
        tierra.position.set(x + 0.5, y - 2, 0);
        tierra.receiveShadow = true;
        grupoNivel.add(tierra);
    }
}

function crearDecoracion(letra, x, y) {
    const d = DECORADO[letra];
    const malla = new THREE.Mesh(GEO_DECOR[letra], MAT_DECOR[letra]);
    // La base del dibujo se apoya en el piso de la casilla
    malla.position.set(x + 0.5, y + d.alto / 2, d.z);
    grupoNivel.add(malla);
}

function crearGema(x, y) {
    const malla = new THREE.Mesh(GEO_SEMILLA, MATERIALES.semilla);
    malla.scale.set(0.85, 1.15, 0.85);          // alargada, como el huevito dorado de la referencia
    malla.position.set(x + 0.5, y + 0.5, 0);
    malla.castShadow = true;
    grupoNivel.add(malla);
    gemas.push({ x, y, malla, recogida: false });
}

function crearEnemigo(x, y) {
    const malla = crearModeloEnemigo();
    grupoNivel.add(malla);
    enemigos.push({
        x: x + 0.5, y: y,          // x = centro, y = base (pies)
        vx: 0, vy: 0,
        ancho: 0.8, alto: 0.7,     // caja de colisión
        direccion: -1,             // empieza caminando a la izquierda
        vivo: true,
        tiempoMuerto: 0,
        malla,
    });
}

// ---------- Rampa: curva suave hecha con una forma extruida ----------
// Altura de la superficie en la posición x (smoothstep: empieza y termina plana)
function alturaRampa(r, x) {
    const t = Math.min(1, Math.max(0, (x - r.x0) / (r.x1 - r.x0)));
    const s = t * t * (3 - 2 * t);
    return r.hIzq + (r.hDer - r.hIzq) * s;
}

// Pendiente (derivada) de esa curva: cuánto sube o baja por cada unidad en x
function pendienteRampa(r, x) {
    const t = Math.min(1, Math.max(0, (x - r.x0) / (r.x1 - r.x0)));
    return (r.hDer - r.hIzq) * (6 * t * (1 - t)) / (r.x1 - r.x0);
}

function rampaEn(x) {
    return RAMPAS.find(r => x >= r.x0 && x <= r.x1) || null;
}

function crearRampa(r) {
    const N = 48;                                   // cuántos tramitos forman la curva
    const pts = [];
    for (let i = 0; i <= N; i++) {
        const x = r.x0 + (r.x1 - r.x0) * i / N;
        pts.push([x, alturaRampa(r, x)]);
    }

    // 1) Tierra: polígono desde la superficie hasta y = -4, extruido 1 unidad de profundidad
    const formaTierra = new THREE.Shape();
    formaTierra.moveTo(r.x0, -4);
    pts.forEach(([x, y]) => formaTierra.lineTo(x, y));
    formaTierra.lineTo(r.x1, -4);
    formaTierra.closePath();
    const geoTierra = new THREE.ExtrudeGeometry(formaTierra, { depth: 1, bevelEnabled: false });
    geoTierra.translate(0, 0, -0.5);
    const tierra = new THREE.Mesh(geoTierra, MATERIALES.rampaTierra);
    tierra.receiveShadow = true;
    tierra.castShadow = true;
    grupoNivel.add(tierra);

    // 2) Capa de pasto: una franja delgada que sigue la superficie (un pelín más ancha para no parpadear)
    const formaPasto = new THREE.Shape();
    formaPasto.moveTo(pts[0][0], pts[0][1]);
    pts.forEach(([x, y]) => formaPasto.lineTo(x, y));
    for (let i = N; i >= 0; i--) formaPasto.lineTo(pts[i][0], pts[i][1] - 0.35);
    formaPasto.closePath();
    const geoPasto = new THREE.ExtrudeGeometry(formaPasto, { depth: 1.02, bevelEnabled: false });
    geoPasto.translate(0, 0, -0.51);
    const pasto = new THREE.Mesh(geoPasto, MATERIALES.rampaPasto);
    pasto.receiveShadow = true;
    grupoNivel.add(pasto);
}

// ---------- Estanque: agua semitransparente en los huecos del suelo ----------
function crearEstanque(e) {
    const ancho = e.x1 - e.x0 - 0.02;
    const agua = new THREE.Mesh(new THREE.BoxGeometry(ancho, 4.6, 0.96), MATERIALES.agua);
    agua.position.set((e.x0 + e.x1) / 2, -1.7, 0);      // la superficie queda en y = 0.6
    grupoNivel.add(agua);
}


/* =====================================================================
   7. ENTRADA DEL TECLADO
   Guardamos qué teclas están presionadas; en cada cuadro preguntamos.
   ===================================================================== */
const teclas = {};

window.addEventListener('keydown', (e) => {
    teclas[e.code] = true;

    // Evita que la página haga scroll con espacio o flechas
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();

    // "Buffer" de salto: recordamos que el jugador quiso saltar
    if (!e.repeat && esTeclaSalto(e.code) && estado === 'jugando') {
        jugador.bufferSalto = CONFIG.BUFFER_SALTO;
    }

    if (e.code === 'KeyP') alternarPausa();
    if (e.code === 'KeyR' && estado !== 'inicio') iniciarJuego();
});

window.addEventListener('keyup', (e) => { teclas[e.code] = false; });

const esTeclaSalto = (code) => code === 'Space' || code === 'ArrowUp' || code === 'KeyW';
const teclaIzquierda = () => teclas['ArrowLeft'] || teclas['KeyA'];
const teclaDerecha = () => teclas['ArrowRight'] || teclas['KeyD'];
const teclaSaltoPresionada = () => teclas['Space'] || teclas['ArrowUp'] || teclas['KeyW'];
const teclaCorrer = () => teclas['ShiftLeft'] || teclas['ShiftRight'];


/* =====================================================================
   8. FÍSICA Y COLISIONES (AABB contra la grilla + rampa)
   Movemos primero en X y resolvemos choques, y LUEGO en Y.
   Separar los ejes evita que el personaje se "pegue" en las esquinas.
   Toda entidad tiene: x (centro), y (pies), ancho, alto, vx, vy.
   La rampa NO son bloques: se resuelve aparte con resolverRampa().
   ===================================================================== */
function obtenerBloque(tx, ty) {
    return bloques.get(clave(tx, ty)) || null;
}

// Devuelve los bloques sólidos que se cruzan con la caja de la entidad.
// holgura: se ignora una franja muy fina en los pies (evita "engancharse" en la esquina donde empieza la rampa)
function bloquesQueToca(ent, holgura = 0.001) {
    const resultado = [];
    const izquierda = Math.floor(ent.x - ent.ancho / 2);
    const derecha = Math.floor(ent.x + ent.ancho / 2 - 0.001);
    const abajo = Math.floor(ent.y + holgura);
    const arriba = Math.floor(ent.y + ent.alto - 0.001);

    for (let tx = izquierda; tx <= derecha; tx++) {
        for (let ty = abajo; ty <= arriba; ty++) {
            const b = obtenerBloque(tx, ty);
            if (b) resultado.push(b);
        }
    }
    return resultado;
}

// Mueve una entidad y la saca de los bloques con los que choque.
// alGolpearTecho: función opcional (callback) si choca con la cabeza.
function moverEntidad(ent, dt, alGolpearTecho) {
    ent.chocoPared = false;

    // --- Eje X ---
    ent.x += ent.vx * dt;
    let choques = bloquesQueToca(ent, ent.enRampaAntes ? 0.12 : 0.001);
    if (choques.length > 0) {
        if (ent.vx > 0) {
            ent.x = Math.min(...choques.map(b => b.x)) - ent.ancho / 2 - 0.001;
        } else if (ent.vx < 0) {
            ent.x = Math.max(...choques.map(b => b.x)) + 1 + ent.ancho / 2 + 0.001;
        }
        ent.vx = 0;
        ent.chocoPared = true;
    }

    // --- Eje Y ---
    ent.y += ent.vy * dt;
    ent.enSuelo = false;
    choques = bloquesQueToca(ent);
    if (choques.length > 0) {
        if (ent.vy < 0) {
            // Cayendo: aterriza encima del bloque
            ent.y = Math.max(...choques.map(b => b.y)) + 1;
            ent.enSuelo = true;
        } else if (ent.vy > 0) {
            // Subiendo: se golpea la cabeza
            ent.y = Math.min(...choques.map(b => b.y)) - ent.alto - 0.001;
            if (alGolpearTecho) alGolpearTecho(choques);
        }
        ent.vy = 0;
    }
}

// Rampa: si Unimo está sobre una zona de rampa y sus pies tocan la curva, lo apoyamos en ella.
// Una bolita sobre una pendiente apoya su CENTRO a R/cos(ángulo) de la superficie, por eso el término sqrt(1 + s²).
function resolverRampa(ent, dt) {
    ent.enRampa = false;
    ent.pendiente = 0;
    const r = rampaEn(ent.x);
    if (!r) return;

    const s = pendienteRampa(r, ent.x);
    const yApoyo = alturaRampa(r, ent.x) + CONFIG.RADIO_BOLA * (Math.sqrt(1 + s * s) - 1);
    // Si ya venía pegado a la rampa, damos un margen para que "siga" la curva al bajar rápido
    const margen = ent.enRampaAntes ? 0.08 + Math.abs(s * ent.vx) * dt * 1.5 : 0.02;

    if (ent.vy <= 0 && ent.y <= yApoyo + margen) {
        ent.y = yApoyo;
        ent.vy = 0;
        ent.enSuelo = true;
        ent.enRampa = true;
        ent.pendiente = s;
    }
}

// ¿Se superponen dos cajas? (prueba AABB)
function seSuperponen(a, b) {
    return Math.abs(a.x - b.x) < (a.ancho + b.ancho) / 2 &&
           a.y < b.y + b.alto &&
           a.y + a.alto > b.y;
}


/* =====================================================================
   9. BLOQUES: ROMPER CAJAS Y CAJAS MISTERIOSAS
   ===================================================================== */
function golpearBloque(listaBloques) {
    // Si la cabeza toca dos bloques, golpeamos el más cercano al centro del jugador
    const bloque = listaBloques.reduce((mejor, b) =>
        Math.abs(b.x + 0.5 - jugador.x) < Math.abs(mejor.x + 0.5 - jugador.x) ? b : mejor);

    if (bloque.tipo === 'B') {
        destruirBloque(bloque);
    } else if (bloque.tipo === 'G') {
        // Caja misteriosa: sale una fruta estelar y la caja queda "usada" (cambia su textura)
        bloque.tipo = 'U';
        bloque.malla.material = MATERIALES.usado;
        bloque.rebote = 0.2;
        estrellaQueSalta(bloque.x, bloque.y + 1);
        sumarGema(300, 5);                       // la fruta estelar vale 300 puntos y 5 semillas
        mostrarAviso('¡FRUTA ESTELAR!');
    } else {
        bloque.rebote = 0.1;
    }

    // Si había un enemigo parado sobre el bloque golpeado, ¡también lo derrota!
    enemigos.forEach(en => {
        if (en.vivo && Math.floor(en.x) === bloque.x && Math.abs(en.y - (bloque.y + 1)) < 0.1) {
            derrotarEnemigo(en, 100);
        }
    });
}

function destruirBloque(bloque) {
    grupoNivel.remove(bloque.malla);                 // lo quitamos de la escena
    bloques.delete(clave(bloque.x, bloque.y));       // y del mapa de colisiones
    crearParticulas(bloque.x + 0.5, bloque.y + 0.5, MATERIALES.caja, 8);
    puntos += 50;
}

// Fruta estelar que sale de una caja misteriosa (sube, gira y desaparece)
function estrellaQueSalta(x, y) {
    const malla = new THREE.Mesh(GEO_ESTRELLA, MATERIALES.estrella);
    malla.position.set(x + 0.5, y + 0.3, 0.2);
    grupoNivel.add(malla);
    particulas.push({ malla, vx: 0, vy: 9, vz: 0, vida: 0.75, gira: 7, gravedad: -22, soloY: true });
}

function sumarGema(puntosExtra, cantidad = 1) {
    const antes = Math.floor(gemasRecogidas / 20);
    gemasRecogidas += cantidad;
    puntos += puntosExtra;
    // Cada 20 semillas, ¡una vida extra!
    if (Math.floor(gemasRecogidas / 20) > antes) {
        vidas++;
        mostrarAviso('¡VIDA EXTRA!');
    }
}


/* =====================================================================
   10. JUGADOR (UNIMO)
   ===================================================================== */
const jugador = {
    x: 0, y: 0, vx: 0, vy: 0,
    ancho: CONFIG.RADIO_BOLA * 2, alto: CONFIG.RADIO_BOLA * 2,   // caja de colisión = diámetro
    enSuelo: false,
    mirando: 1,               // 1 = derecha, -1 = izquierda
    tiempoCoyote: 0,
    bufferSalto: 0,
    saltando: false,
    invulnerable: 0,
    tiempoAnimacion: 0,
    aplastar: 0,              // cuánto se aplasta al aterrizar (decae solo)
    // Rampa y rodar
    enRampa: false,           // ¿está apoyado en la rampa en este cuadro?
    enRampaAntes: false,      // ¿lo estaba en el cuadro anterior?
    pendiente: 0,             // inclinación de la rampa donde está (negativo = baja hacia la derecha)
    rodando: false,           // true = hecho bolita
    malla: crearModeloJugador(),
};
scene.add(jugador.malla);

function reaparecerJugador() {
    // Si activamos el farol, reaparecemos ahí
    const inicio = (puntoControl && puntoControl.activo) ? puntoControl : posicionInicial;
    jugador.x = inicio.x;
    jugador.y = inicio.y;
    jugador.vx = 0;
    jugador.vy = 0;
    jugador.mirando = 1;
    jugador.rodando = false;
    jugador.enRampa = false;
    jugador.enRampaAntes = false;
    jugador.invulnerable = CONFIG.INVULNERABLE;
    jugador.malla.rotation.set(0, 0, 0);
    jugador.malla.visible = true;
}

function actualizarJugador(dt) {
    const j = jugador;
    j.enRampaAntes = j.enRampa;

    // --- Movimiento horizontal con aceleración y fricción ---
    let direccion = 0;
    if (teclaIzquierda()) direccion -= 1;
    if (teclaDerecha()) direccion += 1;
    const velocidadMaxima = teclaCorrer() ? CONFIG.VEL_CORRER : CONFIG.VEL_CAMINAR;
    const limite = j.rodando ? CONFIG.VEL_RODAR : velocidadMaxima;

    // Cuesta abajo la gravedad lo empuja a lo largo de la pendiente
    if (j.enRampaAntes) j.vx -= j.pendiente * CONFIG.G_RAMPA * dt;

    if (direccion !== 0) {
        j.vx += direccion * CONFIG.ACELERACION * dt;
        j.mirando = direccion;
    } else if (!j.enRampaAntes) {
        // Fricción: reducimos la velocidad poco a poco hasta 0 (rodando frena mucho menos)
        const freno = (j.rodando ? CONFIG.FRICCION_RODAR : CONFIG.FRICCION) * dt;
        j.vx = Math.abs(j.vx) <= freno ? 0 : j.vx - Math.sign(j.vx) * freno;
    }
    j.vx = Math.max(-limite, Math.min(limite, j.vx));   // limitar (clamp)

    // --- Salto (con coyote time y buffer) ---
    j.tiempoCoyote = j.enSuelo ? CONFIG.TIEMPO_COYOTE : j.tiempoCoyote - dt;
    j.bufferSalto -= dt;

    if (j.bufferSalto > 0 && j.tiempoCoyote > 0) {
        j.vy = CONFIG.FUERZA_SALTO;
        j.bufferSalto = 0;
        j.tiempoCoyote = 0;
        j.saltando = true;
    }

    // Salto variable: si sueltas el botón mientras subes, el salto se corta
    if (j.saltando && !teclaSaltoPresionada() && j.vy > 0) {
        j.vy *= CONFIG.CORTE_SALTO;
        j.saltando = false;
    }
    if (j.vy <= 0) j.saltando = false;

    // --- Gravedad ---
    // Al subir usa la gravedad normal; al caer es más fuerte (MULT_CAIDA)
    const g = j.vy < 0 ? CONFIG.GRAVEDAD * CONFIG.MULT_CAIDA : CONFIG.GRAVEDAD;
    j.vy += g * dt;
    j.vy = Math.max(j.vy, CONFIG.VEL_MAX_CAIDA);

    // --- Mover y resolver colisiones ---
    const estabaEnSuelo = j.enSuelo;
    const vyAntes = j.vy;
    moverEntidad(j, dt, golpearBloque);

    // No dejar que salga por el borde izquierdo del mundo
    if (j.x < j.ancho / 2) { j.x = j.ancho / 2; j.vx = 0; }

    // --- Rampa ---
    resolverRampa(j, dt);

    // Si acaba de aterrizar, se aplasta un poco (más cuanto más fuerte cayó)
    if (!estabaEnSuelo && j.enSuelo) j.aplastar = Math.min(0.3, Math.abs(vyAntes) * 0.015);

    // --- ¿Se hace bolita? ---
    // Empieza a rodar cuando va cuesta abajo por la rampa; deja de rodar cuando ya va despacio en el suelo.
    if (j.enRampa && Math.abs(j.pendiente) > 0.08 && j.vx * j.pendiente < 0) {
        j.rodando = true;
    } else if (j.enSuelo && Math.abs(j.vx) < CONFIG.VEL_CAMINAR) {
        j.rodando = false;
    }

    // --- ¿Se cayó al vacío (o al agua)? ---
    if (j.y < CONFIG.LIMITE_CAIDA) {
        perderVida(false);
        return;
    }

    // --- Recoger semillas ---
    // La distancia se mide entre el centro de Unimo y el de la semilla (círculos),
    // con un radio generoso para que las semillas altas sean fáciles de tomar.
    gemas.forEach(g => {
        const dx = j.x - (g.x + 0.5);
        const dy = (j.y + CONFIG.RADIO_BOLA) - (g.y + 0.5);
        if (!g.recogida && dx * dx + dy * dy < CONFIG.RADIO_RECOGER * CONFIG.RADIO_RECOGER) {
            g.recogida = true;
            grupoNivel.remove(g.malla);
            sumarGema(100);
        }
    });

    // --- Farol (K): se enciende al pasar por él ---
    if (puntoControl && !puntoControl.activo && j.x >= puntoControl.x) {
        puntoControl.activo = true;
        const lampara = puntoControl.bandera.userData.tela;
        lampara.material.color.set(0xffe066);
        lampara.material.emissive.set(0xffa500);
        mostrarAviso('¡PUNTO DE CONTROL!');
    }

    // --- Meta (F) ---
    if (banderaMeta && j.x >= banderaMeta.x - 0.2) {
        ganarNivel();
    }

    if (j.invulnerable > 0) j.invulnerable -= dt;
    actualizarModeloJugador(dt);
}

// Sincroniza el modelo 3D con los datos del jugador y lo anima
function actualizarModeloJugador(dt) {
    const j = jugador;
    const m = j.malla;
    const { cuerpoRot, extremidades, armIzq, armDer, legIzq, legDer } = m.userData;
    m.position.set(j.x, j.y, 0);

    if (j.rodando) {
        // Hecho bolita: se esconden brazos y piernas y el cuerpo gira según la distancia recorrida
        extremidades.visible = false;
        cuerpoRot.position.y = CONFIG.RADIO_BOLA;
        cuerpoRot.rotation.z -= (j.vx * dt) / R_CUERPO;
        m.rotation.y += (0 - m.rotation.y) * Math.min(1, 10 * dt);
    } else {
        extremidades.visible = true;
        cuerpoRot.position.y = Y_CENTRO;

        // La carita vuelve al frente por el camino más corto
        let r = cuerpoRot.rotation.z % (Math.PI * 2);
        if (r > Math.PI) r -= Math.PI * 2;
        if (r < -Math.PI) r += Math.PI * 2;
        cuerpoRot.rotation.z = r * Math.max(0, 1 - 12 * dt);

        // Girar suavemente hacia donde mira (sin llegar a 90° para que se vea la cara)
        m.rotation.y += (j.mirando * 0.35 - m.rotation.y) * Math.min(1, 12 * dt);

        if (!j.enSuelo) {
            // En el aire: brazos arriba (como cuando sostiene la fruta estelar)
            armIzq.rotation.z = -2.6;
            armDer.rotation.z = 2.6;
            legIzq.rotation.z = legDer.rotation.z = 0;
        } else if (Math.abs(j.vx) > 0.5) {
            // Caminar: piernas y brazos se balancean con una función seno
            j.tiempoAnimacion += dt * Math.abs(j.vx) * 2.2;
            const balanceo = Math.sin(j.tiempoAnimacion);
            legIzq.rotation.z = balanceo * 0.6;
            legDer.rotation.z = -balanceo * 0.6;
            armIzq.rotation.z = -0.9 - balanceo * 0.5;
            armDer.rotation.z = 0.9 - balanceo * 0.5;
        } else {
            legIzq.rotation.z = legDer.rotation.z = 0;
            armIzq.rotation.z = -0.9;
            armDer.rotation.z = 0.9;
        }
    }

    // "Squash & stretch": en el aire se estira según su velocidad vertical (sube o baja)
    // y al aterrizar se aplasta un instante y recupera su forma.
    j.aplastar = Math.max(0, j.aplastar - dt * 1.5);
    const estirar = j.enSuelo
        ? 1 - j.aplastar
        : 1 + Math.min(0.15, Math.abs(j.vy) * 0.012);
    m.scale.set(2 - estirar, estirar, 2 - estirar);

    // Parpadeo mientras es invulnerable
    m.visible = j.invulnerable > 0 ? Math.floor(j.invulnerable * 12) % 2 === 0 : true;
}

// Se llama cuando el jugador recibe daño o se cae
function perderVida(conAnimacion) {
    if (estado !== 'jugando') return;
    vidas--;
    estado = 'muriendo';
    tiempoMuerte = 1.4;
    jugador.malla.visible = true;
    // Animación clásica: sale disparado hacia arriba y cae fuera de la pantalla
    jugador.vy = conAnimacion ? 12 : 0;
    jugador.vx = 0;
}

function actualizarMuerte(dt) {
    tiempoMuerte -= dt;
    jugador.vy += CONFIG.GRAVEDAD * dt;
    jugador.y += jugador.vy * dt;               // sin colisiones: atraviesa el suelo
    jugador.malla.position.set(jugador.x, jugador.y, 0);
    jugador.malla.rotation.z += dt * 8;          // da vueltas

    if (tiempoMuerte <= 0) {
        if (vidas <= 0) {
            terminarJuego(false);
        } else {
            reaparecerJugador();
            tiempoRestante = CONFIG.TIEMPO_NIVEL;
            estado = 'jugando';
        }
    }
}


/* =====================================================================
   11. ENEMIGOS
   Los caracoles caminan de lado a lado; dan media vuelta en paredes y bordes.
   Si Unimo les cae encima, se aplastan.
   ===================================================================== */
function actualizarEnemigos(dt, tiempo) {
    enemigos.forEach(en => {
        // Enemigo aplastado: esperamos un momento y lo quitamos
        if (!en.vivo) {
            en.tiempoMuerto -= dt;
            if (en.tiempoMuerto <= 0 && en.malla.parent) grupoNivel.remove(en.malla);
            return;
        }

        // Solo se activan cuando están cerca del jugador
        if (Math.abs(en.x - jugador.x) > 18) return;

        en.vx = en.direccion * CONFIG.VEL_ENEMIGO;
        en.vy += CONFIG.GRAVEDAD * dt;
        moverEntidad(en, dt);

        // Media vuelta si choca con una pared O si adelante no hay suelo (no se cae de las plataformas).
        // Se decide una sola vez por cuadro: antes podían darse dos vueltas seguidas
        // y el enemigo seguía de largo hacia el vacío.
        let girar = en.chocoPared;
        if (en.enSuelo) {
            const pieDelantero = Math.floor(en.x + en.direccion * (en.ancho / 2 + 0.05));
            if (!obtenerBloque(pieDelantero, Math.floor(en.y - 0.1))) girar = true;
        }
        if (girar) en.direccion *= -1;

        // Igual que el jugador, el enemigo no puede salir por el borde izquierdo del mundo
        if (en.x < en.ancho / 2) { en.x = en.ancho / 2; en.direccion = 1; }

        if (en.y < CONFIG.LIMITE_CAIDA) { en.vivo = false; en.tiempoMuerto = 0; }

        // Animación: respira un poquito y mira hacia donde va (scale.x = -1 lo voltea)
        en.malla.position.set(en.x, en.y, 0);
        en.malla.scale.set(en.direccion, 1 + Math.sin(tiempo * 8) * 0.04, 1);

        // --- Colisión con el jugador ---
        // Unimo y el caracol se tratan como CÍRCULOS (no como cajas): así solo hay
        // golpe cuando realmente se tocan, sin "esquinas invisibles".
        if (estado === 'jugando') {
            const rBola = CONFIG.RADIO_BOLA;
            const rEnemigo = 0.36;                              // un poco menor que el dibujo: más justo
            const dx = jugador.x - en.x;
            const dy = (jugador.y + rBola) - (en.y + 0.32);     // centro de Unimo - centro del enemigo
            if (dx * dx + dy * dy < (rBola + rEnemigo) * (rBola + rEnemigo)) {
                // Pisotón: Unimo baja y su centro está por ENCIMA del centro del enemigo
                if (jugador.vy < 0 && dy > 0.1) {
                    derrotarEnemigo(en, 200);
                    jugador.vy = CONFIG.FUERZA_SALTO * CONFIG.REBOTE_PISADA;   // rebote al pisarlo
                    jugador.saltando = teclaSaltoPresionada();
                } else if (jugador.invulnerable <= 0) {
                    perderVida(true);
                }
            }
        }
    });
}

function derrotarEnemigo(en, puntosGanados) {
    en.vivo = false;
    en.tiempoMuerto = 0.5;
    en.malla.scale.set(1.2, 0.25, 1.2);   // queda aplastado
    puntos += puntosGanados;
}


/* =====================================================================
   12. PARTÍCULAS Y ANIMACIONES DEL NIVEL
   Los pedacitos usan el MISMO material de la caja: así llevan su
   textura de imagen y parecen trozos reales del bloque.
   ===================================================================== */
const GEO_PEDAZO = new THREE.BoxGeometry(0.25, 0.25, 0.25);

function crearParticulas(x, y, material, cantidad) {
    for (let i = 0; i < cantidad; i++) {
        const malla = new THREE.Mesh(GEO_PEDAZO, material);
        malla.position.set(x, y, 0);
        grupoNivel.add(malla);
        particulas.push({
            malla,
            vx: (Math.random() - 0.5) * 6,
            vy: 5 + Math.random() * 5,
            vz: (Math.random() - 0.5) * 6,
            vida: 1.2,
            gira: 10,
            gravedad: CONFIG.GRAVEDAD,
        });
    }
}

function actualizarParticulas(dt) {
    // Recorremos al revés para poder borrar del arreglo sin saltarnos elementos
    for (let i = particulas.length - 1; i >= 0; i--) {
        const p = particulas[i];
        p.vy += p.gravedad * dt;
        p.malla.position.x += p.vx * dt;
        p.malla.position.y += p.vy * dt;
        p.malla.position.z += p.vz * dt;
        if (p.soloY) {
            p.malla.rotation.y += p.gira * dt;      // la estrella gira como una moneda
        } else {
            p.malla.rotation.x += p.gira * dt;
            p.malla.rotation.y += p.gira * dt;
        }
        p.vida -= dt;
        if (p.vida <= 0) {
            grupoNivel.remove(p.malla);
            particulas.splice(i, 1);
        }
    }
}

// Cajas que "rebotan" al golpearlas, semillas que giran y banderita que ondea
function animarNivel(dt, tiempo) {
    bloques.forEach(b => {
        if (b.rebote > 0) {
            b.rebote -= dt;
            b.malla.position.y = b.y + 0.5 + Math.sin(Math.max(0, b.rebote) * 15) * 0.15;
        }
    });
    gemas.forEach(g => {
        if (!g.recogida) {
            g.malla.rotation.y = tiempo * 2;
            g.malla.position.y = g.y + 0.5 + Math.sin(tiempo * 3 + g.x) * 0.08;
        }
    });
    if (banderaMeta) banderaMeta.bandera.userData.tela.rotation.y = Math.sin(tiempo * 3) * 0.25;
}


/* =====================================================================
   13. CÁMARA QUE SIGUE AL JUGADOR
   Interpolación (lerp): en cada cuadro la cámara recorre un porcentaje
   de la distancia hacia su objetivo → movimiento suave.
   ===================================================================== */
function actualizarCamara(dt) {
    const suavizado = Math.min(1, 5 * dt);
    const objetivoX = Math.max(8, jugador.x + 2);         // un poco adelante del jugador
    const objetivoY = Math.max(4.5, jugador.y + 3);

    camera.position.x += (objetivoX - camera.position.x) * suavizado;
    camera.position.y += (objetivoY - camera.position.y) * suavizado;
    camera.position.z = 14;
    camera.lookAt(camera.position.x, camera.position.y - 2, 0);

    moverSol();
}

// La luz del sol sigue a la cámara para que siempre haya sombras cerca
function moverSol() {
    luzSol.position.set(camera.position.x - 6, 18, 12);
    luzSol.target.position.set(camera.position.x, 0, 0);
}


/* =====================================================================
   14. INTERFAZ: HUD Y PANTALLAS
   Necesita estos id en index.html: hud-vidas, hud-gemas, hud-puntos,
   hud-tiempo, aviso, pantalla-inicio, pantalla-pausa, pantalla-fin,
   fin-titulo, fin-detalle, fin-imagen, btn-jugar, btn-reiniciar.
   ===================================================================== */
const ui = {
    vidas: document.getElementById('hud-vidas'),
    gemas: document.getElementById('hud-gemas'),
    puntos: document.getElementById('hud-puntos'),
    tiempo: document.getElementById('hud-tiempo'),
    aviso: document.getElementById('aviso'),
    inicio: document.getElementById('pantalla-inicio'),
    pausa: document.getElementById('pantalla-pausa'),
    fin: document.getElementById('pantalla-fin'),
    finTitulo: document.getElementById('fin-titulo'),
    finDetalle: document.getElementById('fin-detalle'),
    finImagen: document.getElementById('fin-imagen'),
};

function actualizarHUD() {
    ui.vidas.textContent = vidas;   // también se puede probar: '❤'.repeat(vidas)
    ui.gemas.textContent = gemasRecogidas;
    ui.puntos.textContent = String(puntos).padStart(6, '0');   // 000150
    ui.tiempo.textContent = Math.ceil(tiempoRestante);
}

let temporizadorAviso = null;
function mostrarAviso(texto) {
    ui.aviso.textContent = texto;
    ui.aviso.classList.remove('oculto');
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => ui.aviso.classList.add('oculto'), 1500);
}

// El botón de jugar empieza deshabilitado hasta que carguen las texturas (ver sección 4)
const botonJugar = document.getElementById('btn-jugar');
botonJugar.disabled = true;
botonJugar.addEventListener('click', iniciarJuego);
document.getElementById('btn-reiniciar').addEventListener('click', iniciarJuego);

// Imagen de Unimo con la estrella: si el archivo no carga, usamos la copia de recursos.js
if (ui.finImagen && RECURSOS['unimo-meta.png']) {
    const usarRespaldo = () => { ui.finImagen.src = RECURSOS['unimo-meta.png']; };
    ui.finImagen.addEventListener('error', usarRespaldo, { once: true });
    if (ui.finImagen.complete && ui.finImagen.naturalWidth === 0) usarRespaldo();
}


/* =====================================================================
   15. ESTADOS DEL JUEGO Y BUCLE PRINCIPAL
   'inicio' -> 'jugando' <-> 'pausa'
              'jugando' -> 'muriendo' -> 'jugando' o 'gameover'
              'jugando' -> 'victoria'
   ===================================================================== */
let estado = 'inicio';
let vidas = CONFIG.VIDAS_INICIALES,
    puntos = 0,
    gemasRecogidas = 0,
    tiempoRestante = CONFIG.TIEMPO_NIVEL,
    tiempoMuerte = 0;

function iniciarJuego() {
    vidas = CONFIG.VIDAS_INICIALES;
    puntos = 0;
    gemasRecogidas = 0;
    tiempoRestante = CONFIG.TIEMPO_NIVEL;

    construirNivel();          // ← UNA sola vez por partida
    reaparecerJugador();
    jugador.invulnerable = 0;
    camera.position.set(8, 4.5, 14);

    ui.inicio.classList.add('oculto');
    ui.fin.classList.add('oculto');
    ui.pausa.classList.add('oculto');
    estado = 'jugando';
}

function alternarPausa() {
    if (estado === 'jugando') {
        estado = 'pausa';
        ui.pausa.classList.remove('oculto');
    } else if (estado === 'pausa') {
        estado = 'jugando';
        ui.pausa.classList.add('oculto');
        reloj.getDelta(); // descartamos el tiempo que pasó en pausa
    }
}

function ganarNivel() {
    const bonus = Math.ceil(tiempoRestante) * 10;   // el tiempo sobrante da puntos
    puntos += bonus;
    terminarJuego(true, bonus);
}

function terminarJuego(gano, bonus = 0) {
    estado = gano ? 'victoria' : 'gameover';
    actualizarHUD();
    ui.finTitulo.textContent = gano ? '¡NIVEL COMPLETADO!' : 'GAME OVER';
    ui.finDetalle.innerHTML = gano
        ? `Puntos: ${puntos}<br>Semillas: ${gemasRecogidas}<br>Bono por tiempo: ${bonus}`
        : `Puntos: ${puntos}<br>Semillas: ${gemasRecogidas}`;
    // La imagen de Unimo con la fruta estelar solo aparece al ganar
    if (ui.finImagen) ui.finImagen.classList.toggle('oculto', !gano);
    setTimeout(() => ui.fin.classList.remove('oculto'), gano ? 800 : 200);
}

// ---------- Bucle principal ----------
// renderer.setAnimationLoop(animate) llama a animate ~60 veces por segundo
// (es la versión de Three.js de requestAnimationFrame).
// dt (delta time) = segundos desde el cuadro anterior. Multiplicar las
// velocidades por dt hace que el juego vaya igual en PCs rápidos y lentos.
const reloj = new THREE.Clock();

function animate() {
    const dt = Math.min(reloj.getDelta(), 1 / 30);   // limitamos dt para evitar "teletransportes"
    const tiempo = reloj.elapsedTime;

    if (estado === 'jugando') {
        actualizarJugador(dt);
        actualizarEnemigos(dt, tiempo);
        tiempoRestante -= dt;
        if (tiempoRestante <= 0) { tiempoRestante = 0; perderVida(true); }
    } else if (estado === 'muriendo') {
        actualizarMuerte(dt);
    }

    if (estado !== 'pausa') {
        actualizarParticulas(dt);
        animarNivel(dt, tiempo);
    }

    if (estado !== 'inicio') {
        actualizarCamara(dt);
        actualizarHUD();
    } else {
        // En la pantalla de inicio la cámara recorre el nivel lentamente
        camera.position.set(10 + Math.sin(tiempo * 0.2) * 6, 5, 14);
        camera.lookAt(camera.position.x, 3, 0);
        moverSol();
    }

    actualizarFondo(tiempo);
    renderer.render(scene, camera);
}

// ---------- Arranque ----------
ui.inicio.classList.remove('oculto');   // mostramos el menú de inicio
construirNivel();              // el nivel se ve de fondo en la pantalla de inicio
reaparecerJugador();
actualizarModeloJugador(0);
renderer.setAnimationLoop(animate);   // al final: todo ya está definido