/* Logica de todo el juego */
 
/* SISTEMA DE COORDENADAS:
    - Bloque 1x1x1
    - Eje X -> Derecha (avance del jugador)
    - Eje Y -> Arriba (altura del jugador)
    - Eje Z -> Adelante (profundidad del jugador)
*/
import * as THREE from 'three';

console.log("game.js NUEVO cargado");

const CONFIG = {
    GRAVEDAD: -32,
    VEL_CAMINAR: 6,
    VEL_CORRER: 9,
    ACELERACION: 40,
    FRICCION: 30,
    FUERZA_SALTO: 15,
    CORTE_SALTO: 0.45,
    VEL_MAX_CAIDA: -20,
    TIEMPO_COYOTE: 0.1,
    BUFFER_SALTO: 0.12,
    VIDAS_INICIALES: 3,
    TIEMPO_NIVEL: 300,
    LIMITE_CAIDA: -5,
    VEL_ENEMIGO: 1.5,
    INVULNERABLE: 2.0,
};
 
/* Diseño del nivel (TILEMAP) */
/* **************************************************
    # Suelo
    G bloque sorpresa
    C Columna de piedra
    E Enemigo
    K Punto de control
    B ladrillo (se puede romper)
    S bloque de piedra (escaleras)
    o Coleccionable (gema)
    P Jugador (posición inicial)
    F Bandera de Meta
***************************************************** */
const MAPA_NIVEL = [
  "",
  "                                                                   ooo                               SS",
  "          G                                                        BBB                              SSS",
  "                              oooo                                                                 SSSS",
  "                              BBBB                    SS   S                                      SSSSS",
  "        GBGBG                                        SSS   SS     BGBGB          oo   GGG        SSSSCC",
  "                    C                     C         SSSS   SSS                                  SSSSSSS",
  "  P            E    C               E E   C    E   SSSSS   SSSS K       E E               E    SSSSSSSS   F",
  "#########################  #############################   ######################  ###########################",
];
 
// Caracteres sólidos (el jugador choca con ellos).
// K y F NO van aquí: el jugador debe atravesarlos para activarlos.
// U = bloque sorpresa ya usado (aparece cuando se golpea una G).
const SOLIDOS = new Set(["#", "B", "G", "S", "C", "U"]);
 
const COLOR_CIELO = 0x6ec6ff;
 
const scene = new THREE.Scene();
scene.background = new THREE.Color(COLOR_CIELO);

// FOG
scene.fog = new THREE.Fog(COLOR_CIELO, 25, 60);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(5, 5, 14);
 
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
 
const light = new THREE.AmbientLight( 0x404040, 50); // soft white light
scene.add( light );
 
window.addEventListener('resize', () => {
    // 1. Actualizar el tamaño del renderizador
    renderer.setSize(window.innerWidth, window.innerHeight);
 
    // 2. Actualizar la relación de aspecto de la cámara
    camera.aspect = window.innerWidth / window.innerHeight;
 
    // 3. Renderizar los cambios en la matriz de proyección
    camera.updateProjectionMatrix();
});
 
/* Estado del nivel */
/* ************************************************** */
let grupoNivel = null,
    bloques = new Map(),
    gemas = [],
    enemigos = [],
    particulas = [],
    posicionInicial = { x: 2.5, y: 1 },
    puntoControl = null,
    banderaMeta = null;
/* ************************************************** */
 
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
 
    const alto = MAPA_NIVEL.length;
    MAPA_NIVEL.forEach((fila, y) => {
        const yMundo = alto - 1 - y; // Invertir el eje Y para que (0,0) esté en la esquina inferior izquierda
 
        for (let index = 0; index < fila.length; index++) {
            const element = fila[index];
 
            if (SOLIDOS.has(element)) {
                // Crear un bloque sólido
                crearBloque(index, yMundo, element);
            }
        }
    });
}
 
// 1. Crear el cargador de texturas
const textureLoader = new THREE.TextureLoader();

// 2. Cargar la imagen especificando su ruta física real
const texTierra = textureLoader.load('./src/img/texture/tierra.png');
const texSuelo = textureLoader.load('./src/img/texture/cesped.png');
const texLadrillo = textureLoader.load('./src/img/texture/muro.png');

