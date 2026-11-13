import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUpIcon } from "./icons";

type Message = {
  id: number;
  text: string;
  meta: string;
};

export type PhoneChatCopy = {
  userMessage: string;
  userMeta: string;
  agentMessage: string;
  agentMeta: string;
  board: {
    title: string;
    filled: string;
    rows: { name: string; kind: string; status: string }[];
  };
  quickPrompts: { label: string; text: string }[];
  inputPlaceholder: string;
  replyDefault: string;
  replyKitchen: string;
  replyRoof: string;
  replyNzRoof?: string;
  replyFence: string;
  replyMeta: string;
};

type PhoneChatDemoProps = {
  copy: PhoneChatCopy;
};

export function PhoneChatDemo({ copy }: PhoneChatDemoProps) {
  const initialMessages: Message[] = [
    { id: 1, text: copy.userMessage, meta: copy.userMeta },
    { id: 2, text: copy.agentMessage, meta: copy.agentMeta },
  ];

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const timelineRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(3);

  const scrollToBottom = () => {
    // scroll the phone screen container (timeline's parent)
    const el = timelineRef.current?.parentElement;
    if (el) el.scrollTop = el.scrollHeight;
  };

  const send = (raw: string) => {
    const query = raw.trim();
    if (!query) return;

    setMessages((prev) => [...prev, { id: idRef.current++, text: query, meta: "Just now" }]);
    setInput("");
    requestAnimationFrame(scrollToBottom);

    const lower = query.toLowerCase();
    let reply = copy.replyDefault;
    if (lower.includes("kitchen") || lower.includes("backsplash") || lower.includes("cabinet")) {
      reply = copy.replyKitchen;
    } else if (lower.includes("nz$") || lower.includes("m²") || lower.includes("18 m")) {
      reply = copy.replyNzRoof ?? copy.replyRoof;
    } else if (lower.includes("roof") || lower.includes("shingle") || lower.includes("tear off")) {
      reply = copy.replyRoof;
    } else if (lower.includes("fence")) {
      reply = copy.replyFence;
    }

    setTimeout(() => {
      setMessages((prev) => [...prev, { id: idRef.current++, text: reply, meta: copy.replyMeta }]);
      requestAnimationFrame(scrollToBottom);
    }, 700);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") send(input);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <>
      {/* Chat Timeline */}
      <div ref={timelineRef} className="flex flex-col gap-3.5">
        {/* Chat Bubble 1 (User) */}
        <div className="animate-bubble-1 flex max-w-[88%] flex-col items-start opacity-0">
          <div className="rounded-2xl rounded-tl-sm bg-[#F3F4F6] px-4 py-3 text-[13px] leading-relaxed text-neutral-800 shadow-sm">
            {initialMessages[0]?.text}
          </div>
          <span className="ml-1 mt-1 text-[10px] text-neutral-400">{initialMessages[0]?.meta}</span>
        </div>

        {/* Chat Bubble 2 (AI Assistant) */}
        <div className="animate-bubble-2 flex max-w-[90%] flex-col items-start opacity-0">
          <div className="rounded-2xl rounded-tl-sm bg-[#F3F4F6] px-4 py-3 text-[13px] leading-relaxed text-neutral-800 shadow-sm">
            {initialMessages[1]?.text}
          </div>
          <span className="ml-1 mt-1 text-[10px] text-neutral-400">{initialMessages[1]?.meta}</span>
        </div>

        {/* Chat Bubble 3 (Board Preview — the product itself) */}
        <div className="animate-bubble-3 mt-1 max-w-[92%] opacity-0">
          <div className="rounded-xl border border-neutral-100 bg-white p-3 shadow-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-bold text-neutral-900">{copy.board.title}</span>
              <span className="text-[10px] font-medium text-emerald-600">{copy.board.filled}</span>
            </div>
            <div className="mt-2 space-y-1.5">
              {copy.board.rows.map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-2 py-1.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-semibold text-neutral-800">
                      {row.name}
                    </div>
                    <div className="text-[9px] text-neutral-400">{row.kind}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                    {row.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamically appended messages */}
        {messages.slice(2).map((msg) => (
          <div key={msg.id} className="flex max-w-[88%] flex-col items-start transition-all">
            <div className="rounded-2xl rounded-tl-sm bg-[#F3F4F6] px-4 py-3 text-[13px] leading-relaxed text-neutral-800 shadow-sm">
              {msg.text}
            </div>
            <span className="ml-1 mt-1 text-[10px] text-neutral-400">{msg.meta}</span>
          </div>
        ))}
      </div>

      {/* Interactive Mock Input at bottom of phone */}
      <div className="flex flex-col gap-2 border-t border-neutral-100 pt-3">
        {/* Suggested Quick Prompts */}
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
          {copy.quickPrompts.map((p) => (
            <button
              key={p.label}
              onClick={() => send(p.text)}
              className="whitespace-nowrap rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600 transition-colors hover:bg-neutral-200"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Input Field Bar */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1.5"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={copy.inputPlaceholder}
            className="w-full bg-transparent text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none"
          />
          <button
            type="submit"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-white transition-colors hover:bg-neutral-800"
          >
            <ArrowUpIcon className="h-3.5 w-3.5" />
          </button>
        </form>

        {/* iOS Home Indicator bar */}
        <div className="mx-auto mt-2 h-1 w-28 rounded-full bg-neutral-300" />
      </div>
    </>
  );
}
