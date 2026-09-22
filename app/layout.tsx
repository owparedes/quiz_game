import type { Metadata } from "next";
import { Suspense } from "react";
import { NavigationLoader } from "@/components/ui/NavigationLoader";
import "./globals.css";

export const metadata: Metadata = {
  title: { absolute: "QuizLive" },
  description: "Live multiplayer quiz game",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Suspense fallback={null}>
          <NavigationLoader />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
