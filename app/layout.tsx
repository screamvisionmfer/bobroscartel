import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bobroscartel.com";
const previewImage = "/assets/social-preview.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "BOBROS - Billionaire Bobo Club",
  description: "Future billionaires only. A hand-drawn BOBROS NFT landing page.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    title: "BOBROS - Billionaire Bobo Club",
    description: "1,337 BOBROS living the unemployed dream.",
    url: "/",
    siteName: "BOBROS Cartel",
    type: "website",
    images: [
      {
        url: previewImage,
        width: 1200,
        height: 630,
        alt: "BOBROS Cartel social preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BOBROS - Billionaire Bobo Club",
    description: "1,337 BOBROS living the unemployed dream.",
    images: [previewImage],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://storage.googleapis.com/scriptslmt/0.1.3/solana.css" />
        <script
          id="launchmynft-config"
          dangerouslySetInnerHTML={{
            __html: `
window.ownerId = "2Fbg8k4Cz1vfTCSBVKG15sFzRh6yLroJuH3zpM4FqLPo";
window.collectionId = "eLeLQQfwJKOCtALMbmHS";
            `,
          }}
        />
      </head>
      <body>
        <Script
          id="launchmynft-solana"
          type="module"
          src="https://storage.googleapis.com/scriptslmt/0.1.3/solana.js"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}
