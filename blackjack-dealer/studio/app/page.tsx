"use client";

// The studio's start (components/start): the entry to the whole project, with the chain and the workshops. An address of
// Scen from before 2026-11-17 still leads to Filmverkstaden's mode Scen (or Råfilm) with the same round and look on screen
// (lib/bordet.ts bordetSceneAddress): /?runda=…&forval=levande&dust=0.8 opens /bordet/?lage=scen&runda=…&forval=levande&dust=0.8,
// /?kant=<edge>&tagning=<take> plays that take there, and &vy=platt is the mode Råfilm. Any other address is the start.
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { Page } from "@/components/shell";
import { StartView } from "@/components/start/StartView";
import { bordetSceneAddress } from "@/lib/bordet";

export default function Start() {
  return (
    <Suspense fallback={<Page title="Start" />}>
      <StartOrScene />
    </Suspense>
  );
}

function StartOrScene() {
  const params = useSearchParams();
  const router = useRouter();
  const to = bordetSceneAddress(params);
  const scene = new URLSearchParams(to.split("?")[1] ?? "").has("lage");
  useEffect(() => {
    if (scene) router.replace(to);
  }, [router, scene, to]);
  return scene ? <Page title="Filmverkstaden" full /> : <StartView />;
}
