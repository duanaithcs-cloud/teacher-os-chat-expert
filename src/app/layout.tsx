import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trợ lý AI Bồi dưỡng HSG Địa lí | Teacher OS",
  description: "Chatbot AI chuyên gia Địa lí 8–9 khai thác Knowledge Graph 316 nodes + 254 facts thực chứng 2024–2026",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
