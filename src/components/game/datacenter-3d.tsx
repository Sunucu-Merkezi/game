'use client';
import { Footprints, Hammer, Move3d, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Button, cn } from '@/components/ui/primitives';
import type { Action } from '@/game-engine/action-schema';
import { BUILD_D, BUILD_W, GRID, checkPlacement, footprint, keyKind, unplacedKeys } from '@/game-engine/layout';
import type { Building, Placement, Rack, Srv } from '@/game-engine/types';
import type { Catalog } from '@/types/catalog';

const FLOOR_H = 4.2;
const U_H = 0.05;

interface Props { building: Building; racks: Rack[]; servers: Srv[]; cat: Catalog; level: number; money: number; onAction: (a: Action) => void }

type BarTab = 'rack' | 'server' | 'network' | 'power' | 'cooling';
const BAR_TABS: { id: BarTab; label: string }[] = [
  { id: 'rack', label: 'Rack' }, { id: 'server', label: 'Sunucu' }, { id: 'network', label: 'Ağ' }, { id: 'power', label: 'Enerji' }, { id: 'cooling', label: 'Soğutma' },
];

const statusColor = (v: Srv): number => (!v.ok ? 0xef4444 : v.hot ? 0xf59e0b : v.dm ? 0xeab308 : 0x22c55e);
const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.2, ...extra });

