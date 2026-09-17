"use client";

/**
 * Global error boundary — bắt lỗi ngay cả khi root layout sập.
 * Phải tự render <html> và <body> vì nó thay thế layout gốc.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", background: "#f9fafb" }}>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ maxWidth: 440, width: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e1b4b", margin: "0 0 8px" }}>Ứng dụng không khởi động được</h2>
            <p style={{ fontSize: 14, color: "#4b5563", margin: "0 0 16px", lineHeight: 1.5 }}>
              Lỗi nghiêm trọng ở lớp gốc. Anh thử tải lại trang; nếu vẫn lỗi, báo em để kiểm tra build.
            </p>
            {error?.message && (
              <pre style={{ textAlign: "left", fontSize: 12, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, overflowX: "auto", color: "#6b7280", maxHeight: 120 }}>
                {error.message}
              </pre>
            )}
            <button
              onClick={reset}
              style={{ background: "#4f46e5", color: "#fff", border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Thử lại
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
