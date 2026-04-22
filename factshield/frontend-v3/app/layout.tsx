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
    <html lang="en">
      <body className={cn("min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex")}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto px-8 py-8 lg:px-12">
          <div className="mx-auto max-w-[1200px]">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}