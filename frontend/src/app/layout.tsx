import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import ClientBot from "@/components/ClientBot";

export const metadata: Metadata = {
  title: "FLUXMINT AI - Trading Platform",
  description: "Autonomous AI trading platform with multi-LLM support, PumpFun integration, and real-time Solana analytics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface-950">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
        <ClientBot />
      </body>
    </html>
  );
}
