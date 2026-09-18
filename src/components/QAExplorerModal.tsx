"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { X, Search, BookOpen, ChevronRight, Library, Copy, Check, MessageSquarePlus } from "lucide-react";

interface QARecord {
  id: string;
  question: string;
  answer: string;
  category: string;
  source_module: string;
  tags: string[];
  hit_count: number;
}

interface QAResponse {
  ok: boolean;
  total: number;
  bank_total: number;
  items: QARecord[];
  error?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  CHUYEN_DE_TU_NHIEN_L8: "33 chuyên đề Tự nhiên Việt Nam L8",
  CHUYEN_DE_KINH_TE_L9: "20 chuyên đề Kinh tế – xã hội Việt Nam L9",
  KY_NANG_DIA_LI: "Kỹ năng & Số liệu",
  PHUONG_PHAP_ON_HSG: "Chiến thuật HSG",
};

const CATEGORY_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "CHUYEN_DE_TU_NHIEN_L8", label: "33 chuyên đề Tự nhiên Việt Nam L8" },
  { value: "CHUYEN_DE_KINH_TE_L9", label: "20 chuyên đề Kinh tế – xã hội Việt Nam L9" },
  { value: "KY_NANG_DIA_LI", label: "Kỹ năng & Số liệu" },
  { value: "PHUONG_PHAP_ON_HSG", label: "Chiến thuật HSG" },
];

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

export default function QAExplorerModal({
  onClose,
  onInsertQuestion,
}: {
  onClose: () => void;
  onInsertQuestion: (question: string) => void;
}) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [items, setItems] = useState<QARecord[]>([]);
  const [total, setTotal] = useState(0);
  const [bankTotal, setBankTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const runSearch = useCallback(async (query: string, cat: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (cat) params.set("category", cat);
      params.set("limit", "60");
      const res = await fetch(`/api/qa?${params.toString()}`);
      const data = (await res.json()) as QAResponse;
      if (data.ok) {
        setItems(data.items);
        setTotal(data.total);
        setBankTotal(data.bank_total);
      } else {
        setItems([]);
        setTotal(0);
      }
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Lần mở đầu: tải toàn bộ (không từ khoá) để hiện danh sách
  useEffect(() => {
    runSearch("", "");
  }, [runSearch]);

  // Debounce tìm kiếm tức thì
  useEffect(() => {
    if (q === "" && category === "") return; // đã tải lần đầu
    const t = setTimeout(() => runSearch(q, category), 250);
    return () => clearTimeout(t);
  }, [q, category, runSearch]);

  const copyAnswer = useCallback(async (id: string, text: string) => {
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
      setCopied(id);
      setTimeout(() => setCopied((cur) => (cur === id ? null : cur)), 1800);
    } catch {
      /* clipboard bị chặn — bỏ qua */
    }
  }, []);

  // Escape để đóng modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = useMemo(() => items, [items]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 md:p-6"
      onClick={onClose}
    >
      <div
        className="flex flex-col w-full max-w-3xl h-[88vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 bg-brand-900 text-white px-4 py-3 flex items-center gap-3">
          <Library className="w-5 h-5 text-indigo-300" />
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm md:text-base">📚 Ngân hàng câu hỏi chuẩn Barem</h2>
            <p className="text-xs text-indigo-300">
              {bankTotal > 0 ? `${bankTotal} câu Q&A · ` : ""}Tra cứu tức thì, 0 token LLM
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="shrink-0 rounded-lg hover:bg-white/10 p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search + filter */}
        <div className="shrink-0 bg-gray-50 border-b border-gray-200 px-4 py-3 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo từ khoá: tên sông, đỉnh núi, vùng kinh tế, chuyên đề..."
              className="w-full rounded-xl border border-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCategory(opt.value)}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  category === opt.value
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-indigo-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            {loading ? "Đang tra cứu..." : `Hiển thị ${filtered.length} / ${total} câu khớp`}
          </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {filtered.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center text-gray-400">
              <BookOpen className="w-10 h-10" />
              <p className="text-sm">Không tìm thấy câu hỏi khớp. Thử từ khoá khác nhé.</p>
            </div>
          )}

          {filtered.map((r) => {
            const isOpen = expanded === r.id;
            return (
              <div key={r.id} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-start gap-1 hover:bg-gray-50 transition-colors">
                  <button
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                    className="flex-1 min-w-0 text-left px-3 py-2.5 flex items-start gap-2"
                  >
                    <ChevronRight className={`w-4 h-4 mt-0.5 shrink-0 text-indigo-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium leading-snug">{r.question}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                          {categoryLabel(r.category)}
                        </span>
                        <span className="text-[11px] text-gray-400">{r.source_module}</span>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => onInsertQuestion(r.question)}
                    title="Đưa vào khung Chat"
                    className="shrink-0 self-center mr-2 flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1.5 rounded-lg transition-colors"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Đưa vào khung Chat</span>
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50 px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-gray-500">Đáp án chuẩn barem</span>
                      <button
                        onClick={() => copyAnswer(r.id, r.answer)}
                        className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-indigo-600 transition-colors"
                      >
                        {copied === r.id
                          ? <><Check className="w-3.5 h-3.5 text-green-600" /> Đã copy</>
                          : <><Copy className="w-3.5 h-3.5" /> Copy đáp án</>
                        }
                      </button>
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                      {r.answer}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
