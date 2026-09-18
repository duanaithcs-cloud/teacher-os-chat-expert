"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { SendHorizontal, Bot, User, BookOpen, BarChart3, Loader2, ChevronRight, Brain, Copy, Check, Library } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import ErrorBoundary from "@/components/ErrorBoundary";
import QAExplorerModal from "@/components/QAExplorerModal";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatStats {
  entities: string[];
  facts_count: number;
  paths_count: number;
}

const SAMPLE_QUESTIONS = [
  "Tại sao vùng Bắc Trung Bộ gió phơn Tây Nam hoạt động khốc liệt hơn?",
  "Phân tích vai trò đất feralit với cây công nghiệp lâu năm Tây Nguyên",
  "Diện tích cà phê và sản lượng điện Việt Nam năm 2024?",
  "Biểu đồ nào thể hiện chuyển dịch cơ cấu kinh tế từ 4 năm trở lên?",
  "Phân vùng kinh tế 6 vùng theo quy hoạch 2024",
];

const KG_STATS = [
  { label: "Nodes", value: "371", icon: Brain },
  { label: "Edges", value: "426", icon: ChevronRight },
  { label: "Bridge L8→L9", value: "84", icon: BookOpen },
  { label: "Facts 2024–26", value: "429", icon: BarChart3 },
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

  const sendMessage = useCallback(async (question: string) => {
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
      const data = await res.json() as {
        answer?: string;
        error?: string;
        entities?: string[];
        facts_count?: number;
        paths_count?: number;
      };
      const answer =
        (data.answer && data.answer.trim())
        || data.error
        || "⚠️ Hệ thống không trả về nội dung. Anh thử gửi lại câu hỏi.";
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
      setStats({
        entities: data.entities ?? [],
        facts_count: data.facts_count ?? 0,
        paths_count: data.paths_count ?? 0,
      });
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `❌ Lỗi kết nối: ${err instanceof Error ? err.message : String(err)}`,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [loading, messages]);

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
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Sidebar (md+) ── */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-brand-900 text-white p-4 gap-6 overflow-y-auto">
        {/* Logo */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-6 h-6 text-indigo-300" />
            <span className="font-bold text-sm leading-tight">HUB Địa AI</span>
          </div>
          <p className="text-xs text-indigo-300 leading-snug">
            Bồi dưỡng HSG Địa lí 8–9 · ThS. Phùng Văn Tiến
          </p>
        </div>

        {/* KG Stats */}
        <div>
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">Knowledge Graph</p>
          <div className="grid grid-cols-2 gap-2">
            {KG_STATS.map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-brand-700 bg-opacity-40 rounded-lg p-2 text-center">
                <Icon className="w-4 h-4 text-indigo-300 mx-auto mb-0.5" />
                <div className="text-base font-bold text-white">{value}</div>
                <div className="text-xs text-indigo-300">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sample questions */}
        <div>
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">Câu hỏi mẫu</p>
          <ul className="space-y-1.5">
            {SAMPLE_QUESTIONS.map((q) => (
              <li key={q}>
                <button
                  onClick={() => { setInput(q); textareaRef.current?.focus(); }}
                  className="w-full text-left text-xs text-indigo-200 hover:text-white hover:bg-brand-700 hover:bg-opacity-50 rounded px-2 py-1.5 transition-colors flex items-start gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-indigo-400" />
                  <span>{q}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Stats panel */}
        {stats && (
          <div>
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">Lần hỏi vừa rồi</p>
            <div className="bg-brand-700 bg-opacity-40 rounded-lg p-3 text-xs space-y-1.5">
              <div><span className="text-indigo-300">Facts:</span> <span className="font-semibold">{stats.facts_count}</span></div>
              <div><span className="text-indigo-300">Causal paths:</span> <span className="font-semibold">{stats.paths_count}</span></div>
              {stats.entities.length > 0 && (
                <div>
                  <span className="text-indigo-300">Entities:</span>
                  <ul className="mt-1 space-y-0.5">
                    {stats.entities.map((e) => (
                      <li key={e} className="text-indigo-100 truncate">· {e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <Brain className="w-6 h-6 text-brand-600 md:hidden" />
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-brand-900 text-sm md:text-base truncate">
              🧠 Trợ lý AI Bồi dưỡng HSG Địa lí
            </h1>
            <p className="text-xs text-gray-500 hidden sm:block">Graph-RAG + MCP · Địa lí 8 &amp; 9 · ThS. Phùng Văn Tiến</p>
          </div>
          <span className="shrink-0 text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
            KG v1.0 | 371 nodes
          </span>
          <button
            onClick={() => setQaOpen(true)}
            className="shrink-0 flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors"
            aria-label="Mở ngân hàng câu hỏi chuẩn barem"
          >
            <Library className="w-4 h-4" />
            <span className="hidden sm:inline">📚 Ngân hàng câu hỏi</span>
            <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full">388</span>
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto chat-scroll px-3 md:px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
              <Brain className="w-14 h-14 text-indigo-200" />
              <p className="text-gray-500 text-sm max-w-sm">
                Hỏi bất kỳ câu hỏi HSG Địa lí — hệ thống sẽ truy vấn đồ thị tri thức
                và trả về chuỗi nhân quả + facts thực chứng 2024–2026.
              </p>
              {/* Mobile sample questions */}
              <div className="md:hidden flex flex-col gap-2 w-full max-w-sm">
                {SAMPLE_QUESTIONS.slice(0, 3).map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-left text-xs bg-white border border-indigo-100 hover:border-indigo-300 rounded-lg px-3 py-2 text-gray-600 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              {/* Avatar */}
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                msg.role === "user" ? "bg-brand-600" : "bg-indigo-100"
              }`}>
                {msg.role === "user"
                  ? <User className="w-4 h-4 text-white" />
                  : <Bot className="w-4 h-4 text-indigo-600" />
                }
              </div>

              {/* Bubble */}
              <div className={`max-w-[80%] md:max-w-[72%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-brand-600 text-white rounded-tr-sm"
                  : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
              }`}>
                {msg.role === "assistant"
                  ? (
                    <div className="relative">
                      <button
                        onClick={() => copyAnswer(msg.content, i)}
                        aria-label="Copy toàn bộ câu trả lời"
                        title="Copy toàn bộ câu trả lời"
                        className="absolute -top-1 -right-1 z-10 flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-500 shadow-sm hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                      >
                        {copiedIdx === i
                          ? <><Check className="w-3.5 h-3.5 text-green-600" /> Đã copy</>
                          : <><Copy className="w-3.5 h-3.5" /> Copy</>
                        }
                      </button>
                      <ErrorBoundary fallbackText={msg.content}>
                        <MarkdownRenderer content={msg.content} />
                      </ErrorBoundary>
                    </div>
                  )
                  : <p className="whitespace-pre-wrap">{msg.content}</p>
                }
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
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

        {/* Input */}
        <div className="shrink-0 bg-white border-t border-gray-200 px-3 md:px-6 py-3">
          <div className="flex gap-2 items-end max-w-4xl mx-auto">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập câu hỏi HSG Địa lí... (Enter gửi, Shift+Enter xuống dòng)"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 max-h-32 overflow-y-auto"
              style={{ minHeight: "44px" }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="shrink-0 w-11 h-11 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              aria-label="Gửi"
            >
              {loading
                ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                : <SendHorizontal className="w-5 h-5 text-white" />
              }
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-1.5">
            Dữ liệu từ Knowledge Graph v1.0 · Facts thực chứng 2024–2026 · SGK KNTT 2026
          </p>
        </div>
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
