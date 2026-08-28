import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Familien-Chat",
  description:
    "Familien-Chat – chatte, teile Fotos und bleib mit deiner Familie in Verbindung.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}
    >
      <body
        className="min-h-full"
        style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", background: "#12162B", margin: 0, padding: 0 }}
      >
        {children}
      </body>
    </html>
  );
}
