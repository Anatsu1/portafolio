import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/*
 * Caja de carga con tapa articulada (cuerpo + tapa en dos .glb).
 *
 * Modelo: el de Meshy (`caja.glb` es la versión soldada), cortado en la ranura
 * de la junta, a y = 0,584. Unidades del modelo, origen en el centro:
 *   - caja completa 1,90 × 1,70 × 1,83 (x ∈ ±0,95; y ∈ −0,82…0,88; z ∈ −0,915…0,911)
 *   - cuerpo y ∈ −0,82…0,584 (frente con placa y broches hacia +Z)
 *   - tapa   y ∈  0,584…0,88 (≈0,30 de alto)
 *   - hueco interior x ∈ ±0,745, z ∈ −0,747…0,743, fondo en y = −0,60
 *     (pared de ~0,075 en el borde)
 * Bisagra: eje X que pasa por HINGE = (0; 0,584; −0,8627), el borde trasero
 * superior del cuerpo. El .glb de la tapa ya tiene su origen ahí, así que
 * `rotation.x = −θ` la abre hacia atrás sin recolocar nada. Ángulo máximo:
 * MAX_ANGLE = 110° (pasa la vertical y queda apoyada hacia atrás).
 *
 * Archivos (public/models/): caja-cuerpo.glb y caja-tapa.glb comparten las tres
 * texturas WebP 1536 (caja-color.webp, caja-mr.webp, caja-normal.webp), que
 * los .glb referencian por URI para no bajarlas dos veces. Acá además la tapa
 * reutiliza el material del cuerpo, así hay un solo juego de texturas en GPU.
 * El borde, las paredes interiores y el fondo son un material aparte
 * ("interior") con colores por vértice (oclusión falsa hacia el fondo).
 *
 * Peso: cuerpo 16,9k + 0,5k triángulos (162 KB), tapa 8,2k + 0,5k (83 KB),
 * texturas 516 KB. Total ~760 KB (el `caja.glb` soldado pesa 1 MB).
 *
 * Regenerar: el script de corte (`build.mjs`) quedó fuera del repo, en el
 * scratchpad temporal del agente; si hace falta rehacerlo, estos son los pasos:
 *   node build.mjs Meshy_..._texture.glb out   (Node + @gltf-transform/core,
 *   functions y extensions v4, meshoptimizer, sharp, three)
 *   1. weld + simplify (meshopt, ratio 0,085, error 0,0015) de la malla entera
 *   2. texturas → WebP 1536
 *   3. recorte de triángulos por el plano y = 0,584 interpolando
 *      posición/normal/UV (los dos lados comparten los vértices del corte)
 *   4. con el contorno del corte: borde + paredes + fondo (cuerpo) y borde +
 *      panel rebajado 0,045 (tapa); triangulado con THREE.ShapeUtils
 *   5. la tapa se traslada a la bisagra; meshopt nivel alto; GLB con las
 *      imágenes como archivos externos
 *
 * Contrato: `openRef.current` va de 0 (cerrada) a 1 (abierta) y lo mueve quien
 * use el componente. La tapa lo sigue con un resorte (leve sobrepaso al abrir
 * y un rebote chico al cerrar contra el cuerpo), sin re-renders de React.
 * La luz interior y el "contenido" que sube escalan con la apertura real de
 * la tapa; cerrada, todo eso queda invisible (costo ~0).
 */

export const BODY_URL = "/models/caja-cuerpo.glb";
export const LID_URL = "/models/caja-tapa.glb";

/** Eje de la bisagra (unidades del modelo). */
export const HINGE: [number, number, number] = [0, 0.584, -0.8627];
export const MAX_ANGLE = THREE.MathUtils.degToRad(110);

// Hueco interior (unidades del modelo), medido en el script de corte.
const RIM_Y = 0.584;
const FLOOR_Y = -0.6;
const INNER = 0.7; // medio lado útil del hueco (deja aire contra la pared)
const COLUMN_TOP = RIM_Y + 0.9; // la luz sobresale un poco del borde

// Resorte de la tapa: subamortiguado (sobrepaso de ~5° al abrir, ~0,6 s en
// llegar). Lento a propósito: es una tapa de metal pesada.
const STIFFNESS = 32;
const DAMPING = 2 * 0.68 * Math.sqrt(STIFFNESS);
const PARTICLES = 26;

