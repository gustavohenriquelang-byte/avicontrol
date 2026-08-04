import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: {
    default: "Avicontrol",
    template: "%s · Avicontrol",
  },
  description: "Gestão de granjas de galinhas poedeiras e produção de ovos.",
  manifest: "/manifest.webmanifest",
  applicationName: "Avicontrol",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Avicontrol",
  },
};

export const viewport: Viewport = {
  themeColor: "#1F6F54",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh bg-surface text-ink antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
