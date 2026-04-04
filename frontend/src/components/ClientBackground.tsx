"use client";

import dynamic from "next/dynamic";

const AnimatedBackground = dynamic(
  () => import("@/components/AnimatedBackground"),
  { ssr: false }
);

export default function ClientBackground() {
  return <AnimatedBackground />;
}
