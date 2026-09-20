import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/LegalPage";

export const metadata: Metadata = { title: { absolute: "QuizLive" } };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="September 20, 2026">
      <h2>What We Collect</h2>
      <p>QuizLive has no accounts. The only data used is what is needed to run a game: the room code, team names, quiz questions, answers, and scores. Please avoid putting personal details in team names or questions.</p>

      <h2>How It Is Used</h2>
      <p>This data is only sent to the host and players in the same room so the game can run. It passes through a real time messaging service while the game is live and is not stored on a server afterward.</p>

      <h2>Local Storage</h2>
      <p>The host browser keeps the current room setup so a session can be resumed after a refresh. It expires after four hours and is cleared when a new game starts.</p>

      <h2>Cookies</h2>
      <p>QuizLive does not use ads, analytics, or tracking cookies.</p>

      <h2>Contact</h2>
      <p>Questions about this policy can be sent to the creator, Owen Paredes.</p>
    </LegalPage>
  );
}
