import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://synthplum.vercel.app"),
  applicationName: "Arcture",
  icons: {
    icon: "/applogo.png",
    apple: "/applogo.png",
  },
  title: {
    default: "Arcture",
    template: "%s | Arcture",
  },
  description: "AI workspace for chats and agents.",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Arcture",
    title: "Arcture",
    description: "AI workspace for chats and agents.",
    images: ["/applogo.png"],
  },
  twitter: {
    card: "summary",
    title: "Arcture",
    description: "AI workspace for chats and agents.",
    images: ["/applogo.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full tracking-tight flex flex-col">{children}</body>
    </html>
  );
}
