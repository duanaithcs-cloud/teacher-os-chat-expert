"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  SendHorizontal,
  Bot,
  User,
  Loader2,
  ChevronRight,
  Brain,
  Copy,
  Check,
  Library,
} from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import ErrorBoundary from "@/components/ErrorBoundary";
import QAExplorerModal from "@/components/QAExplorerModal";
import MeshActionBar from "@/components/MeshActionBar";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatStats {
  entities: string[];
  facts_count: number;
  paths_count: number;
}

const QA_COUNT = 533;

const SAMPLE_QUESTIONS = [
  "Tại sao gió phơn Tây Nam ở Bắc Trung Bộ hoạt động khốc liệt?",
  "Vai trò đất feralit đối với cây công nghiệp lâu năm Tây Nguyên?",
  "Chứng minh chế độ nước sông Hồng mang tính chất mùa.",
];

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [qaOpen, setQaOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || loading) return;
      const userMsg: Message = { role: "user", content: q };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q, messages: [...messages, userMsg] }),
        });
        const data = (await res.json()) as {
          answer?: string;
          error?: string;
          entities?: string[];
          facts_count?: number;
          paths_count?: number;
        };
        const answer =
          (data.answer && data.answer.trim()) ||
          data.error ||
          "Hệ thống chưa trả về nội dung. Anh thử gửi lại câu hỏi.";
        setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
        setStats({
          entities: data.entities ?? [],
          facts_count: data.facts_count ?? 0,
          paths_count: data.paths_count ?? 0,
        });
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Lỗi kết nối: ${err instanceof Error ? err.message : String(err)}`,
          },
        ]);
      } finally {
        setLoading(false);
        setTimeout(() => textareaRef.current?.focus(), 50);
      }
    },
    [loading, messages]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const copyAnswer = useCallback(async (text: string, idx: number) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((cur) => (cur === idx ? null : cur)), 2000);
    } catch {
      // clipboard bị chặn — bỏ qua, không crash UI
    }
  }, []);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-slate-50">
      {/* ── Sidebar (md+) ── */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-slate-900 text-white p-4 gap-6 overflow-y-auto">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-300" />
          <span className="font-semibold text-sm leading-tight">Địa lí Việt Nam</span>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-400 mb-2">Câu hỏi mẫu</p>
          <ul className="space-y-1.5">
            {SAMPLE_QUESTIONS.map((q) => (
              <li key={q}>
                <button
                  onClick={() => {
                    setInput(q);
                    textareaRef.current?.focus();
                  }}
                  className="w-full text-left text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg px-2 py-1.5 transition-colors flex items-start gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-slate-500" />
                  <span>{q}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {stats && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Lần hỏi vừa rồi</p>
            <div className="bg-white/5 rounded-xl p-3 text-xs space-y-1.5">
              <div>
                <span className="text-slate-400">Số liệu đối chiếu: </span>
                <span className="font-semibold">{stats.facts_count}</span>
              </div>
              <div>
                <span className="text-slate-400">Chuỗi lập luận: </span>
                <span className="font-semibold">{stats.paths_count}</span>
              </div>
              {stats.entities.length > 0 && (
                <div>
                  <span className="text-slate-400">Đối tượng:</span>
                  <ul className="mt-1 space-y-0.5">
                    {stats.entities.map((e) => (
                      <li key={e} className="text-slate-200 truncate">
                        · {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <div className="relative flex flex-col flex-1 min-w-0">
        {/* Nút ngân hàng câu hỏi — pill thu gọn, chỉ hiện khi đã vào chat */}
        {messages.length > 0 && (
          <button
            onClick={() => setQaOpen(true)}
            className="absolute top-3 right-3 z-30 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/70 shadow-sm hover:bg-slate-50 active:scale-[0.98] px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition-all"
            aria-label="Mở ngân hàng câu hỏi chuẩn barem"
          >
            <Library className="w-3.5 h-3.5" />
            <span className="font-semibold text-slate-900">{QA_COUNT}</span>
          </button>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto chat-scroll px-4 pt-4 pb-28 md:pb-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-5 text-center max-w-2xl mx-auto w-full">
              <Brain className="w-12 h-12 text-indigo-300" />
              <div className="space-y-1.5">
                <h1 className="text-xl font-semibold text-slate-900">Địa lí Việt Nam</h1>
                <p className="text-sm text-slate-500">
                  Phân tích chuẩn Barem &amp; số liệu chuyên sâu Lớp 8 – 9.
                </p>
              </div>
              <button
                onClick={() => setQaOpen(true)}
                className="flex items-center gap-2 rounded-full border border-slate-200/70 bg-white hover:bg-indigo-50/60 active:scale-[0.98] px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all"
                aria-label="Mở ngân hàng câu hỏi chuẩn barem"
              >
                <Library className="w-4 h-4 text-indigo-500" />
                <span>Ngân hàng câu hỏi</span>
                <span className="text-slate-300">·</span>
                <span className="font-semibold text-slate-900">{QA_COUNT}</span>
              </button>
              <div className="flex flex-col gap-2.5 w-full">
                {SAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-left rounded-2xl border border-slate-200/70 bg-slate-50/60 hover:bg-indigo-50/60 p-3.5 text-sm text-slate-700 active:scale-[0.98] transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  msg.role === "user" ? "bg-brand-600" : "bg-indigo-100"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-indigo-600" />
                )}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[80%] md:max-w-[72%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-brand-600 text-white rounded-tr-sm"
                    : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="relative">
                    <button
                      onClick={() => copyAnswer(msg.content, i)}
                      aria-label="Copy toàn bộ câu trả lời"
                      title="Copy toàn bộ câu trả lời"
                      className="absolute -top-1 -right-1 z-10 flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-500 shadow-sm hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                    >
                      {copiedIdx === i ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-600" /> Đã copy
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </>
                      )}
                    </button>
                    <ErrorBoundary fallbackText={msg.content}>
                      <MarkdownRenderer content={msg.content} />
                    </ErrorBoundary>
                    <MeshActionBar content={msg.content} />
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center h-5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input — cố định sát đáy trên mobile, về dòng chảy trên desktop */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-lg border-t border-slate-200/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:border-t md:bg-white/90"
        >
          <div className="flex gap-2 items-end max-w-2xl mx-auto w-full">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Hỏi bất kỳ điều gì..."
              rows={1}
              className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none px-4 py-3 text-sm text-slate-800 placeholder-slate-400 max-h-32 overflow-y-auto"
              style={{ minHeight: "46px" }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="shrink-0 w-11 h-11 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              aria-label="Gửi"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <SendHorizontal className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Bảng tra cứu Q&A chuẩn Barem */}
      {qaOpen && (
        <QAExplorerModal
          onClose={() => setQaOpen(false)}
          onInsertQuestion={(q) => {
            setInput(q);
            setQaOpen(false);
            setTimeout(() => textareaRef.current?.focus(), 50);
          }}
        />
      )}
    </div>
  );
}
