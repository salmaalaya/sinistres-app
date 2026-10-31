import { useEffect, useRef, useState, type FormEvent } from 'react';
import Layout from '../components/Layout';
import AnimatedNumber from '../components/AnimatedNumber';
import useReducedMotion from '../hooks/useReducedMotion';
import { askAssistant, type AssistantQueryResponse } from '../services/assistantService';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  response?: AssistantQueryResponse;
}

let nextMessageId = 1;

const WORDS_PER_TICK = 3;
const TICK_MS = 70;

function AnswerText({ text }: { text: string }) {
  const reducedMotion = useReducedMotion();
  const words = text.split(' ');
  const [revealed, setRevealed] = useState(reducedMotion ? words.length : 0);

  useEffect(() => {
    if (reducedMotion) {
      setRevealed(words.length);
      return;
    }
    const interval = setInterval(() => {
      setRevealed((r) => Math.min(r + WORDS_PER_TICK, words.length));
    }, TICK_MS);
    return () => clearInterval(interval);
    // Ne doit s'executer qu'une fois au montage de cette bulle (voir key={msg.id}
    // sur AssistantBubble : chaque bulle ne se monte qu'une fois par message).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = revealed >= words.length;

  return (
    <p className="text-[13.5px] text-text-primary font-sans leading-relaxed">
      {words.slice(0, revealed).join(' ')}
      {!done && <span className="reveal-cursor" aria-hidden="true" />}
    </p>
  );
}

const SUGGESTIONS = [
  'Combien de dossiers sont ouverts depuis plus de 60 jours ?',
  'Quels sont les dossiers Express non clotures ?',
  'Combien de dossiers ont ete regles ce mois-ci ?',
  'Quels sont les 5 dossiers avec le delai de cloture le plus long ?',
];

function formatCell(v: string | number | null): string {
  if (v === null) return '-';
  return String(v);
}

function AssistantBubble({ msg }: { msg: ChatMessage }) {
  const [sqlOpen, setSqlOpen] = useState(false);
  const r = msg.response;

  return (
    <div className="flex items-start gap-2.5 message-in">
      <span
        className="w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: '#16211B', border: '1px solid rgba(141,198,63,0.3)' }}
      >
        <span className="w-2 h-2 rounded-[2px]" style={{ background: '#3E8A4C' }} />
      </span>
      <div className="max-w-[560px]">
        <div className="text-[10px] uppercase tracking-wide text-text-faint font-semibold mb-1.5">Assistant</div>
        <div className="bg-panel border border-hairline rounded-card rounded-tl-none px-4 py-3">
          <AnswerText text={msg.text} />

          {r && r.resultType === 'scalar' && r.result.value !== null && r.result.value !== undefined && (
            <div className="mt-3 pt-3 border-t border-hairline">
              <div className="font-serif text-[26px] font-semibold text-brand-bright leading-none">
                {typeof r.result.value === 'number' ? (
                  <AnimatedNumber
                    value={r.result.value}
                    format={(n) => n.toLocaleString('fr-TN', { maximumFractionDigits: 3 })}
                  />
                ) : (
                  r.result.value
                )}
              </div>
              <div className="text-[11px] text-text-faint mt-1 font-sans">{r.result.label}</div>
            </div>
          )}

          {r && r.resultType === 'table' && r.result.columns && r.result.rows && (
            <div className="mt-3 pt-3 border-t border-hairline overflow-x-auto">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="border-b border-hairline">
                    {r.result.columns.map((c) => (
                      <th key={c} className="text-left px-2 py-1.5 text-[9.5px] uppercase tracking-wide text-text-faint font-semibold">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.result.rows.map((row, i) => (
                    <tr key={i} className="border-b border-hairline last:border-0">
                      {row.map((cell, j) => (
                        <td key={j} className="px-2 py-1.5 font-mono text-text-primary">
                          {formatCell(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {r && r.sql && (
            <div className="mt-3">
              <button
                onClick={() => setSqlOpen((o) => !o)}
                className="text-[11px] text-text-muted hover:text-brand-bright font-sans transition-colors"
              >
                {sqlOpen ? 'Masquer' : 'Afficher'} la requete SQL{' '}
                <span
                  className="inline-block transition-transform duration-300"
                  style={{ transform: sqlOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  ▾
                </span>
              </button>
              <div className={`sql-collapse ${sqlOpen ? 'sql-collapse-open' : ''}`}>
                <pre
                  className="mt-2 p-3 rounded-control text-[11.5px] font-mono overflow-x-auto"
                  style={{ background: '#16211B', color: '#8DC63F' }}
                >
                  {r.sql}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async (question: string) => {
    if (!question.trim() || sending) return;
    setMessages((m) => [...m, { id: nextMessageId++, role: 'user', text: question }]);
    setInput('');
    setSending(true);
    try {
      const res = await askAssistant(question, conversationId);
      setConversationId(res.conversationId);
      setMessages((m) => [...m, { id: nextMessageId++, role: 'assistant', text: res.answer, response: res }]);
    } catch {
      setMessages((m) => [
        ...m,
        { id: nextMessageId++, role: 'assistant', text: 'Une erreur est survenue, reessayez.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <Layout>
      <div className="max-w-content mx-auto px-9 py-7 flex flex-col" style={{ height: 'calc(100vh - 0px)' }}>
        <div className="mb-5 flex items-center gap-2.5">
          <div>
            <h2 className="font-serif text-[25px] font-semibold text-text-primary tracking-tight">Assistant IA</h2>
            <p className="text-text-muted text-[13px] mt-1 font-sans">
              Posez une question en langage naturel sur le portefeuille sinistres.
            </p>
          </div>
          <span
            className="status-led w-2 h-2 rounded-full shrink-0 mt-1"
            style={{ background: '#8DC63F', color: '#8DC63F' }}
            title="Assistant actif"
            aria-hidden="true"
          />
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4" style={{ maxHeight: '55vh' }}>
          {messages.length === 0 && (
            <p className="text-text-faint text-[13px] font-sans">
              Aucun message pour l&apos;instant — essayez une des suggestions ci-dessous.
            </p>
          )}
          {messages.map((msg) =>
            msg.role === 'user' ? (
              <div key={msg.id} className="flex justify-end message-in">
                <div
                  className="max-w-[480px] px-4 py-2.5 rounded-card rounded-br-none text-[13.5px] text-text-primary font-sans"
                  style={{ background: 'rgba(141,198,63,0.12)', border: '1px solid rgba(141,198,63,0.16)' }}
                >
                  {msg.text}
                </div>
              </div>
            ) : (
              <AssistantBubble key={msg.id} msg={msg} />
            )
          )}
          {sending && (
            <div className="flex items-start gap-2.5 message-in">
              <span
                className="w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: '#16211B', border: '1px solid rgba(141,198,63,0.3)' }}
              >
                <span className="w-2 h-2 rounded-[2px]" style={{ background: '#3E8A4C' }} />
              </span>
              <div
                className="bg-panel border border-hairline rounded-card rounded-tl-none px-4 py-3.5 flex items-center gap-1.5"
                aria-label="L'assistant reflechit"
              >
                <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: '#8DC63F' }} />
                <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: '#8DC63F' }} />
                <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: '#8DC63F' }} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto pt-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={sending}
                className="text-[11.5px] text-text-muted hover:text-brand-bright border border-hairline rounded-full px-3 py-1.5 transition-colors font-sans disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question..."
              className="input flex-1"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="text-canvas-deep text-sm font-bold px-5 py-2.5 rounded-control transition-all hover:brightness-105 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #8DC63F, #3E8A4C)', boxShadow: '0 8px 20px rgba(141,198,63,0.22)' }}
            >
              Envoyer
            </button>
          </form>
          <p className="text-[11px] text-text-faint mt-2.5 font-sans">
            Lecture seule : l&apos;assistant ne peut consulter que les donnees sinistres/reglements, jamais les modifier.
          </p>
        </div>
      </div>
    </Layout>
  );
}
