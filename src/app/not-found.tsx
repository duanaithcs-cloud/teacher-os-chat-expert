/**
 * 404 UI — không để Next.js trả trang trắng mặc định.
 */

import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-center">
        <Compass className="w-12 h-12 text-indigo-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-brand-900 mb-1">Không tìm thấy trang</h2>
        <p className="text-sm text-gray-600 mb-4">
          Đường dẫn này không tồn tại trong hệ thống.
        </p>
        <Link
          href="/"
          className="inline-block bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          Về trang chat
        </Link>
      </div>
    </div>
  );
}