// Tierra de relleno: la caja mide 1x4, así que repetimos la imagen 4 veces en vertical
const texTierraRelleno = textureLoader.load('./src/img/texture/tierra.png');
texTierraRelleno.wrapS = THREE.RepeatWrapping;
texTierraRelleno.wrapT = THREE.RepeatWrapping;
texTierraRelleno.repeat.set(1, 4);

const texSueloLado = textureLoader.load('./src/img/texture/tierra-lado.png');  // lados del suelo (tierra + borde de pasto)
const texSorpresa  = textureLoader.load('./src/img/texture/misterio.png');
const texUsado     = textureLoader.load('./src/img/texture/vacio.png');
const texPiedra    = textureLoader.load('./src/img/texture/roca.png');
const texColumna   = textureLoader.load('./src/img/texture/pilar.png');
 
// Indicar que las imágenes están en sRGB (si no, los colores se ven lavados)
[texTierra, texSuelo, texLadrillo, texTierraRelleno, texSueloLado,
 texSorpresa, texUsado, texPiedra, texColumna].forEach(tex => {
    tex.colorSpace = THREE.SRGBColorSpace;
});
 
// CREAR LOS MATERIALES
const matSueloLado = new THREE.MeshLambertMaterial({ map: texSueloLado });
const MATERIALES = {
    // Un BoxGeometry tiene 6 caras, en este orden: [+X, -X, +Y (arriba), -Y (abajo), +Z, -Z]
    suelo: [
        matSueloLado,
        matSueloLado,
        new THREE.MeshLambertMaterial({ map: texSuelo }),   // arriba: pasto
        new THREE.MeshLambertMaterial({ map: texTierra }),  // abajo: tierra
        matSueloLado,
        matSueloLado,
    ],
    tierra:   new THREE.MeshLambertMaterial({ map: texTierraRelleno }),
    ladrillo: new THREE.MeshLambertMaterial({ map: texLadrillo }),
    sorpresa: new THREE.MeshLambertMaterial({ map: texSorpresa, emissive: 0x332200 }),
    usado:    new THREE.MeshLambertMaterial({ map: texUsado }),
    piedra:   new THREE.MeshLambertMaterial({ map: texPiedra }),
    columna:  new THREE.MeshLambertMaterial({ map: texColumna }),
    gema:     new THREE.MeshPhongMaterial({ color: 0x26c6da, emissive: 0x0b5560, shininess: 100 }),
};
 
// Reutilizamos geometrías para ahorrar memoria
const GEO_BLOQUE = new THREE.BoxGeometry(1, 1, 1);
const GEO_TIERRA = new THREE.BoxGeometry(1, 4, 1);
const GEO_GEMA = new THREE.OctahedronGeometry(0.28);
 
function crearBloque(x, y, tipo) {
    // Seleccionar el material según su tipo
    const material = {
        "#": MATERIALES.suelo,
        "B": MATERIALES.ladrillo,
        "G": MATERIALES.sorpresa,
        "S": MATERIALES.piedra,
        "C": MATERIALES.columna,
        "U": MATERIALES.usado,
    }[tipo];
 
    const malla = new THREE.Mesh(GEO_BLOQUE, material);
    malla.position.set(x + 0.5, y + 0.5, 0);
    malla.castShadow = true;
    malla.receiveShadow = true;
    grupoNivel.add(malla);
    bloques.set(clave(x, y), { x, y, tipo, malla, rebote: 0 });
 
    // Debajo de cada bloque de suelo (#) agregamos tierra decorativa de 1x4 de altura
    if (tipo === "#") {
        const mallaTierra = new THREE.Mesh(GEO_TIERRA, MATERIALES.tierra);
        mallaTierra.position.set(x + 0.5, y - 2.0, 0);
        mallaTierra.castShadow = true;
        mallaTierra.receiveShadow = true;
        grupoNivel.add(mallaTierra);
    }
}

// Inicializar y renderizar el bucle
construirNivel();

function animate() {
    renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);