import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import ClientBot from "@/components/ClientBot";
import ClientBackground from "@/components/ClientBackground";

export const metadata: Metadata = {
  title: "FLUXMINT AI - Trading Platform",
  description: "Autonomous AI trading platform with PumpFun sniper, whale watcher, momentum trader and 10+ trading skills. Real-time Solana analytics powered by DeepSeek v3.2.",
  openGraph: {
    title: "FLUXMINT AI Trading Platform",
    description: "AI-powered Solana trading with PumpFun integration, real-time signals, and autonomous agents. Built by KaiNova.",
    url: "https://ai-agent-platform-six.vercel.app",
    siteName: "FLUXMINT AI",
    images: [
      {
        url: "https://ai-agent-platform-six.vercel.app/api/og",
        width: 1200,
        height: 630,
        alt: "FLUXMINT AI Trading Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FLUXMINT AI Trading Platform",
    description: "AI-powered Solana trading with PumpFun integration, real-time signals, and autonomous agents.",
    creator: "@KaiNovasWarm",
    images: ["https://ai-agent-platform-six.vercel.app/api/og"],
  },
  metadataBase: new URL("https://ai-agent-platform-six.vercel.app"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface-950">
        <ClientBackground />
        <div className="flex h-screen overflow-hidden relative z-10">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
        <ClientBot />
      </body>
    </html>
  );
}
