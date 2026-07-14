import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Manrope, Source_Sans_3 } from "next/font/google";

const display = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const body = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "CV2Jobs AI — Israel Job Radar",
  description: "Live Israeli tech jobs with AI-powered CV matching and recruiter outreach.",
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
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className={body.className}>{children}</body>
    </html>
  );
}
