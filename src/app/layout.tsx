import type { Metadata } from "next";
import { Fraunces, Montserrat } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

/**
 * Brand fonts. These are free, web-licensed substitutes chosen as the closest
 * matches to The Happy Box's brand fonts, self-hosted via next/font:
 *   - Fraunces   → stand-in for Recoleta (warm premium serif) for HEADINGS.
 *   - Montserrat → stand-in for Glacial Indifference (geometric sans) for BODY.
 * Swap in the licensed originals later by replacing these with next/font/local.
 */
const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const body = Montserrat({
  variable: "--font-body",
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
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
