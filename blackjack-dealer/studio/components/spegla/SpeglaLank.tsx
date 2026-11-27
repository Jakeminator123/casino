"use client";

// The link to Spegla from Mått and Dockan: a quiet button in the header, carrying the doll and the seat the address names
// (/studio/dockan/?docka=frasse&plats=4 leads to Frasse's give to seat 4 in Spegla). Inside Suspense: it reads the address.
import { SquareSplitHorizontal } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buttonClasses } from "../ui";

export function SpeglaLank() {
  const params = useSearchParams();
  const out = new URLSearchParams();
  for (const key of ["docka", "plats"]) { const v = params.get(key); if (v && /^[a-z0-9]+$/.test(v)) out.set(key, v); }
  return (
    <Link href={`/spegla/${out.size ? `?${out}` : ""}`} className={buttonClasses({ variant: "quiet", size: "sm" })} title="Vår vy på Youtubefilmen">
      <SquareSplitHorizontal className="size-3.5" />
      Spegla
    </Link>
  );
}
