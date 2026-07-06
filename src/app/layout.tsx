import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

/**
 * Brand font: Manrope — a single variable family used for BOTH headings and body,
 * self-hosted via next/font. Hierarchy comes from weight + size, not a second
 * family. Exposed as the --font-manrope CSS variable and wired to the theme's
 * --font-sans / --font-heading tokens in globals.css.
 */
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Happy Box · Corporate Gifting Portal",
  description: "Curated gift boxes for your team, at scale.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
