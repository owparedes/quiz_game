import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy" };

const sections = [
  {
    id: "scope",
    heading: "Scope of this policy",
    body: (
      <p>This Privacy Policy explains what information QuizLive handles, how it is used, and the choices you have. It applies to the QuizLive website and to every game hosted or played on it. It does not apply to third party services or websites that QuizLive links to or relies on, which have their own policies.</p>
    ),
  },
  {
    id: "collect",
    heading: "Information we collect",
    body: (
      <>
        <p>QuizLive has no accounts and does not ask for your name, email address, phone number, or any other contact details. The only information handled is what you enter to run a game:</p>
        <ul>
          <li><strong>Room code</strong> chosen or entered by the host and players.</li>
          <li><strong>Team names</strong> entered by players when they join.</li>
          <li><strong>Questions and answer choices</strong> written or imported by the host.</li>
          <li><strong>Answers and scores</strong>, including which choice each team picked and how quickly.</li>
        </ul>
        <p>Please do not put personal or sensitive information in team names or questions. Anything you enter is shown to everyone in the same room.</p>
        <p>Like any website, the servers that host QuizLive and the Pusher messaging service may receive technical information such as your IP address, browser type, and request times as part of delivering the site. QuizLive does not use this information to identify you.</p>
      </>
    ),
  },
  {
    id: "device",
    heading: "Information stored on your device",
    body: (
      <>
        <p>On the host&apos;s device only, QuizLive saves the current room in the browser&apos;s local storage so the game can be resumed after a refresh. This saved room contains the questions, time limit, team names, scores, current phase, and question number.</p>
        <p>This data stays in that browser. It expires after four hours, is cleared when the host starts a new game, and can be removed at any time by clearing the site data in your browser. Players&apos; devices do not store any game data.</p>
      </>
    ),
  },
  {
    id: "use",
    heading: "How we use information",
    body: (
      <>
        <p>The information described above is used only to run the game you are in:</p>
        <ul>
          <li>To deliver questions from the host to the players in the room.</li>
          <li>To send each team&apos;s answer back to the host and calculate scores.</li>
          <li>To show results and leaderboards to everyone in the room.</li>
          <li>To let the host resume a game after a page refresh.</li>
        </ul>
        <p>QuizLive does not use your information for advertising, profiling, or marketing, and does not sell it.</p>
      </>
    ),
  },
  {
    id: "cookies",
    heading: "Cookies and similar technologies",
    body: (
      <p>QuizLive does not set cookies and does not use analytics, advertising, or tracking tools. The only browser storage it uses is the local storage described in the section on information stored on your device. Third party services such as the hosting provider or Pusher may use technologies needed to keep their connections working.</p>
    ),
  },
  {
    id: "sharing",
    heading: "Sharing and disclosure",
    body: (
      <>
        <p>Game information is shared with:</p>
        <ul>
          <li><strong>The host and players in the same room</strong>, who can see team names, questions, answers, and scores as the game runs.</li>
          <li><strong>Pusher</strong>, the real time messaging service that relays game events between devices while a game is live.</li>
          <li><strong>The hosting provider</strong> that serves the website and processes requests to it.</li>
        </ul>
        <p>Room channels are identified by the room code, so anyone who knows the code could see the events for that room. QuizLive may also disclose information if required by law or to protect the rights and safety of its users.</p>
      </>
    ),
  },
  {
    id: "retention",
    heading: "Data retention",
    body: (
      <p>QuizLive does not keep game data on its own servers. Game events pass through Pusher only for as long as it takes to deliver them. The room saved in the host&apos;s browser is kept for up to four hours or until a new game starts, whichever comes first. Technical logs kept by the hosting provider or Pusher are retained according to their own policies.</p>
    ),
  },
  {
    id: "security",
    heading: "Security",
    body: (
      <p>Connections to QuizLive and to Pusher are encrypted in transit using TLS. However, rooms are protected only by their room code, and no method of transmission or storage is completely secure. Use codes that are hard to guess, share them only with your players, and avoid entering anything you would not want others in the room to see.</p>
    ),
  },
  {
    id: "children",
    heading: "Children's privacy",
    body: (
      <p>QuizLive does not knowingly collect personal information from children and does not ask anyone for identifying details. When QuizLive is used with children, such as in a classroom, the teacher or supervising adult should make sure team names do not include students&apos; full names or other personal information.</p>
    ),
  },
  {
    id: "rights",
    heading: "Your rights and choices",
    body: (
      <>
        <p>Because QuizLive has no accounts and keeps no server side records, there is no profile to access, correct, or delete. You remain in control of the information on your device:</p>
        <ul>
          <li>You choose what team names and questions to enter.</li>
          <li>You can remove a saved room by starting a new game or clearing the site data in your browser.</li>
          <li>You can stop using QuizLive at any time.</li>
        </ul>
        <p>Depending on where you live, you may have additional rights under data protection laws, such as the Data Privacy Act of 2012 in the Philippines. You can contact the owner to ask about them.</p>
      </>
    ),
  },
  {
    id: "international",
    heading: "International users",
    body: (
      <p>QuizLive is operated from the Philippines. Pusher and the hosting provider may process data in other countries depending on their configuration. By using QuizLive, you understand that game information may be transferred to and processed in countries other than your own.</p>
    ),
  },
  {
    id: "changes",
    heading: "Changes to this policy",
    body: (
      <p>This Privacy Policy may be updated from time to time. When it changes, the &quot;Last updated&quot; date at the top of this page will be revised. Continuing to use QuizLive after an update means you accept the revised policy.</p>
    ),
  },
  {
    id: "contact",
    heading: "Contact",
    body: (
      <p>QuizLive is created and maintained by <strong>Owen Paredes</strong>. Questions about this policy or how your information is handled can be directed to the owner.</p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary="QuizLive has no accounts and keeps no game data on its servers. This page explains exactly what is handled and where."
      effective="September 20, 2026"
      updated="September 23, 2026"
      intro={<p>Your privacy matters. This policy describes how QuizLive handles the small amount of information needed to run a live quiz.</p>}
      sections={sections}
    />
  );
}
