"use client";

/**
 * ErrorBoundary — bọc quanh MarkdownRenderer.
 * Nếu parser markdown gặp nội dung lạ từ LLM (bảng, code fence, ký tự hỏng)
 * → render plain text thay vì ném lỗi làm trắng cả app.
 */

import React from "react";

interface Props {
  children: React.ReactNode;
  fallbackText?: string;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Render lỗi:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          <p className="text-xs text-amber-600 font-semibold mb-1">
            ⚠️ Không hiển thị được định dạng — nội dung gốc:
          </p>
          {this.props.fallbackText ?? "(không có nội dung)"}
        </div>
      );
    }
    return this.props.children;
  }
}
