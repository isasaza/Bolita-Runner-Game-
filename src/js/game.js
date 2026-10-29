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
 
const SOLIDOS = new Set(["#", "B", "G", "S", "C", "U"]);
const COLOR_CIELO = 0x6ec6ff;
 
const scene = new THREE.Scene();
scene.background = new THREE.Color(COLOR_CIELO);
scene.fog = new THREE.Fog(COLOR_CIELO, 25, 60);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(5, 5, 14);
 
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
 
const light = new THREE.AmbientLight(0x404040, 50); 
scene.add(light);
 
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});
 
/* Estado del nivel e Interfaces */
let grupoNivel = null,
    bloques = new Map(),
    gemas = [],
    enemigos = [],
    particulas = [],
    posicionInicial = { x: 2.5, y: 1 },
    puntoControl = null,
    banderaMeta = null;

// Objeto del Jugador
let jugador = {
    malla: null,
    velocidad: new THREE.Vector3(),
    enSuelo: false,
    ancho: 0.6,
    alto: 0.9
};

// Captura de Teclado
const teclas = { izquierda: false, derecha: false, saltar: false };
window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') teclas.izquierda = true;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') teclas.derecha = true;
    if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') teclas.saltar = true;
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') teclas.izquierda = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') teclas.derecha = false;
    if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') teclas.saltar = false;
});
 
const clave = (x, y) => x + "," + y;
 
/* CARGA DE TEXTURAS DE IMAGEN */
const textureLoader = new THREE.TextureLoader();
const texTierra = textureLoader.load('./src/img/texture/tierra.png');
const texSuelo = textureLoader.load('./src/img/texture/cesped.png');
const texLadrillo = textureLoader.load('./src/img/texture/muro.png');

const texTierraRelleno = textureLoader.load('./src/img/texture/tierra.png');
texTierraRelleno.wrapS = THREE.RepeatWrapping;
texTierraRelleno.wrapT = THREE.RepeatWrapping;
texTierraRelleno.repeat.set(1, 4);

const texSueloLado = textureLoader.load('./src/img/texture/tierra-lado.png');  
const texSorpresa  = textureLoader.load('./src/img/texture/misterio.png');
const texUsado     = textureLoader.load('./src/img/texture/vacio.png');
const texPiedra    = textureLoader.load('./src/img/texture/roca.png');
const texColumna   = textureLoader.load('./src/img/texture/pilar.png');
 
[texTierra, texSuelo, texLadrillo, texTierraRelleno, texSueloLado,
 texSorpresa, texUsado, texPiedra, texColumna].forEach(tex => {
    tex.colorSpace = THREE.SRGBColorSpace;
});
 
/* MATERIALES Y GEOMETRÍAS */
const matSueloLado = new THREE.MeshLambertMaterial({ map: texSueloLado });
const MATERIALES = {
    suelo: [
        matSueloLado, matSueloLado,
        new THREE.MeshLambertMaterial({ map: texSuelo }),   
        new THREE.MeshLambertMaterial({ map: texTierra }),  
        matSueloLado, matSueloLado,
    ],
    tierra:   new THREE.MeshLambertMaterial({ map: texTierraRelleno }),
    ladrillo: new THREE.MeshLambertMaterial({ map: texLadrillo }),
    sorpresa: new THREE.MeshLambertMaterial({ map: texSorpresa, emissive: 0x332200 }),
    usado:    new THREE.MeshLambertMaterial({ map: texUsado }),
    piedra:   new THREE.MeshLambertMaterial({ map: texPiedra }),
    columna:  new THREE.MeshLambertMaterial({ map: texColumna }),
    gema:     new THREE.MeshPhongMaterial({ color: 0x26c6da, emissive: 0x0b5560, shininess: 100 }),
};
 
const GEO_BLOQUE = new THREE.BoxGeometry(1, 1, 1);
const GEO_TIERRA = new THREE.BoxGeometry(1, 4, 1);
const GEO_GEMA = new THREE.OctahedronGeometry(0.25);
 
function construirNivel() {
    if (grupoNivel) scene.remove(grupoNivel);
 
    grupoNivel = new THREE.Group();
    scene.add(grupoNivel);
 
    bloques = new Map();
    gemas = [];
    enemigos = [];
    particulas = [];
 
    const alto = MAPA_NIVEL.length;
    MAPA_NIVEL.forEach((fila, y) => {
        const yMundo = alto - 1 - y; 
 
        for (let index = 0; index < fila.length; index++) {
            const element = fila[index];
 
            if (SOLIDOS.has(element)) {
                crearBloque(index, yMundo, element);
            } else if (element === 'o') {
                crearGema(index, yMundo);
            } else if (element === 'E') {
                crearEnemigo(index, yMundo);
            } else if (element === 'P') {
                posicionInicial = { x: index + 0.5, y: yMundo };
            }
        }
    });

    crearJugador();
}
 
function crearBloque(x, y, tipo) {
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
 
    if (tipo === "#") {
        const mallaTierra = new THREE.Mesh(GEO_TIERRA, MATERIALES.tierra);
        mallaTierra.position.set(x + 0.5, y - 2.0, 0);
        mallaTierra.castShadow = true;
        mallaTierra.receiveShadow = true;
        grupoNivel.add(mallaTierra);
    }
}

