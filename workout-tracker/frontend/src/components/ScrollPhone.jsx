import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useVideoTexture, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import './ScrollPhone.css';

/**
 * ScrollPhone – 3D iPhone-Mockup, das sich beim Scrollen dreht,
 * während das Screenrecording auf dem Display einmal vollständig abspielt.
 *
 * Geometrie ist aus dem Video-Seitenverhältnis abgeleitet (1290 x 2796).
 * Tauschst du das Video, passe VIDEO_W / VIDEO_H an.
 *
 * Benötigt: npm i three @react-three/fiber @react-three/drei
 *
 * Für schnelles Laden sollte das Video H.264/yuv420p und faststart verwenden.
 */

/* ---------- Tuning ---------- */
const CONFIG = {
  scrollHeight: '380vh',
  rotateY: Math.PI * 0.55,
  tiltX: 0.34,
  damping: 5,
  tabletX: 2.2,
  compactDesktopX: 2.8,
  desktopX: 3.8,
};

/* ---------- Maße aus dem Video ---------- */
const VIDEO_W = 1290;
const VIDEO_H = 2796;
const SCREEN_W = 2.94;
const SCREEN_H = SCREEN_W * (VIDEO_H / VIDEO_W);
const BODY_W = SCREEN_W + 0.26;
const BODY_H = SCREEN_H + 0.26;

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);      s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);      s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);          s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function makeBodyGeometry() {
  const g = new THREE.ExtrudeGeometry(roundedRect(BODY_W, BODY_H, 0.45), {
    depth: 0.26,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 6,
    curveSegments: 28,
  });
  g.center();
  return g;
}

/* ---------- Scroll-Fortschritt in einen Ref (kein Re-Render pro Frame) ---------- */
function useScrollProgress(sectionRef) {
  const progress = useRef(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      progress.current = total > 0 ? THREE.MathUtils.clamp(-rect.top / total, 0, 1) : 0;
      el.dataset.step = String(Math.min(2, Math.floor(progress.current * 3)));
      el.dataset.started = rect.top <= window.innerHeight * 0.72 ? 'true' : 'false';
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [sectionRef]);

  return progress;
}

/* ---------- Das Handy ---------- */
function Phone({ progress, videoSrc }) {
  const group = useRef();

  const texture = useVideoTexture(videoSrc, {
    start: false,
    muted: true,
    loop: false,
    playsInline: true,
    crossOrigin: 'anonymous',
  });
  // three.js-Objekte sind bewusst mutabel – Setup gehört in einen Effect,
  // nicht in den Render-Body (sonst meckert der React Compiler).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- three.js-Texturen werden per Zuweisung konfiguriert
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
  }, [texture]);

  // Die Demo startet beim ersten Frame und läuft während der Scrollsequenz
  // genau einmal vollständig durch. Die Handybewegung bleibt scrollgesteuert.
  useEffect(() => {
    const v = texture.image;
    if (!v) return undefined;
    const playFromStart = () => {
      v.currentTime = 0;
      const playback = v.play();
      if (playback?.catch) playback.catch(() => {});
    };
    if (v.readyState >= 2) playFromStart();
    else v.addEventListener('loadeddata', playFromStart, { once: true });
    return () => v.removeEventListener('loadeddata', playFromStart);
  }, [texture]);

  const bodyGeo = useMemo(() => makeBodyGeometry(), []);

  const frontGeo = useMemo(
    () => new THREE.ShapeGeometry(roundedRect(BODY_W - 0.07, BODY_H - 0.07, 0.42), 24),
    [],
  );

  // Display-Geometrie mit auf 0..1 normalisierten UVs
  const screenGeo = useMemo(() => {
    const g = new THREE.ShapeGeometry(roundedRect(SCREEN_W, SCREEN_H, 0.4), 24);
    g.computeBoundingBox();
    const bb = g.boundingBox;
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    const dx = bb.max.x - bb.min.x;
    const dy = bb.max.y - bb.min.y;
    for (let i = 0; i < pos.count; i += 1) {
      uv.setXY(i, (pos.getX(i) - bb.min.x) / dx, (pos.getY(i) - bb.min.y) / dy);
    }
    uv.needsUpdate = true;
    return g;
  }, []);

  const islandGeo = useMemo(() => new THREE.ShapeGeometry(roundedRect(0.76, 0.22, 0.11), 16), []);

  /* eslint-disable react-hooks/immutability -- useFrame ist ein rAF-Callback,
     kein Render. three.js-Objekte werden hier absichtlich pro Frame mutiert. */
  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const p = progress.current;

    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, (p - 0.5) * CONFIG.rotateY, CONFIG.damping, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -0.04 + p * CONFIG.tiltX, CONFIG.damping, dt);
    g.position.x = THREE.MathUtils.damp(
      g.position.x,
      state.size.width < 700
        ? 0
        : state.size.width < 1000
          ? CONFIG.tabletX
          : state.size.width < 1280
            ? CONFIG.compactDesktopX
            : CONFIG.desktopX,
      CONFIG.damping,
      dt,
    );
    g.position.y = THREE.MathUtils.damp(
      g.position.y,
      Math.sin(p * Math.PI) * 0.12 - 0.2,
      CONFIG.damping,
      dt,
    );
    const targetScale = state.size.width < 700
      ? 0.86
      : state.size.height < 800
        ? 1.02
        : state.size.height < 950
          ? 1.12
          : 1.2;
    const nextScale = THREE.MathUtils.damp(g.scale.x, targetScale, CONFIG.damping, dt);
    g.scale.setScalar(nextScale);

    if (texture.image?.readyState >= 2) texture.needsUpdate = true;
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <group ref={group}>
      <mesh geometry={bodyGeo}>
        <meshStandardMaterial color="#9b9ea3" metalness={1} roughness={0.28} envMapIntensity={1.1} />
      </mesh>

      <mesh geometry={frontGeo} position={[0, 0, 0.171]}>
        <meshStandardMaterial color="#050506" roughness={0.45} metalness={0.2} />
      </mesh>

      <mesh geometry={screenGeo} position={[0, 0, 0.174]}>
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>

      <mesh geometry={islandGeo} position={[0, SCREEN_H / 2 - 0.3, 0.177]}>
        <meshBasicMaterial color="#000000" toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ---------- Fallback beim Laden ---------- */
function Placeholder() {
  const geo = useMemo(() => makeBodyGeometry(), []);
  return (
    <mesh geometry={geo} scale={0.95}>
      <meshStandardMaterial color="#2a2c30" metalness={0.9} roughness={0.4} />
    </mesh>
  );
}

/* ---------- Export ---------- */
export default function ScrollPhone({ videoSrc = '/app-demo.mp4', children }) {
  const sectionRef = useRef(null);
  const progress = useScrollProgress(sectionRef);

  return (
    <section ref={sectionRef} className="scroll-phone" style={{ height: CONFIG.scrollHeight }}>
      <div className="scroll-phone-sticky">
        <div className="scroll-phone-glow" aria-hidden="true" />

        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 14], fov: 32 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.55} />
          <directionalLight position={[4, 7, 8]} intensity={1.35} />
          <directionalLight position={[-6, 2, 4]} intensity={0.55} color="#cfe6ff" />
          <directionalLight position={[-3, -4, -6]} intensity={0.5} color="#c5fe00" />

          <Suspense fallback={<Placeholder />}>
            <Phone progress={progress} videoSrc={videoSrc} />
          </Suspense>

          <ContactShadows position={[0, -3.6, 0]} opacity={0.3} scale={14} blur={2.6} far={5} />
        </Canvas>

        {children}
      </div>
    </section>
  );
}
