import type * as THREE from 'three';

/**
 * The PALMA trophy.
 *
 * Built procedurally from the same geometry as the printed mark: a spine, four
 * pairs of fronds sweeping upward, a crown, standing on a plinth. Nothing is
 * loaded from a file — the trophy *is* the identity, expressed in three
 * dimensions, so it can never drift from the mark on the certificate.
 *
 * Deliberate restraint: one object, two lights, no environment map, no
 * post-processing, no particles. It turns slowly and leans toward the reader.
 * That is all it does.
 */

export type TrophyHandle = {
  /** Point the trophy toward a normalised pointer position (−1…1). */
  lookToward: (x: number, y: number) => void;
  setRunning: (running: boolean) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
};

const CHAMPAGNE = 0xc9b58a;
const OLIVE = 0x4a5148;

/**
 * The frond profile, mirrored: a sweep out and up from the spine.
 *
 * Proportion matters more than detail here. The fronds have to out-reach the
 * spine or the object reads as a sapling rather than an award — so the widest
 * pair spans nearly the full height of the piece.
 */
/**
 * The fronds, as blades rather than tubes.
 *
 * A constant-radius tube ends bluntly and reads as a branch — the first
 * attempt at this looked like a coat rack. A frond has to taper to a point, so
 * each one is a flat leaf profile extruded thinly: crisp edges that catch the
 * key light, and an unmistakable laurel silhouette from the front.
 *
 *   at    — height on the spine
 *   angle — degrees above horizontal
 *   length/width — the blade
 *   splay — rotation out of plane, so the piece has depth as it turns
 */
const FRONDS: { at: number; angle: number; length: number; width: number; splay: number }[] = [
  { at: 1.7, angle: 52, length: 1.16, width: 0.2, splay: 14 },
  { at: 1.3, angle: 46, length: 1.0, width: 0.18, splay: -10 },
  { at: 0.93, angle: 40, length: 0.84, width: 0.155, splay: 9 },
  { at: 0.6, angle: 34, length: 0.66, width: 0.13, splay: -7 },
];

/** Total height of the piece, used to frame the camera. */
const TROPHY_HEIGHT = 2.5;

