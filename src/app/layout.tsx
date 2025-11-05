import type { Metadata } from "next";
import "./globals.css";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { AccessibilityControls } from "@/components/layout/AccessibilityControls";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Bria Agentic Generation Interface",
  description: "AI-powered creative generation with conversational control",
  authors: [{ name: "Yuval Avidani", url: "https://linktr.ee/yuvai" }],
  keywords: ["AI", "Image Generation", "Video Generation", "Bria", "Gemini", "YUV.AI"],
  creator: "YUV.AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap" rel="stylesheet" />
      </head>
      <body className="outfit-app min-h-screen bg-background antialiased transition-colors">
        <AccessibilityProvider>
          {children}
          <AccessibilityControls />
          <Toaster />
        </AccessibilityProvider>
      </body>
    </html>
  );
}
