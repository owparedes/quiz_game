import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/LegalPage";

export const metadata: Metadata = { title: "Terms of Service" };

const sections = [
  {
    id: "acceptance",
    heading: "Acceptance of these Terms",
    body: (
      <>
        <p>By opening, hosting, or joining a game on QuizLive, you agree to be bound by these Terms of Service and by the Privacy Policy. If you do not agree, do not use the service.</p>
        <p>If you use QuizLive on behalf of a school, organization, or other group, you confirm that you are allowed to accept these Terms for that group.</p>
      </>
    ),
  },
  {
    id: "service",
    heading: "The service",
    body: (
      <>
        <p>QuizLive is a free, browser based live quiz game. A host opens a room, writes or edits the questions, and runs the game. Players join the same room with its room code, answer each question in real time, and are scored by speed and difficulty.</p>
        <p>Game events such as questions, answers, and scores are delivered between the host and players through Pusher, a third party real time messaging service. QuizLive does not run a database and does not keep a copy of games on its own servers.</p>
        <p>The service is provided free of charge. Features may be added, changed, or removed at any time without notice.</p>
      </>
    ),
  },
  {
    id: "eligibility",
    heading: "Eligibility and accounts",
    body: (
      <>
        <p>QuizLive has no accounts, sign ups, or passwords. Anyone with the link can host a room, and anyone with a room code can join it as a team.</p>
        <p>If you are under the age of majority where you live, use QuizLive only with the permission and supervision of a parent, guardian, or teacher. Hosts who run games for minors, such as in a classroom, are responsible for supervising that use.</p>
        <p>Because there are no accounts, the room code is the only thing that controls who can join a room. Share it only with the people you want in your game.</p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    heading: "Acceptable use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>Use team names or questions that are offensive, hateful, harassing, sexually explicit, or that reveal personal information about another person.</li>
          <li>Join or interfere with rooms you were not invited to, or guess room codes to disrupt other games.</li>
          <li>Use bots, scripts, or other automated tools to answer questions, flood a room, or gain an unfair advantage.</li>
          <li>Send excessive requests to the service, attempt to bypass its limits, or interfere with its operation or the messaging service it relies on.</li>
          <li>Use QuizLive for any unlawful purpose or in violation of any applicable law.</li>
        </ul>
      </>
    ),
  },
  {
    id: "content",
    heading: "Content and intellectual property",
    body: (
      <>
        <p>The QuizLive name, design, and source code belong to its owner and are protected by applicable intellectual property laws. These Terms do not give you any right to use them except to use the service as intended.</p>
        <p>You keep any rights you have in the questions and team names you enter. By entering them, you allow QuizLive to transmit and display them to the host and players in the same room for the purpose of running the game. You are responsible for making sure you have the right to use any content you enter.</p>
        <p>Hosts can also import questions from a file or pasted text. Importing content does not change who owns it, and the same responsibility applies.</p>
      </>
    ),
  },
  {
    id: "saved-content",
    heading: "Your saved content",
    body: (
      <>
        <p>To let a host recover a game after a page refresh, the host&apos;s browser saves the current room setup in local storage on that device. This includes the questions, time limit, team names, scores, and game progress. It is not uploaded to or backed up by QuizLive.</p>
        <p>Saved rooms expire after four hours and are cleared when a new game starts. They may also be lost if you clear your browser data, use a private window, or switch devices. QuizLive is not responsible for recovering questions or scores that are lost this way, so keep your own copy of any questions you want to reuse.</p>
      </>
    ),
  },
  {
    id: "third-party",
    heading: "Third party links and services",
    body: (
      <>
        <p>QuizLive relies on third party services, including Pusher for real time messaging and a hosting provider to serve the site. Your use of QuizLive is also subject to how those services operate, and QuizLive does not control their availability or practices.</p>
        <p>Content entered by hosts may contain links to other websites. QuizLive does not endorse and is not responsible for any third party website or its content.</p>
      </>
    ),
  },
  {
    id: "warranties",
    heading: "Disclaimer of warranties",
    body: (
      <p>QuizLive is provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind, whether express or implied, including any implied warranties of merchantability, fitness for a particular purpose, and non infringement. There is no guarantee that the service will be uninterrupted, timely, secure, or error free, that messages will be delivered, or that scores will be accurate if a connection drops during a game.</p>
    ),
  },
  {
    id: "liability",
    heading: "Limitation of liability",
    body: (
      <>
        <p>To the fullest extent permitted by law, the owner of QuizLive will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of data, content, or game progress, arising from or related to your use of, or inability to use, the service.</p>
        <p>Because QuizLive is provided free of charge, the owner&apos;s total liability for any claim relating to the service will not exceed zero, except where such a limit is not allowed by law.</p>
      </>
    ),
  },
  {
    id: "termination",
    heading: "Termination",
    body: (
      <>
        <p>You may stop using QuizLive at any time. To remove the room data saved on your device, start a new game or clear your browser&apos;s site data.</p>
        <p>Access to the service may be limited, suspended, or blocked for anyone who violates these Terms or misuses the service, and the service itself may be discontinued at any time. The sections on content, disclaimers, limitation of liability, and governing law continue to apply after your use ends.</p>
      </>
    ),
  },
  {
    id: "changes",
    heading: "Changes to these Terms",
    body: (
      <p>These Terms may be updated from time to time. When they change, the &quot;Last updated&quot; date at the top of this page will be revised. Continuing to use QuizLive after an update means you accept the revised Terms.</p>
    ),
  },
  {
    id: "governing-law",
    heading: "Governing law",
    body: (
      <p>These Terms are governed by the laws of the Republic of the Philippines, without regard to its conflict of law rules. Any dispute arising from these Terms or your use of QuizLive will be brought before the proper courts of the Philippines.</p>
    ),
  },
  {
    id: "contact",
    heading: "Contact",
    body: (
      <p>QuizLive is created and maintained by <strong>Owen Paredes</strong>. Questions about these Terms can be directed to the owner.</p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      summary="The rules for hosting and playing live quizzes on QuizLive."
      effective="September 20, 2026"
      updated="September 23, 2026"
      intro={<p>These Terms of Service govern your use of QuizLive, including the website and every game hosted or played on it. Please read them carefully.</p>}
      sections={sections}
    />
  );
}
