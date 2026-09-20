import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { absolute: "QuizLive" },
  description: "Live multiplayer quiz game",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
