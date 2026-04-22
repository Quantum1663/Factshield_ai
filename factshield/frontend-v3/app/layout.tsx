import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
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
    <html lang="en" className="dark">
      <body className={cn("min-h-screen bg-background text-foreground font-sans antialiased flex bg-mesh")}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto px-8 py-10 lg:px-16 scrollbar-hide">
          <div className="mx-auto max-w-[1400px]">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