/** Oyuncunun yerleştirdiği konumlardan sahneyi kurar. */
function buildScene(p: Props) {
  const root = new THREE.Group();
  const floors: THREE.Group[] = [];
  const pickables: THREE.Object3D[] = [];
  const yard = new THREE.Group();
  root.add(yard);

  for (let f = 0; f < p.building.floors; f++) {
    const g = new THREE.Group();
    g.position.y = f * FLOOR_H;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(BUILD_W, 0.3, BUILD_D), mat(0x59636f, { roughness: 0.9 }));
    slab.receiveShadow = true;
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BUILD_W, FLOOR_H - 0.3, BUILD_D)), new THREE.LineBasicMaterial({ color: 0x60a5fa }));
    outline.position.y = (FLOOR_H - 0.3) / 2;
    g.add(outline);
    // koridor şeritleri
    for (const z of [-3.2, 3.2]) {
      const lane = new THREE.Mesh(new THREE.PlaneGeometry(BUILD_W - 4, 1.6), new THREE.MeshBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.55 }));
      lane.rotation.x = -Math.PI / 2;
      lane.position.set(0, 0.03, z);
      g.add(lane);
    }
    slab.position.y = -0.15;
    g.add(slab);
    // ızgara çizgileri (yerleşimi kolaylaştırır)
    const grid = new THREE.GridHelper(BUILD_W, BUILD_W, 0x2a3445, 0x2a3445);
    (grid.material as THREE.Material).opacity = 0.35;
    (grid.material as THREE.Material).transparent = true;
    grid.scale.z = BUILD_D / BUILD_W;
    grid.position.y = 0.02;
    g.add(grid);
    const wallM = mat(0x6f8a5a, { transparent: true, opacity: 0.32, depthWrite: false });
    for (const [x, z, w, d] of [[0, -BUILD_D / 2, BUILD_W, 0.2], [0, BUILD_D / 2, BUILD_W, 0.2], [-BUILD_W / 2, 0, 0.2, BUILD_D], [BUILD_W / 2, 0, 0.2, BUILD_D]] as const) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, FLOOR_H - 0.4, d), wallM);
      wall.position.set(x, (FLOOR_H - 0.4) / 2, z);
      g.add(wall);
    }
    for (let i = -3; i <= 3; i++) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.05, 0.3), new THREE.MeshBasicMaterial({ color: 0xdbeafe }));
      light.position.set(i * 5.5, FLOOR_H - 0.5, 0);
      g.add(light);
    }
    floors.push(g);
    root.add(g);
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 140), mat(0x2b3f2b));
  ground.receiveShadow = true;
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.31;
  root.add(ground);

  const pl = p.building.placed ?? {};
  const boxes: { f: number; x: number; z: number; w: number; d: number }[] = [];
  const addPickable = (m: THREE.Object3D, key: string, f: number) => { m.userData = { key, floor: f }; pickables.push(m); };

  for (const [key, q] of Object.entries(pl)) {
    const kind = keyKind(key);
    const grp = new THREE.Group();
    grp.position.set(q.x, 0, q.z);
    grp.rotation.y = (q.r * Math.PI) / 2;
    const [fw, fd] = footprint(key, 0);
    const [bw, bd2] = footprint(key, q.r);
    boxes.push({ f: q.f, x: q.x, z: q.z, w: bw, d: bd2 });
    if (kind === 'rack') {
      const r = p.racks.find((x) => x.id === key);
      if (!r) continue;
      const h = Math.max(1.0, r.u * U_H + 0.2);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(fw, h, fd), mat(0x151a22, { roughness: 0.5 }));
      frame.position.y = h / 2;
      frame.castShadow = true;
      grp.add(frame);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(fw + 0.06, 0.05, fd + 0.06), mat(0x3b82f6, { emissive: 0x3b82f6, emissiveIntensity: 0.5 }));
      cap.position.y = h + 0.02;
      grp.add(cap);
      addPickable(frame, key, q.f);
      let y = 0.1;
      for (const v of p.servers.filter((x) => x.rack === r.id)) {
        const t = p.cat.SERVERS[v.type];
        const sh = t.u * U_H;
        const body = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.9, sh * 0.92, 0.05), mat(v.type === 'gpu' ? 0x3b2f66 : v.type === 'depolama' ? 0x244a63 : 0x2b3442));
        body.position.set(0, y + sh / 2, fd / 2 + 0.03);
        grp.add(body);
        addPickable(body, key, q.f);
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.1, sh * 0.5, 0.06), new THREE.MeshBasicMaterial({ color: statusColor(v) }));
        led.position.set(-fw * 0.35, y + sh / 2, fd / 2 + 0.05);
        grp.add(led);
        for (let i = 0; i < 3; i++) {
          const l2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: i === 0 ? statusColor(v) : 0x60a5fa }));
          l2.position.set(-fw * 0.2 + i * 0.1, y + sh / 2, fd / 2 + 0.07);
          grp.add(l2);
        }
        y += sh;
      }
    } else {
      const it = p.cat.INFRA[kind];
      let color = 0x1d4ed8, h = 2, emissive = 0x1d4ed8;
      if (it.cat === 'cooling') { color = kind === 'sivi' ? 0x38bdf8 : 0xe5e7eb; h = it.slot > 1 ? 2.4 : 1.8; emissive = kind === 'sivi' ? 0x0ea5e9 : 0; }
      else if (kind === 'generator') { color = 0xf59e0b; h = 2.2; emissive = 0; }
      else if (kind === 'trafo') { color = 0xb45309; h = 2.2; emissive = 0; }
      else if (it.cat === 'power') { color = kind === 'ups' ? 0xeab308 : 0xa16207; emissive = 0; }
      const m = new THREE.Mesh(new THREE.BoxGeometry(fw, h, fd), mat(color, emissive ? { emissive, emissiveIntensity: 0.35 } : {}));
      m.position.y = h / 2;
      m.castShadow = true;
      grp.add(m);
      if (it.cat === 'cooling') {
        const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 20), mat(0x111827));
        fan.position.y = h + 0.03;
        grp.add(fan);
      }
      addPickable(m, key, q.f);
    }
    (kind === 'generator' || kind === 'trafo' ? yard : floors[Math.min(q.f, floors.length - 1)]).add(grp);
  }
  return { root, floors, yard, pickables, boxes };
}