function crearGema(x, y) {
    const malla = new THREE.Mesh(GEO_GEMA, MATERIALES.gema);
    malla.position.set(x + 0.5, y + 0.5, 0);
    grupoNivel.add(malla);
    gemas.push({ malla, x, y, activa: true });
}

function crearEnemigo(x, y) {
    const geoEnemigo = new THREE.CylinderGeometry(0.4, 0.4, 0.6, 8);
    const matEnemigo = new THREE.MeshLambertMaterial({ color: 0xff3333 });
    const malla = new THREE.Mesh(geoEnemigo, matEnemigo);
    malla.position.set(x + 0.5, y + 0.3, 0);
    grupoNivel.add(malla);
    enemigos.push({ malla, vx: -CONFIG.VEL_ENEMIGO, x, y });
}

function crearJugador() {
    if (jugador.malla) scene.remove(jugador.malla);
    const geoJugador = new THREE.CapsuleGeometry(jugador.ancho / 2, jugador.alto - jugador.ancho, 4, 8);
    const matJugador = new THREE.MeshPhongMaterial({ color: 0x2196f3 });
    jugador.malla = new THREE.Mesh(geoJugador, matJugador);
    jugador.malla.position.set(posicionInicial.x, posicionInicial.y + (jugador.alto / 2), 0);
    scene.add(jugador.malla);
    jugador.velocidad.set(0, 0, 0);
}

/* SISTEMA DE MENÚ E INICIO DEL JUEGO */
const iniciarInterfaz = () => {
    const boton = document.createElement('button');
    boton.innerText = 'JUGAR';
    boton.style.position = 'absolute';
    boton.style.top = '50%';
    boton.style.left = '50%';
    boton.style.transform = 'translate(-50%, -50%)';
    boton.style.padding = '15px 40px';
    boton.style.fontSize = '24px';
    boton.style.fontWeight = 'bold';
    boton.style.cursor = 'pointer';
    boton.style.zIndex = '100';
    boton.style.background = '#4caf50';
    boton.style.color = 'white';
    boton.style.border = 'none';
    boton.style.borderRadius = '5px';
    document.body.appendChild(boton);

    boton.addEventListener('click', () => {
        boton.remove(); 
        construirNivel();
        renderer.setAnimationLoop(animate);
    });
};

/* BUCLE PRINCIPAL DE ANIMACIÓN Y FÍSICA */
const clock = new THREE.Clock();

function animate() {
    const dt = Math.min(clock.getDelta(), 0.1); 

    if (jugador.malla) {
        // --- 1. Movimiento Horizontal ---
        let vObjetivoX = 0;
        if (teclas.izquierda) vObjetivoX = -CONFIG.VEL_CAMINAR;
        if (teclas.derecha) vObjetivoX = CONFIG.VEL_CAMINAR;

        const acc = vObjetivoX !== 0 ? CONFIG.ACELERACION : CONFIG.FRICCION;
        jugador.velocidad.x = THREE.MathUtils.lerp(jugador.velocidad.x, vObjetivoX, acc * dt);

        // --- 2. Gravedad ---
        jugador.velocidad.y += CONFIG.GRAVEDAD * dt;
        if (jugador.velocidad.y < CONFIG.VEL_MAX_CAIDA) jugador.velocidad.y = CONFIG.VEL_MAX_CAIDA;


if (teclas.saltar && jugador.enSuelo) {
jugador.velocidad.y = CONFIG.FUERZA_SALTO;
jugador.enSuelo = false;
}
// --- 3. Aplicar Movimiento y Colisiones Simples ---
jugador.malla.position.x += jugador.velocidad.x * dt;
jugador.malla.position.y += jugador.velocidad.y * dt;
const gx = Math.floor(jugador.malla.position.x);
const gy = Math.floor(jugador.malla.position.y - jugador.alto / 2);
if (bloques.has(clave(gx, gy))) {
const blk = bloques.get(clave(gx, gy));
if (SOLIDOS.has(blk.tipo)) {
jugador.malla.position.y = gy + 1 + jugador.alto / 2;
jugador.velocidad.y = 0;
jugador.enSuelo = true;
}
} else {
jugador.enSuelo = false;
}
if (jugador.malla.position.y < CONFIG.LIMITE_CAIDA) {
crearJugador();
}
// --- 4. Seguimiento de Cámara ---
camera.position.x = jugador.malla.position.x + 2;
camera.position.y = THREE.MathUtils.lerp(camera.position.y, jugador.malla.position.y + 2, 5 * dt);
}
// --- 5. Animación de Gemas ---
gemas.forEach(gema => {
if (gema.activa) {
gema.malla.rotation.y += 2 * dt;
if (jugador.malla && jugador.malla.position.distanceTo(gema.malla.position) < 0.8) {
grupoNivel.remove(gema.malla);
gema.activa = false;
}
}
});
// --- 6. Animación de Enemigos ---
enemigos.forEach(ene => {
ene.malla.position.x += ene.vx * dt;
const ex = Math.floor(ene.malla.position.x + (ene.vx > 0 ? 0.5 : -0.5));
const ey = Math.floor(ene.malla.position.y);
if (bloques.has(clave(ex, ey))) {
ene.vx *= -1;
}
});
renderer.render(scene, camera);
}
// Arranca mostrando la interfaz inicial
iniciarInterfaz();