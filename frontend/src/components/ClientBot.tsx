"use client";

import dynamic from "next/dynamic";

const FloatingBot = dynamic(() => import("@/components/FloatingBot"), {
  ssr: false,
});

export default function ClientBot() {
  return <FloatingBot />;
}
