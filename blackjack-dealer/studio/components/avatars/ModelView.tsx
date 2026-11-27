"use client";

// <ModelView src="/dealer3d/figur/stol.glb" />: one finished model in 3D, to turn with the mouse (drag turns, the wheel
// comes nearer). three.js and its loader are the lab server's one copy (/vendor/, the layout's import map), read when
// the view opens, as the 3D scene's modules are. A model that is not built on this computer says so.
import { useEffect, useRef, useState } from "react";
import { Spinner } from "../ui";

/* eslint-disable @typescript-eslint/no-explicit-any -- three.js is read at run time from the lab server */
const load = (path: string): Promise<any> => import(/* webpackIgnore: true */ /* turbopackIgnore: true */ path);

export function ModelView({ src, className }: { src: string; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let stopped = false, frame = 0;
    let dispose = () => {};
    setState("loading");
    (async () => {
      const [THREE, { GLTFLoader }, { OrbitControls }, { RoomEnvironment }] = await Promise.all([
        load("/vendor/three.module.js"), load("/vendor/loaders/GLTFLoader.js"), load("/vendor/controls/OrbitControls.js"), load("/vendor/environments/RoomEnvironment.js"),
      ]);
      if (stopped) return;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      el.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";
      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 200);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      const size = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); renderer.domElement.style.width = `${w}px`; renderer.domElement.style.height = `${h}px`; camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); };
      size();
      const observer = new ResizeObserver(size);
      observer.observe(el);
      const loop = () => { frame = requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); };
      dispose = () => { cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); pmrem.dispose(); renderer.dispose(); renderer.domElement.remove(); };
      try {
        const gltf = await new GLTFLoader().loadAsync(src);
        if (stopped) return;
        const model = gltf.scene;
        scene.add(model);
        const box = new THREE.Box3().setFromObject(model), centre = box.getCenter(new THREE.Vector3()), extent = box.getSize(new THREE.Vector3()).length() || 1;
        controls.target.copy(centre);
        camera.position.set(centre.x + extent * 0.6, centre.y + extent * 0.35, centre.z + extent * 0.9);
        camera.near = extent / 200; camera.far = extent * 20; camera.updateProjectionMatrix();
        setState("ready");
        loop();
      } catch {
        if (!stopped) setState("missing");
      }
    })().catch(() => { if (!stopped) setState("missing"); });
    return () => { stopped = true; dispose(); };
  }, [src]);
  return (
    <div className={className} style={{ position: "relative" }}>
      <div ref={host} className="absolute inset-0" />
      {state !== "ready" ? (
        <div className="absolute inset-0 grid place-items-center text-sm text-dim">
          {state === "loading" ? <span className="flex items-center gap-2"><Spinner size="sm" />Läser modellen …</span> : "Modellen finns inte på den här datorn."}
        </div>
      ) : null}
    </div>
  );
}