// Columna de luz: un cilindro abierto, más denso abajo, que se apaga pasando
// el borde, con anillos finos que suben. La densidad depende de cuánto mira
// cada punto a la cámara, así el centro se ve más lleno (lee como volumen).
const columnVertex = /* glsl */ `
  varying float vH;
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    vH = uv.y;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalMatrix * normal;
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;
const columnFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpen;
  uniform float uTime;
  uniform float uRim;
  varying float vH;
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    float facing = abs(dot(normalize(vN), normalize(vView)));
    float body = smoothstep(0.0, 0.06, vH) * (1.0 - smoothstep(uRim - 0.25, 1.0, vH));
    float rings = smoothstep(0.9, 1.0, fract(vH * 6.0 - uTime * 0.3));
    float a = uOpen * pow(facing, 1.6) * body * (0.16 + 0.22 * rings);
    gl_FragColor = vec4(uColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Partículas: la posición sale del shader (semilla + tiempo), sin tocar buffers.
const particleVertex = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime;
  uniform float uPx;
  uniform float uFloor;
  uniform float uTop;
  uniform float uRim;
  uniform float uHalf;
  varying float vAlpha;
  void main() {
    float t = fract(aSeed.x + uTime * (0.07 + 0.06 * aSeed.y));
    float y = mix(uFloor, uTop, t);
    float sway = 6.2832 * (t + aSeed.w);
    vec3 p = vec3((aSeed.z * 2.0 - 1.0) * uHalf + 0.04 * sin(sway),
                  y,
                  (aSeed.w * 2.0 - 1.0) * uHalf + 0.04 * cos(sway));
    // aparece abajo, se apaga al pasar el borde
    vAlpha = smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(uRim, uTop, y));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (0.025 + 0.02 * aSeed.y) * uPx / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const particleFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpen;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha * uOpen * 0.9;
    gl_FragColor = vec4(uColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Resplandor del fondo: mancha radial suave.
const floorFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpen;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = uOpen * 0.55 * (1.0 - smoothstep(0.0, 1.0, d));
    gl_FragColor = vec4(uColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
const floorVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const noRaycast = () => null;

type CargoBoxModelProps = {
  /** 0 = cerrada, 1 = abierta. Lo escribe el controlador; se lee por frame. */
  openRef: MutableRefObject<number>;
  /** Color de la luz interior. */
  glow: string;
  /**
   * Luz puntual COMPARTIDA por todas las cajas (la crea el escenario, siempre
   * presente). Una luz por caja que aparecía y desaparecía cambiaba la cantidad
   * de luces de la escena y obligaba a recompilar todos los shaders la primera
   * vez que se abría una tapa (el tirón). Acá cada caja solo la mueve y la
   * enciende mientras está abierta.
   */
  sharedLight?: MutableRefObject<THREE.PointLight | null>;
};

export default function CargoBoxModel({ openRef, glow, sharedLight }: CargoBoxModelProps) {
  const { scene: bodyScene } = useGLTF(BODY_URL);
  const { scene: lidScene } = useGLTF(LID_URL);

  const body = useMemo(() => bodyScene.clone(true), [bodyScene]);
  const lid = useMemo(() => {
    // La tapa trae las mismas texturas: usa el material del cuerpo para no
    // tener dos copias en GPU (no se modifica ningún material).
    const isBoxMesh = (o: THREE.Object3D): o is THREE.Mesh =>
      o instanceof THREE.Mesh && !Array.isArray(o.material) && o.material.name === "caja";
    let shared = null as THREE.Material | null;
    bodyScene.traverse((o) => {
      if (isBoxMesh(o)) shared = o.material as THREE.Material;
    });
    const clone = lidScene.clone(true);
    clone.traverse((o) => {
      if (shared && isBoxMesh(o)) o.material = shared;
    });
    return clone;
  }, [bodyScene, lidScene]);

  const hingeRef = useRef<THREE.Group>(null);
  const fxRef = useRef<THREE.Group>(null);
  const spring = useRef({ angle: 0, vel: 0 });
  const scratch = useMemo(() => new THREE.Vector3(), []);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(glow) },
      uOpen: { value: 0 },
      uTime: { value: 0 },
      uPx: { value: 500 },
      uFloor: { value: FLOOR_Y },
      uTop: { value: COLUMN_TOP },
      uRim: { value: (RIM_Y - FLOOR_Y) / (COLUMN_TOP - FLOOR_Y) },
      uHalf: { value: INNER * 0.85 },
    }),
    // El color se actualiza aparte (abajo) para no recrear los materiales.
    []
  );
  uniforms.uColor.value.set(glow);

  // Partículas: la posición real la calcula el shader; `position` es relleno.
  const particles = useMemo(() => {
    const seeds = new Float32Array(PARTICLES * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    return { seeds, positions: new Float32Array(PARTICLES * 3) };
  }, []);

  useFrame((state, delta) => {
    const s = spring.current;
    const target = THREE.MathUtils.clamp(openRef.current, 0, 1) * MAX_ANGLE;
    // Pasos chicos: estable aunque un frame tarde (pestaña en segundo plano).
    const dt = Math.min(delta, 1 / 20);
    const steps = Math.ceil(dt / (1 / 120));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      s.vel += (STIFFNESS * (target - s.angle) - DAMPING * s.vel) * h;
      s.angle += s.vel * h;
      // Contra el cuerpo no puede pasar: rebota apenas, como metal apoyando.
      if (s.angle < 0) {
        s.angle = 0;
        s.vel = s.vel < -0.4 ? -s.vel * 0.3 : 0;
      }
    }
    if (hingeRef.current) hingeRef.current.rotation.x = -s.angle;

    // Intensidad del interior según lo que realmente se abrió la tapa.
    const open = THREE.MathUtils.smoothstep(s.angle / MAX_ANGLE, 0.02, 0.6);
    const fx = fxRef.current;
    if (!fx) return;
    fx.visible = open > 0.001;
    if (!fx.visible) return;

    uniforms.uOpen.value = open;
    uniforms.uTime.value = state.clock.elapsedTime;
    // El padre escala la caja: la luz y el tamaño de las partículas se
    // ajustan a la escala real en el mundo.
    const scale = fx.getWorldScale(scratch).x;
    const proj = state.camera.projectionMatrix.elements[5];
    uniforms.uPx.value = state.size.height * state.viewport.dpr * 0.5 * proj * scale;
    const light = sharedLight?.current;
    // Si hay dos cajas con tapa en movimiento a la vez, manda la más abierta.
    if (light && open >= (light.userData.best ?? 0)) {
      light.userData.best = open;
      fx.localToWorld(light.position.set(0, FLOOR_Y + 0.35, 0));
      light.color.set(glow);
      light.intensity = open * 4.5 * scale * scale;
      light.distance = 1.6 * scale; // corta antes de llegar al exterior (no hay sombras)
    }
  });

  const columnHeight = COLUMN_TOP - FLOOR_Y;

  return (
    <group>
      <primitive object={body} />
      <group ref={hingeRef} position={HINGE}>
        <primitive object={lid} />
      </group>
      {/* Interior vivo: apagado (invisible) mientras la caja está cerrada */}
      <group ref={fxRef} visible={false}>
        <mesh position={[0, FLOOR_Y + 0.004, 0]} rotation-x={-Math.PI / 2} raycast={noRaycast} renderOrder={1}>
          <planeGeometry args={[INNER * 2, INNER * 2]} />
          <shaderMaterial
            uniforms={uniforms}
            vertexShader={floorVertex}
            fragmentShader={floorFragment}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh position={[0, FLOOR_Y + columnHeight / 2, 0]} raycast={noRaycast} renderOrder={2}>
          <cylinderGeometry args={[INNER, INNER * 0.92, columnHeight, 40, 1, true]} />
          <shaderMaterial
            uniforms={uniforms}
            vertexShader={columnVertex}
            fragmentShader={columnFragment}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <points frustumCulled={false} raycast={noRaycast} renderOrder={3}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[particles.positions, 3]} />
            <bufferAttribute attach="attributes-aSeed" args={[particles.seeds, 4]} />
          </bufferGeometry>
          <shaderMaterial
            uniforms={uniforms}
            vertexShader={particleVertex}
            fragmentShader={particleFragment}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      </group>
    </group>
  );
}

useGLTF.preload(BODY_URL);
useGLTF.preload(LID_URL);
