import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/LegalPage";

export const metadata: Metadata = { title: { absolute: "QuizLive" } };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="September 20, 2026">
      <h2>Using QuizLive</h2>
      <p>QuizLive is a free live quiz platform. Hosts create a room and add questions, and players join with a room code to answer in real time. By using it, you agree to these terms.</p>

      <h2>Your Responsibilities</h2>
      <ul>
        <li>Only share room codes with people you want in your session.</li>
        <li>Do not post questions or team names that are offensive or harmful.</li>
        <li>Do not use tools or scripts to cheat or disrupt a game.</li>
      </ul>

      <h2>No Guarantees</h2>
      <p>QuizLive is provided as is. Sessions may be interrupted if a connection drops, and game progress may be lost. We are not liable for any loss arising from use of the platform.</p>

      <h2>Contact</h2>
      <p>Questions about these terms can be sent to the creator, Owen Paredes.</p>
    </LegalPage>
  );
}
