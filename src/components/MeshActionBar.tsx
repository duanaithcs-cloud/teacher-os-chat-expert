"use client";

import { useMemo } from "react";
import { MapPin, BarChart3 } from "lucide-react";
import { dispatchMeshEvent } from "@/lib/meshProducer";
import type { MeshModuleType, GeoEntityPayload } from "@/types/meshContract";

interface KeywordRule {
  pattern: string;
  category: GeoEntityPayload["category"];
  targetModule: "dia8" | "dia9";
  layerId?: string;
}

// Bộ từ khoá không gian/địa lí — dùng để nhận diện ngữ cảnh trong câu trả lời.
// Thứ tự quan trọng: chuỗi dài/cụ thể xếp trước để khớp chính xác hơn.
const KEYWORD_RULES: KeywordRule[] = [
  { pattern: "Trường Sơn Bắc", category: "L8_NATURAL", targetModule: "dia8", layerId: "mountains" },
  { pattern: "Hoàng Liên Sơn", category: "L8_NATURAL", targetModule: "dia8", layerId: "mountains" },
  { pattern: "Phan-xi-păng", category: "L8_NATURAL", targetModule: "dia8", layerId: "mountains" },
  { pattern: "Sông Đà", category: "L8_NATURAL", targetModule: "dia8", layerId: "rivers" },
  { pattern: "Sông Hồng", category: "L8_NATURAL", targetModule: "dia8", layerId: "rivers" },
  { pattern: "Sông Cửu Long", category: "L8_NATURAL", targetModule: "dia8", layerId: "rivers" },
  { pattern: "Mê Công", category: "L8_NATURAL", targetModule: "dia8", layerId: "rivers" },
  { pattern: "đất feralit", category: "L8_NATURAL", targetModule: "dia8" },
  { pattern: "chế độ nước", category: "L8_NATURAL", targetModule: "dia8", layerId: "rivers" },
  { pattern: "Đồng bằng sông Hồng", category: "L9_SOCIO_ECON", targetModule: "dia9" },
  { pattern: "Đồng bằng sông Cửu Long", category: "L9_SOCIO_ECON", targetModule: "dia9" },
  { pattern: "Tây Nguyên", category: "L9_SOCIO_ECON", targetModule: "dia9" },
  { pattern: "Bắc Trung Bộ", category: "L9_SOCIO_ECON", targetModule: "dia9" },
  { pattern: "Đông Nam Bộ", category: "L9_SOCIO_ECON", targetModule: "dia9" },
  { pattern: "Trung du", category: "L9_SOCIO_ECON", targetModule: "dia9" },
  { pattern: "Duyên hải miền Trung", category: "L9_SOCIO_ECON", targetModule: "dia9" },
  { pattern: "Quần đảo Hoàng Sa", category: "L9_SOCIO_ECON", targetModule: "dia9", layerId: "islands" },
  { pattern: "Quần đảo Trường Sa", category: "L9_SOCIO_ECON", targetModule: "dia9", layerId: "islands" },
];

interface DetectedTopic {
  topicId: string;
  title: string;
  category: GeoEntityPayload["category"];
  targetModule: MeshModuleType;
  layerId?: string;
}

function detectTopic(content: string): DetectedTopic | null {
  const lower = content.toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (lower.includes(rule.pattern.toLowerCase())) {
      return {
        topicId: rule.pattern.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        title: rule.pattern,
        category: rule.category,
        targetModule: rule.targetModule,
        layerId: rule.layerId,
      };
    }
  }
  return null;
}

export default function MeshActionBar({ content }: { content: string }) {
  const topic = useMemo(() => detectTopic(content), [content]);

  if (!topic) return null;

  const handleLocate = () => {
    dispatchMeshEvent("NAVIGATE_TOPIC", {
      topicId: topic.topicId,
      category: topic.category,
      title: topic.title,
      targetModule: topic.targetModule,
      metadata: topic.layerId ? { layerId: topic.layerId } : undefined,
    });
  };

  const handleAssess = () => {
    dispatchMeshEvent("REQUEST_ASSESSMENT", {
      topicId: topic.topicId,
      category: topic.category,
      title: topic.title,
      targetModule: "quiz",
    });
  };

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      <button
        onClick={handleLocate}
        className="text-xs font-medium px-2.5 py-1 rounded-full border border-indigo-200/60 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 transition-all flex items-center gap-1"
      >
        <MapPin className="w-3.5 h-3.5" />
        Định vị trên Bản đồ
      </button>
      <button
        onClick={handleAssess}
        className="text-xs font-medium px-2.5 py-1 rounded-full border border-indigo-200/60 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 transition-all flex items-center gap-1"
      >
        <BarChart3 className="w-3.5 h-3.5" />
        Đối soát Bảng số liệu
      </button>
    </div>
  );
}
