import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CV2Jobs AI — Israel Job Radar",
  description: "Live Israeli tech jobs with AI-powered CV matching.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