export function Datacenter3D(props: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const api = useRef<{ setFloor: (f: number | null) => void; setMode: (m: 'orbit' | 'walk') => void; reset: () => void; rebuild: (p: Props) => void } | null>(null);
  const [floor, setFloorState] = useState<number | null>(null);
  const [mode, setModeState] = useState<'orbit' | 'walk'>('orbit');
  const [edit, setEdit] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [rot, setRot] = useState(0);
  const [barTab, setBarTab] = useState<BarTab>('rack');
  const [hint, setHint] = useState('');
  const pendingKind = useRef<string | null>(null);
  const knownUnplaced = useRef<Set<string>>(new Set());
  const latest = useRef(props);
  latest.current = props;
  const editRef = useRef({ edit: false, armed: null as string | null, rot: 0, floor: null as number | null });
  editRef.current = { edit, armed, rot, floor };

  const signature = useMemo(
    () => JSON.stringify([props.building.floors, props.building.infra, props.building.placed, props.racks.map((r) => r.id + r.type), props.servers.map((v) => v.id + v.type + (v.ok ? 1 : 0) + (v.hot ? 1 : 0) + (v.dm ? 1 : 0))]),
    [props.building, props.racks, props.servers],
  );

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);
    scene.fog = new THREE.Fog(0x070b14, 90, 240);
    scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x2a3a2a, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(30, 60, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50, near: 1, far: 160 });
    scene.add(sun);
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.05;

    // yerleştirme hayaleti
    const ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.45 }));
    ghost.visible = false;
    scene.add(ghost);
    let ghostPlacement: { key: string; p: Placement; err: string | null } | null = null;

    let built: ReturnType<typeof buildScene> | null = null;
    let curFloor: number | null = null;
    let curMode: 'orbit' | 'walk' = 'orbit';
    const walk = { yaw: 0, pitch: 0, x: 0, z: 10 };
    const keys = new Set<string>();

    const applyFloor = () => {
      if (!built) return;
      built.floors.forEach((g, i) => { g.visible = curFloor === null || curFloor === i; });
      built.yard.visible = curFloor === null || curFloor === 0;
    };
    const reset = () => {
      camera.position.set(26, 20, 30);
      controls.target.set(0, 1.5, 0);
      controls.update();
    };
    const rebuild = (p: Props) => {
      if (built) {
        scene.remove(built.root);
        built.root.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); } });
      }
      built = buildScene(p);
      scene.add(built.root);
      applyFloor();
    };
    const setMode = (m: 'orbit' | 'walk') => {
      curMode = m;
      controls.enabled = m === 'orbit';
      if (m === 'walk') {
        walk.x = 0; walk.z = 10; walk.yaw = Math.PI; walk.pitch = 0;
        void renderer.domElement.requestPointerLock?.();
      } else if (document.pointerLockElement) document.exitPointerLock();
      if (m === 'orbit') reset();
    };
    api.current = { setFloor: (f) => { curFloor = f; applyFloor(); }, setMode, reset, rebuild };
    rebuild(latest.current);
    reset();

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (down) keys.add(k); else keys.delete(k);
      if (!down) return;
      if (k === 'r' && editRef.current.armed) { setRot((v) => (v + 1) % 4); return; }
      if (k === 'escape') { setArmed(null); return; }
      if (curMode !== 'orbit') return;
      const off = camera.position.clone().sub(controls.target);
      const sph = new THREE.Spherical().setFromVector3(off);
      if (k === 'q') sph.theta += 0.08;
      if (k === 'e') sph.theta -= 0.08;
      if (k === 'z') sph.phi = Math.max(0.2, sph.phi - 0.06);
      if (k === 'x') sph.phi = Math.min(Math.PI / 2.05, sph.phi + 0.06);
      if (k === '+' || k === '=') sph.radius = Math.max(4, sph.radius * 0.9);
      if (k === '-') sph.radius = Math.min(160, sph.radius * 1.1);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sph));
    };
    const kd = onKey(true), ku = onKey(false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    const onMouseMove = (e: MouseEvent) => {
      const dragging = e.buttons === 1 && document.pointerLockElement !== renderer.domElement && (e.target === renderer.domElement);
      if (curMode !== 'walk' || (document.pointerLockElement !== renderer.domElement && !dragging)) return;
      walk.yaw -= e.movementX * 0.0025;
      walk.pitch = Math.max(-1.2, Math.min(1.2, walk.pitch - e.movementY * 0.0025));
    };
    document.addEventListener('mousemove', onMouseMove);

    const ray = new THREE.Raycaster();
    const ndcOf = (e: PointerEvent): THREE.Vector2 => {
      const r = renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };

    // hayalet: fare zemin düzlemini izler
    const onMove = (e: PointerEvent) => {
      const st = editRef.current;
      if (!st.edit || !st.armed || curMode !== 'orbit') { ghost.visible = false; ghostPlacement = null; return; }
      const f = st.floor ?? 0;
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -f * FLOOR_H);
      ray.setFromCamera(ndcOf(e), camera);
      const pt = new THREE.Vector3();
      if (!ray.ray.intersectPlane(plane, pt)) { ghost.visible = false; return; }
      const p: Placement = { f, x: Math.round(pt.x / GRID) * GRID, z: Math.round(pt.z / GRID) * GRID, r: st.rot };
      const err = checkPlacement(latest.current.building, st.armed, p);
      const [w, d] = footprint(st.armed, st.rot);
      const h = keyKind(st.armed) === 'rack' ? 2 : 1.8;
      ghost.scale.set(w, h, d);
      ghost.position.set(p.x, f * FLOOR_H + h / 2, p.z);
      (ghost.material as THREE.MeshBasicMaterial).color.setHex(err ? 0xef4444 : 0x22c55e);
      ghost.visible = true;
      ghostPlacement = { key: st.armed, p, err };
    };
    let down = { x: 0, y: 0 };
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e: PointerEvent) => {
      if (curMode === 'walk' && document.pointerLockElement !== renderer.domElement) void renderer.domElement.requestPointerLock?.();
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5 || !built) return;
      const st = editRef.current;
      if (st.edit && st.armed && ghostPlacement && !ghostPlacement.err) {
        const g = ghostPlacement;
        latest.current.onAction({ type: 'placeItem', b: latest.current.building.id, key: g.key, f: g.p.f, x: g.p.x, z: g.p.z, r: g.p.r });
        setArmed(null); ghost.visible = false;
        return;
      }
      ray.setFromCamera(curMode === 'walk' ? new THREE.Vector2(0, 0) : ndcOf(e), camera);
      const vis = built.pickables.filter((o) => { let q: THREE.Object3D | null = o; while (q) { if (!q.visible) return false; q = q.parent; } return true; });
      const hit = ray.intersectObjects(vis, false)[0];
      const ud = hit?.object.userData as { key?: string } | undefined;
      setSelected(ud?.key ?? null);
    };
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (curMode === 'walk') {
        const sp = (keys.has('shift') ? 9 : 4.5) * dt;
        const fwd = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
        const str = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
        const nx = walk.x + (-Math.sin(walk.yaw) * fwd + Math.cos(walk.yaw) * str) * sp;
        const nz = walk.z + (-Math.cos(walk.yaw) * fwd - Math.sin(walk.yaw) * str) * sp;
        const hits = (x: number, z: number) => !!built?.boxes.some((b) => b.f === (curFloor ?? 0) && Math.abs(x - b.x) < b.w / 2 + 0.35 && Math.abs(z - b.z) < b.d / 2 + 0.35);
        if (!hits(nx, walk.z)) walk.x = nx;
        if (!hits(walk.x, nz)) walk.z = nz;
        walk.x = Math.max(-BUILD_W / 2 + 1, Math.min(BUILD_W / 2 - 1, walk.x));
        walk.z = Math.max(-BUILD_D / 2 + 1, Math.min(BUILD_D / 2 - 1, walk.z));
        camera.position.set(walk.x, (curFloor ?? 0) * FLOOR_H + 1.7, walk.z);
        camera.rotation.order = 'YXZ';
        camera.rotation.set(walk.pitch, walk.yaw, 0);
      } else controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      document.removeEventListener('mousemove', onMouseMove);
      if (document.pointerLockElement) document.exitPointerLock();
      controls.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
      api.current = null;
    };
  }, []);

  useEffect(() => { api.current?.rebuild(latest.current); }, [signature]);

  useEffect(() => {
    const b = latest.current.building;
    const placedNow = b.placed ?? {};
    const keys = [...latest.current.racks.filter((r) => !placedNow[r.id]).map((r) => r.id), ...unplacedKeys(b)];
    const pk = pendingKind.current;
    if (pk) {
      const fresh = keys.find((k) => !knownUnplaced.current.has(k) && keyKind(k) === pk);
      if (fresh) { setArmed(fresh); setSelected(null); pendingKind.current = null; }
    }
    knownUnplaced.current = new Set(keys);
  }, [signature]);

  const setFloor = useCallback((f: number | null) => { setFloorState(f); api.current?.setFloor(f); setSelected(null); }, []);
  const setMode = useCallback((m: 'orbit' | 'walk') => { setModeState(m); api.current?.setMode(m); if (m === 'walk') { setEdit(false); setArmed(null); } }, []);
  const toggleEdit = () => {
    const next = !edit;
    setEdit(next); setArmed(null);
    if (next) { setMode('orbit'); if (floor === null) setFloor(0); }
  };

  const buy = (tab: BarTab, id: string) => {
    setHint('');
    if (tab === 'rack') { pendingKind.current = 'rack'; props.onAction({ type: 'buyRack', b: props.building.id, rack: id }); }
    else if (tab === 'server') {
      const rackKey = selected && keyKind(selected) === 'rack' ? selected : null;
      if (!rackKey) { setHint('Önce sahnede bir rack’e tıkla, sunucu o rack’e yerleşir.'); return; }
      props.onAction({ type: 'buyServer', server: id, rack: rackKey });
    } else { pendingKind.current = id; props.onAction({ type: 'buyInfra', b: props.building.id, item: id }); }
  };
  const barItems: { id: string; name: string; price: number; sub: string; locked: boolean }[] = barTab === 'rack'
    ? Object.entries(props.cat.RACKS).map(([k, r]) => ({ id: k, name: r.name, price: r.price, sub: `${r.u}U`, locked: false }))
    : barTab === 'server'
      ? Object.entries(props.cat.SERVERS).map(([k, s2]) => ({ id: k, name: s2.name, price: s2.price, sub: `${s2.u}U · ${s2.cores} çekirdek`, locked: props.level < s2.lvl }))
      : Object.entries(props.cat.INFRA).filter(([, it]) => it.cat === barTab).map(([k, it]) => ({ id: k, name: it.name, price: it.price, sub: it.desc, locked: props.level < it.lvl }));

  const b = props.building;
  const floors = b.floors;
  const placed = b.placed ?? {};
  const unplacedRacks = props.racks.filter((r) => !placed[r.id]);
  const unplacedInfra = unplacedKeys(b);
  const selRack = selected && keyKind(selected) === 'rack' ? props.racks.find((r) => r.id === selected) : null;
  const selServers = selRack ? props.servers.filter((v) => v.rack === selRack.id) : [];
  const keyCls = 'rounded border border-line bg-panel2 px-1.5 py-0.5 text-[11px] font-semibold text-white';
  const nameOf = (key: string): string => (keyKind(key) === 'rack' ? props.cat.RACKS[props.racks.find((r) => r.id === key)?.type ?? 'u12'].name : props.cat.INFRA[keyKind(key)].name);

  return (
    <div className="relative h-[calc(100vh-150px)] min-h-[520px] overflow-hidden rounded-xl border border-line bg-bg">
      <div ref={mountRef} className="absolute inset-0" />
      <div className="absolute left-3 top-3 w-24 space-y-1.5 rounded-xl border border-line bg-panel/90 p-2 backdrop-blur">
        <div className="px-1 text-[10px] uppercase tracking-wider text-slate-500">Kat</div>
        <button onClick={() => setFloor(null)} disabled={edit} className={cn('w-full rounded-lg border px-2 py-1.5 text-xs disabled:opacity-40', floor === null ? 'border-neon bg-neon/20 text-white' : 'border-line text-slate-300 hover:text-white')}>Tümü</button>
        {Array.from({ length: floors }, (_, i) => floors - 1 - i).map((i) => (
          <button key={i} onClick={() => setFloor(i)} className={cn('w-full rounded-lg border px-2 py-1.5 text-xs', floor === i ? 'border-neon bg-neon/20 text-white' : 'border-line text-slate-300 hover:text-white')}>Kat {i + 1}</button>
        ))}
      </div>

      <div className="absolute right-3 top-3 flex gap-1.5">
        <button onClick={toggleEdit} className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs', edit ? 'border-ok bg-ok/20 text-white' : 'border-line bg-panel text-slate-300')}><Hammer size={13} />Yerleştir</button>
        <button onClick={() => setMode('orbit')} className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs', mode === 'orbit' ? 'border-neon bg-neon/20 text-white' : 'border-line bg-panel text-slate-300')}><Move3d size={13} />Perspektif</button>
        <button onClick={() => setMode('walk')} className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs', mode === 'walk' ? 'border-neon bg-neon/20 text-white' : 'border-line bg-panel text-slate-300')}><Footprints size={13} />Yürü</button>
        <button onClick={() => api.current?.reset()} className="rounded-lg border border-line bg-panel p-1.5 text-slate-300 hover:text-white" aria-label="Kamerayı sıfırla"><RotateCcw size={14} /></button>
      </div>

      {edit && (
        <div className="absolute left-3 top-[170px] max-h-[40%] w-56 overflow-auto rounded-xl border border-ok/40 bg-panel/95 p-2.5 text-xs backdrop-blur">
          <div className="mb-1 font-semibold text-white">Envanter (yerleştirilmemiş)</div>
          <p className="mb-2 text-slate-500">Yerleştirilmeyen rack ve ekipman çalışmaz. Seç, sonra zemine tıkla. <kbd className={keyCls}>R</kbd> döndürür.</p>
          {unplacedRacks.length + unplacedInfra.length === 0 && <p className="py-3 text-center text-slate-500">Her şey yerleştirildi. Mağazadan yeni ürün al.</p>}
          {[...unplacedRacks.map((r) => r.id), ...unplacedInfra].map((key) => (
            <button key={key} onClick={() => { setArmed(key); setSelected(null); }}
              className={cn('mb-1 flex w-full items-center justify-between rounded-lg border px-2 py-1.5 text-left', armed === key ? 'border-ok bg-ok/15 text-white' : 'border-line text-slate-300 hover:border-neon')}>
              <span>{nameOf(key)}</span>
              {keyKind(key) === 'generator' || keyKind(key) === 'trafo' ? <span className="text-[10px] text-warn">saha</span> : null}
            </button>
          ))}
          {armed && <p className="mt-2 text-ok">{nameOf(armed)} seçili — zemine tıkla (Esc iptal).</p>}
        </div>
      )}

      {selected && !armed && (
        <div className="absolute right-3 top-14 w-64 rounded-xl border border-neon/40 bg-panel/95 p-3 text-xs shadow-neon backdrop-blur">
          <div className="mb-1 flex justify-between text-sm font-semibold text-white">{nameOf(selected)}<button className="text-slate-400" onClick={() => setSelected(null)}>×</button></div>
          {selRack && selServers.length === 0 && <p className="text-slate-500">Boş rack</p>}
          {selServers.map((v) => (
            <div key={v.id} className="flex justify-between border-t border-line/60 py-1">
              <span className="text-slate-300">{props.cat.SERVERS[v.type].name}</span>
              <span className={!v.ok ? 'text-bad' : v.hot || v.dm ? 'text-warn' : 'text-ok'}>{!v.ok ? 'Arızalı' : v.hot ? 'Isınıyor' : v.dm ? 'Disk' : 'Çalışıyor'}</span>
            </div>
          ))}
          {!selRack && <p className="text-slate-400">{props.cat.INFRA[keyKind(selected)].desc}</p>}
          {edit && (
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setArmed(selected); setSelected(null); }}>Taşı</Button>
              <Button size="sm" variant="danger" onClick={() => { props.onAction({ type: 'unplaceItem', b: b.id, key: selected }); setSelected(null); }}>Envantere al</Button>
            </div>
          )}
        </div>
      )}

      {mode === 'walk' && <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />}
      {edit && (
        <div className="absolute inset-x-3 bottom-14 rounded-xl border border-ok/40 bg-panel/95 p-2 backdrop-blur">
          <div className="mb-2 flex items-center gap-1.5">
            {BAR_TABS.map((bt) => (
              <button key={bt.id} onClick={() => { setBarTab(bt.id); setHint(''); }} className={cn('rounded-lg border px-3 py-1 text-xs', barTab === bt.id ? 'border-ok bg-ok/20 text-white' : 'border-line text-slate-300 hover:text-white')}>{bt.label}</button>
            ))}
            {hint && <span className="ml-2 text-xs text-warn">{hint}</span>}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {barItems.map((it) => (
              <button key={it.id} disabled={it.locked || props.money < it.price} onClick={() => buy(barTab, it.id)}
                className="min-w-[150px] shrink-0 rounded-lg border border-line bg-panel2 p-2 text-left text-xs transition enabled:hover:border-ok disabled:opacity-40">
                <div className="font-medium text-white">{it.name}</div>
                <div className="truncate text-slate-500">{it.locked ? 'Seviye kilidi' : it.sub}</div>
                <div className="num mt-1 text-ok">{it.price.toLocaleString('tr-TR')} ₺</div>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="absolute bottom-3 left-1/2 flex max-w-[96%] -translate-x-1/2 flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl border border-line bg-panel/90 px-3 py-2 text-[11px] text-slate-400 backdrop-blur">
        {mode === 'orbit' ? (
          <>
            <span><kbd className={keyCls}>Sürükle</kbd> döndür</span>
            <span><kbd className={keyCls}>Tekerlek</kbd> yakınlaştır</span>
            <span><kbd className={keyCls}>Q</kbd>/<kbd className={keyCls}>E</kbd> döndür</span>
            <span><kbd className={keyCls}>Z</kbd>/<kbd className={keyCls}>X</kbd> eğ</span>
            <span><kbd className={keyCls}>Tık</kbd> seç</span>
          </>
        ) : (
          <>
            <span><kbd className={keyCls}>W A S D</kbd> yürü</span>
            <span><kbd className={keyCls}>Shift</kbd> koş</span>
            <span><kbd className={keyCls}>Fare</kbd> bak</span>
            <span><kbd className={keyCls}>Tık</kbd> seç</span>
            <span><kbd className={keyCls}>Esc</kbd> fareyi bırak</span>
          </>
        )}
      </div>
    </div>
  );
}
