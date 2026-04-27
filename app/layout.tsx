import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuizLive — Real-time Multiplayer Quiz",
  description: "Compete with your team in real-time quiz battles",
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
