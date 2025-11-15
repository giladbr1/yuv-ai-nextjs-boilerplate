import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { AccessibilityControls } from "@/components/layout/AccessibilityControls";
import { Toaster } from "sonner";

// Optimize font loading with Next.js font optimization
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-outfit",
});

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
      <body className={`${outfit.variable} outfit-app min-h-screen bg-background antialiased transition-colors`}>
        <AccessibilityProvider>
          {children}
          <Toaster />
        </AccessibilityProvider>
      </body>
    </html>
  );
}
