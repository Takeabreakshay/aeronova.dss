import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Message01Icon,
  SentIcon,
  Loading03Icon,
  UserCircleIcon,
  RobotIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, type Params } from "@/lib/api";

type Msg = { role: "user" | "assistant"; content: string };

const PROMPTS = [
  "what if fuel jumps 18% and R3 demand drops 10%",
  "kill C1",
  "switch to service strategy",
  "what does the reserve give me",
];

export function AskTab({ params, setParams }: { params: Params; setParams: (p: Params) => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  async function send(q?: string) {
    const query = (q ?? text).trim();
    if (!query || busy) return;
    setMessages((m) => [...m, { role: "user", content: query }]);
    setText("");
    setBusy(true);
    try {
      const r = await api.chat(params, query);
      setMessages((m) => [...m, { role: "assistant", content: r.reply }]);
      if (r.params) setParams(r.params);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: `_(error: ${e.message})_` }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="mb-2 flex items-center gap-2.5 animate-rise">
        <span className="text-pink">
          <HugeiconsIcon icon={Message01Icon} size={20} strokeWidth={1.6} />
        </span>
        <span className="text-lg font-semibold tracking-tight">Ask the DSS</span>
        <span className="text-[13px] text-muted-foreground">Natural language in, engine numbers out. AI never computes.</span>
      </div>

      {/* Prompt starters when empty */}
      {messages.length === 0 && (
        <Card className="p-5 animate-rise" style={{ animationDelay: "40ms" }}>
          <div className="mb-3 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[hsl(258_92%_76%)]">
            <HugeiconsIcon icon={SparklesIcon} size={12} strokeWidth={1.6} />
            Try a starter
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PROMPTS.map((p, i) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="rounded-full border border-border bg-secondary px-3 py-1.5 font-mono text-[11px] text-muted-foreground transition-[transform,border-color,color,background-color] duration-150 ease-out-expo hover:-translate-y-px hover:border-primary hover:text-white active:scale-[0.97] animate-rise"
                style={{ animationDelay: `${80 + i * 40}ms` }}
              >
                {p}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Message thread */}
      <div className="space-y-2 min-h-[220px]">
        {messages.map((m, i) => (
          <Card
            key={i}
            variant={m.role === "assistant" ? "luminous" : "elevated"}
            className="p-4 animate-spring"
          >
            <div className="flex items-start gap-3">
              <div
                className={`grid h-7 w-7 place-items-center rounded-full flex-shrink-0 ${
                  m.role === "user"
                    ? "bg-[hsl(240_8%_20%)] text-muted-foreground"
                    : "bg-gradient-to-br from-primary to-cyan text-white shadow-[0_0_14px_hsl(258_90%_66%_/_0.55)]"
                }`}
              >
                <HugeiconsIcon
                  icon={m.role === "user" ? UserCircleIcon : RobotIcon}
                  size={14}
                  strokeWidth={1.6}
                />
              </div>
              <div className={`flex-1 whitespace-pre-wrap text-sm leading-relaxed ${m.role === "assistant" ? "font-medium" : ""}`}>
                {m.content}
              </div>
            </div>
          </Card>
        ))}
        {busy && (
          <Card className="p-4 border-primary/30 bg-gradient-to-br from-primary/[0.06] to-cyan/[0.03] animate-rise">
            <div className="flex items-center gap-3">
              <div className="grid h-7 w-7 place-items-center rounded-full flex-shrink-0 bg-gradient-to-br from-primary to-cyan text-white shadow-[0_0_12px_hsl(258_90%_66%_/_0.4)]">
                <HugeiconsIcon icon={Loading03Icon} size={14} strokeWidth={1.6} className="animate-spin" />
              </div>
              <div className="flex-1 font-mono text-[12px] text-muted-foreground">
                Engine solving, then narrator will explain…
              </div>
            </div>
          </Card>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="flex gap-2 sticky bottom-2">
        <Input
          placeholder="Ask the DSS…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={busy}
        />
        <Button onClick={() => send()} disabled={busy || !text.trim()} size="icon" aria-label="Send">
          <HugeiconsIcon icon={busy ? Loading03Icon : SentIcon} size={16} strokeWidth={1.6} className={busy ? "animate-spin" : ""} />
        </Button>
      </div>
    </div>
  );
}
