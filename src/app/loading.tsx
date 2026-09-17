/**
 * Route-level loading UI — hiển thị skeleton trong lúc Suspense/streaming.
 * Chống trắng trang khi server component còn đang render.
 */

import { Brain } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar skeleton */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-brand-900 p-4 gap-6">
        <div className="animate-pulse space-y-2">
          <div className="h-6 w-32 bg-brand-700 rounded" />
          <div className="h-3 w-40 bg-brand-700 rounded" />
        </div>
        <div className="animate-pulse grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-brand-700 bg-opacity-40 rounded-lg" />
          ))}
        </div>
        <div className="animate-pulse space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 bg-brand-700 bg-opacity-40 rounded" />
          ))}
        </div>
      </aside>

      {/* Main skeleton */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="shrink-0 bg-white border-b border-gray-200 px-4 py-3">
          <div className="animate-pulse space-y-2">
            <div className="h-5 w-64 bg-gray-200 rounded" />
            <div className="h-3 w-48 bg-gray-100 rounded" />
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <Brain className="w-12 h-12 text-indigo-200 animate-pulse" />
          <p className="text-sm text-gray-400">Đang nạp Knowledge Graph…</p>
        </div>
      </div>
    </div>
  );
}
