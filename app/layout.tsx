import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "CV2Jobs AI — Israel Job Radar",
  description: "Live Israeli tech jobs with AI-powered CV matching.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Record<string, string | string[]>>;
}) {
  await params;

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
