import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prototype App Starter",
  description: "Next.js, Vercel, and Firebase starter for rapid prototyping.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground flex flex-col">
        {children}
      </body>
    </html>
  );
}
