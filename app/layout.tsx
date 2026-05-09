import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "unknown.chat",
  description: "Talk to someone unknown.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
