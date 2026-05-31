import type { Metadata, Viewport } from "next";
import { PwaSetup } from "./pwa";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lock In",
  description: "Track focused study and work sessions.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lock In",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f5f2ea",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PwaSetup />
        {children}
      </body>
    </html>
  );
}