export async function createTrophy(
  canvas: HTMLCanvasElement,
  options: { width: number; height: number; dpr: number },
): Promise<TrophyHandle> {
  const three = (await import('three')) as typeof THREE;
  const {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    Group,
    Mesh,
    MeshStandardMaterial,
    CylinderGeometry,
    TorusGeometry,
    SphereGeometry,
    ExtrudeGeometry,
    Shape,
    DirectionalLight,
    AmbientLight,
    MathUtils,
  } = three;

  const scene = new Scene();
  // No background: the canvas composites over the ink section, so the trophy
  // sits *on* the page rather than inside a visible box.

  const fov = 32;
  const centre = TROPHY_HEIGHT * 0.46;
  // Frame the whole piece with a little air, from the vertical extent.
  const distance = (TROPHY_HEIGHT * 0.62) / Math.tan((fov / 2) * (Math.PI / 180));

  const camera = new PerspectiveCamera(fov, options.width / options.height, 0.1, 100);
  camera.position.set(0, centre + 0.32, distance);
  camera.lookAt(0, centre, 0);

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearAlpha(0);
  renderer.setPixelRatio(Math.min(options.dpr, 2));
  renderer.setSize(options.width, options.height, false);

  // Two lights. A key from the front-right that catches the frond edges, and a
  // low fill so the ink side of the object does not go completely black.
  const key = new DirectionalLight(0xfff6e6, 3.4);
  key.position.set(3.4, 5.4, 4.6);
  scene.add(key);

  // A rim from behind-left picks the fronds out against the ink section.
  const rim = new DirectionalLight(0xc9b58a, 2.2);
  rim.position.set(-4.2, 2.2, -2.6);
  scene.add(rim);

  // A low fill so the shadow side holds colour instead of going to black.
  const fill = new DirectionalLight(0xf4f0e8, 1.1);
  fill.position.set(-2.2, 0.4, 3.6);
  scene.add(fill);

  scene.add(new AmbientLight(0xaaa397, 0.85));

  // A near-pure metal has nothing to reflect without an environment map, and
  // renders almost black. Rather than ship a PMREM environment for one object,
  // the material is tuned as a *lit* metal: enough metalness to catch the key
  // light along the frond edges, enough diffuse to hold the champagne colour.
  const metal = new MeshStandardMaterial({
    color: CHAMPAGNE,
    metalness: 0.45,
    roughness: 0.3,
  });

  const plinthMaterial = new MeshStandardMaterial({
    color: OLIVE,
    metalness: 0.2,
    roughness: 0.55,
  });

  const trophy = new Group();
  const disposables: { dispose: () => void }[] = [metal, plinthMaterial];

  const track = <T extends { dispose: () => void }>(value: T): T => {
    disposables.push(value);
    return value;
  };

  // Spine.
  const spine = new Mesh(track(new CylinderGeometry(0.048, 0.072, 2.3, 24)), metal);
  spine.position.y = 1.2;
  trophy.add(spine);

  /** A pointed leaf profile, rooted at the origin and running along +x. */
  const blade = (length: number, width: number) => {
    const shape = new Shape();
    shape.moveTo(0, 0);
    // Upper edge: swells early, tapers to the tip.
    shape.bezierCurveTo(length * 0.2, width, length * 0.62, width * 0.82, length, 0);
    // Lower edge, back to the root.
    shape.bezierCurveTo(length * 0.62, -width * 0.82, length * 0.2, -width, 0, 0);
    return shape;
  };

  // Fronds, mirrored about the spine.
  for (const frond of FRONDS) {
    const geometry = track(
      new ExtrudeGeometry(blade(frond.length, frond.width), {
        depth: 0.018,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.012,
        bevelSegments: 3,
        curveSegments: 20,
      }),
    );

    for (const side of [-1, 1] as const) {
      const mesh = new Mesh(geometry, metal);
      mesh.position.set(0, frond.at, 0);
      mesh.rotation.z = MathUtils.degToRad(frond.angle) * side;
      mesh.rotation.y = MathUtils.degToRad(frond.splay) * side;
      if (side === -1) mesh.scale.x = -1;
      trophy.add(mesh);
    }
  }

  // Crown.
  const crown = new Mesh(track(new SphereGeometry(0.115, 24, 20)), metal);
  crown.position.y = 2.42;
  trophy.add(crown);

  // Collar and plinth. The plinth is wide and low — it gives the piece the
  // weight that makes it an award rather than an ornament.
  const collar = new Mesh(track(new TorusGeometry(0.3, 0.032, 14, 48)), metal);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.26;
  trophy.add(collar);

  const plinth = new Mesh(track(new CylinderGeometry(0.56, 0.7, 0.34, 48)), plinthMaterial);
  plinth.position.y = 0.06;
  trophy.add(plinth);

  const base = new Mesh(track(new CylinderGeometry(0.74, 0.78, 0.09, 48)), metal);
  base.position.y = -0.15;
  trophy.add(base);

  scene.add(trophy);

  let running = true;
  let frame = 0;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let elapsed = 0;
  let last = performance.now();

  const render = (now: number) => {
    frame = requestAnimationFrame(render);
    if (!running) {
      last = now;
      return;
    }

    const delta = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += delta;

    // A slow constant turn, plus a lean toward the pointer. The lean is eased
    // toward rather than set, so the object has weight.
    currentX = MathUtils.lerp(currentX, targetX, 1 - Math.pow(0.0015, delta));
    currentY = MathUtils.lerp(currentY, targetY, 1 - Math.pow(0.0015, delta));

    trophy.rotation.y = elapsed * 0.22 + currentX * 0.42;
    trophy.rotation.x = currentY * -0.18;
    trophy.position.y = Math.sin(elapsed * 0.7) * 0.035;

    renderer.render(scene, camera);
  };

  frame = requestAnimationFrame(render);

  return {
    lookToward(x, y) {
      targetX = x;
      targetY = y;
    },
    setRunning(value) {
      running = value;
    },
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    },
    dispose() {
      cancelAnimationFrame(frame);
      for (const item of disposables) item.dispose();
      renderer.dispose();
    },
  };
}
