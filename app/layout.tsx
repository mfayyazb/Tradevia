import type { Metadata } from "next";
import "./globals.css";
import "./research.css";

export const metadata: Metadata = {
  title: "TradeXRL Lab — The Intelligence Marketplace",
  description:
    "Discover, train, backtest and explain reinforcement learning trading agents in a reproducible research workspace.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
