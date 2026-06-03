import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Study Agent (Claude)",
  description: "Socratic study agent for your Obsidian vault",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
