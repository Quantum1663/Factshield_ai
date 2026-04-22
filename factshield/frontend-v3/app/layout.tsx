import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { SpatialScene } from "@/components/SpatialScene";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "SAMI - Social Integrity System",
  description: "AI-powered fact-checking and propaganda detection dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn("min-h-screen bg-background text-foreground font-sans antialiased lg:flex")}>
        <SpatialScene />
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 pb-12 pt-20 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-[1440px]">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
