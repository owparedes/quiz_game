"use client";
import { useState, useRef } from "react";
import { Question, AnswerKey, Difficulty } from "@/lib/types";
import { ANSWER_KEYS, DIFFICULTIES, DIFFICULTY_CONFIG, TIME_OPTIONS } from "@/lib/config";
import { EMPTY_QUESTION, isComplete, parseQuestions } from "@/lib/questions";

interface Props {
  questions: Question[];
  onChange: (questions: Question[]) => void;
  timeLimit: number;
  onTimeLimitChange: (seconds: number) => void;
}

const IMPORT_PLACEHOLDER = `[\n  {\n    "text": "Question?",\n    "choices": {"A":"...","B":"...","C":"...","D":"..."},\n    "correctAnswer": "A",\n    "difficulty": "easy"\n  }\n]`;

export function QuestionManager({ questions, onChange, timeLimit, onTimeLimitChange }: Props) {
  const [tab, setTab] = useState<"editor" | "list">("editor");
  const [draft, setDraft] = useState<Question>({ ...EMPTY_QUESTION });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [importDone, setImportDone] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const resetDraft = () => {
    setEditIndex(null);
    setDraft({ ...EMPTY_QUESTION });
  };

  const saveDraft = () => {
    if (!isComplete(draft)) return;
    if (editIndex !== null) onChange(questions.map((question, index) => index === editIndex ? { ...draft } : question));
    else onChange([...questions, { ...draft }]);
    resetDraft();
    setTab("list");
  };

  const editQuestion = (index: number) => {
    setEditIndex(index);
    setDraft({ ...questions[index] });
    setTab("editor");
  };

  const removeQuestion = (index: number) => {
    onChange(questions.filter((_, position) => position !== index));
    if (editIndex === index) resetDraft();
  };

  const readFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = loaded => setImportText((loaded.target?.result as string) || "");
    reader.readAsText(file);
    event.target.value = "";
  };

  const importQuestions = () => {
    setImportError("");
    setImportDone(false);
    try {
      const parsed = parseQuestions(JSON.parse(importText));
      if (!parsed) {
        setImportError("Invalid format. Check your JSON structure.");
        return;
      }
      onChange([...questions, ...parsed]);
      setImportDone(true);
      setImportText("");
      setTimeout(() => {
        setShowImport(false);
        setImportDone(false);
      }, 1200);
    } catch {
      setImportError("Invalid JSON. Make sure it's valid JSON.");
    }
  };

  return (
    <div className="card anim-up" style={{ padding: "clamp(16px,4vw,22px)" }}>
      <div className="tabs" style={{ marginBottom: 18 }}>
        <button className={`tab${tab === "editor" ? " tab-active" : ""}`} onClick={() => setTab("editor")}>
          {editIndex !== null ? `Edit Q${editIndex + 1}` : "+ Add"}
        </button>
        <button className={`tab${tab === "list" ? " tab-active" : ""}`} onClick={() => setTab("list")}>
          Questions ({questions.length})
        </button>
      </div>

      {tab === "editor" && (
        <>
          <label className="label">Question</label>
          <textarea className="inp" rows={3} placeholder="Type your question here…" style={{ marginBottom: 14 }}
            value={draft.text} onChange={event => setDraft({ ...draft, text: event.target.value })} />

          <label className="label">Difficulty & Points</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {DIFFICULTIES.map(level => {
              const config = DIFFICULTY_CONFIG[level];
              const active = (draft.difficulty || "easy") === level;
              return (
                <button key={level} className="option" onClick={() => setDraft({ ...draft, difficulty: level })}
                  style={active ? { borderColor: config.color, background: config.bg, color: config.color } : undefined}>
                  <div>{config.label}</div>
                  <div style={{ fontSize: "0.68rem", marginTop: 2, opacity: 0.75 }}>{config.points} pt{config.points > 1 ? "s" : ""}</div>
                </button>
              );
            })}
          </div>

          <label className="label">Answer Choices</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
            {ANSWER_KEYS.map(key => <ChoiceRow key={key} answerKey={key} draft={draft} onChange={setDraft} />)}
          </div>

          <div style={{ display: "flex", gap: 7 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveDraft} disabled={!isComplete(draft)}>
              {editIndex !== null ? "Save Changes" : "+ Add Question"}
            </button>
            {editIndex !== null && <button className="btn btn-ghost" onClick={resetDraft}>Cancel</button>}
          </div>
        </>
      )}

      {tab === "list" && (
        questions.length === 0 ? (
          <div className="muted" style={{ textAlign: "center", padding: "28px 0" }}>
            <p style={{ fontSize: "0.86rem" }}>No questions yet</p>
            <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => setTab("editor")}>Add first question</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 320, overflowY: "auto" }}>
            {questions.map((question, index) => {
              const config = DIFFICULTY_CONFIG[question.difficulty || "easy"];
              return (
                <div key={index} className="list-row" style={{ gap: 8 }}>
                  <span className="mono muted" style={{ fontSize: "0.66rem", minWidth: 20 }}>{String(index + 1).padStart(2, "0")}</span>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: config.color, flexShrink: 0 }} />
                  <span className="truncate" style={{ fontSize: "0.82rem", flex: 1 }}>{question.text}</span>
                  <span style={{ fontSize: "0.64rem", fontWeight: 600, color: config.color }}>{config.points}pt</span>
                  <button className="icon-btn" onClick={() => editQuestion(index)}>✏️</button>
                  <button className="icon-btn" style={{ color: "var(--danger)" }} onClick={() => removeQuestion(index)}>✕</button>
                </div>
              );
            })}
          </div>
        )
      )}

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showImport ? 12 : 0 }}>
          <span className="label" style={{ marginBottom: 0 }}>Import JSON</span>
          <button className="btn btn-ghost btn-icon" onClick={() => { setShowImport(!showImport); setImportError(""); setImportDone(false); }}>
            {showImport ? "✕" : "↓"}
          </button>
        </div>
        {showImport && (
          <div className="anim-up">
            <p className="muted" style={{ fontSize: "0.76rem", marginBottom: 8 }}>
              Paste JSON or upload a file. Format: array of {`{text, choices:{A,B,C,D}, correctAnswer, difficulty}`}
            </p>
            <textarea className="inp mono" rows={4} placeholder={IMPORT_PLACEHOLDER} value={importText}
              onChange={event => { setImportText(event.target.value); setImportError(""); }}
              style={{ marginBottom: 8, fontSize: "0.76rem" }} />
            <div style={{ display: "flex", gap: 7 }}>
              <button className="btn btn-ghost" onClick={() => fileInput.current?.click()}>📂 File</button>
              <input ref={fileInput} type="file" accept=".json" style={{ display: "none" }} onChange={readFile} />
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={!importText.trim()} onClick={importQuestions}>
                {importDone ? "✓ Imported!" : "Import Questions"}
              </button>
            </div>
            {importError && <p style={{ fontSize: "0.76rem", color: "var(--danger)", marginTop: 6 }}>⚠ {importError}</p>}
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        <label className="label">Time per question</label>
        <div style={{ display: "flex", gap: 5 }}>
          {TIME_OPTIONS.map(seconds => (
            <button key={seconds} className={`option mono${timeLimit === seconds ? " option-active" : ""}`} onClick={() => onTimeLimitChange(seconds)}>
              {seconds}s
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChoiceRow({ answerKey, draft, onChange }: { answerKey: AnswerKey; draft: Question; onChange: (draft: Question) => void }) {
  const selected = draft.correctAnswer === answerKey;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button className="mono" onClick={() => onChange({ ...draft, correctAnswer: answerKey })} title="Mark as correct answer"
        style={{
          width: 30, height: 30, minWidth: 30, borderRadius: "50%", cursor: "pointer", fontWeight: 700, fontSize: "0.72rem", transition: "all 0.15s",
          border: `2px solid ${selected ? "var(--accent)" : "var(--border-hi)"}`,
          background: selected ? "var(--accent-lo)" : "transparent",
          color: selected ? "var(--accent)" : "var(--text-3)",
        }}>
        {answerKey}
      </button>
      <input className="inp" style={{ padding: "8px 12px", fontSize: "0.85rem" }} placeholder={`Choice ${answerKey}`}
        value={draft.choices[answerKey]} onChange={event => onChange({ ...draft, choices: { ...draft.choices, [answerKey]: event.target.value } })} />
    </div>
  );
}
