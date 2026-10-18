import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { getSiteSettings } from "@/lib/data";
import { getSiteUrl } from "@/lib/site-url";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const settings = await getSiteSettings();

  const title = settings?.site_title || "T V Ajay | Portfolio";
  const description =
    settings?.seo_description ||
    settings?.subtitle ||
    "Computer Science Engineering student who enjoys building practical projects with AI, learning new technologies, and turning ideas into working solutions.";
  const authorName = settings?.name || "T V Ajay";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s | ${authorName}`,
    },
    description,
    authors: [{ name: authorName, url: settings?.github_url || undefined }],
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: title,
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: "/",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} scroll-smooth`}
    >
      <body className="bg-background text-on-surface antialiased selection:bg-surface-tint selection:text-black min-h-screen relative overflow-x-hidden">
        {/* Ambient Top Glow */}
        <div
          aria-hidden="true"
          className="fixed -top-24 left-1/4 w-[600px] h-[600px] rounded-full [background:radial-gradient(circle,rgba(0,217,255,0.04)_0%,transparent_70%)] pointer-events-none -z-10"
        />
        <div
          aria-hidden="true"
          className="fixed top-1/2 -right-32 w-[500px] h-[500px] rounded-full [background:radial-gradient(circle,rgba(175,236,255,0.03)_0%,transparent_70%)] pointer-events-none -z-10"
        />

        {children}
        {process.env.VERCEL === "1" && <Analytics />}
      </body>
    </html>
  );
}
