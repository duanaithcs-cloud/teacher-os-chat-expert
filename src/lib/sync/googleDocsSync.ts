/**
 * Google Docs Sync Queue — đồng bộ ngân hàng Q&A lên Google Docs theo lô (batch).
 *
 * Cơ chế:
 *   - Gom câu hỏi theo 4 chuyên đề chuẩn (category).
 *   - Ghi theo lô 5–10 câu để tránh chạm trần API quota (429).
 *   - ENV-GATED: chỉ hoạt động khi đủ biến GOOGLE_* được cấu hình; nếu không
 *     thì mọi lời gọi trả về trạng thái "disabled" (không ném lỗi, không crash).
 *
 * Lưu ý kiến trúc: Vercel serverless không có tiến trình nền bền vững, nên queue
 * ở đây chạy dạng in-memory + flush theo request (khi có biến môi trường bật).
 * Để đồng bộ định kỳ thực sự, chủ tài khoản nên gắn một Cron trigger tới endpoint
 * /api/sync/docs (xem route tương ứng) hoặc dùng Google Apps Script phía Drive.
 */

import type { QARecord } from "@/lib/cache/semanticCache";

const BATCH_SIZE = 8;

export type SyncStatus = "disabled" | "queued" | "flushed" | "error";

export interface SyncResult {
  ok: boolean;
  status: SyncStatus;
  queued: number;
  message: string;
}

interface QueueEntry {
  record: QARecord;
  enqueuedAt: number;
}

// In-memory queue (tồn tại trong vòng đời một serverless instance).
const _queue = new Map<string, QueueEntry>();

function isConfigured(): boolean {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  return Boolean(clientEmail && privateKey && folderId);
}

/** Đưa 1 bản ghi vào hàng đợi đồng bộ (chỉ khi Google Docs được cấu hình). */
export function enqueueSync(record: QARecord): SyncResult {
  if (!isConfigured()) {
    return { ok: false, status: "disabled", queued: 0, message: "Google Docs sync chưa được cấu hình (thiếu biến môi trường GOOGLE_*)." };
  }
  if (_queue.has(record.id)) {
    return { ok: true, status: "queued", queued: _queue.size, message: `Đã có trong hàng đợi: ${record.id}` };
  }
  _queue.set(record.id, { record, enqueuedAt: Date.now() });
  return { ok: true, status: "queued", queued: _queue.size, message: `Đã xếp hàng: ${record.id}` };
}

/** Gom nhóm queue theo category chuẩn (để ghi vào từng Google Doc tương ứng). */
export function groupQueueByCategory(): Map<string, QARecord[]> {
  const groups = new Map<string, QARecord[]>();
  _queue.forEach((entry) => {
    const cat = entry.record.category ?? "KHAC";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(entry.record);
  });
  return groups;
}

/**
 * Flush queue theo lô. Trong bản triển khai này, việc gọi Google Docs API thực tế
 * yêu cầu token OAuth/Service Account + thư viện googleapis — không thể chạy an toàn
 * trong module edge/runtime Node thuần nếu thiếu deps. Vì vậy flush() trả về kế hoạch
 * batch (đã chia lô) và đánh dấu rõ ràng để lớp route phía trên thực thi nếu có deps.
 */
export function flushQueue(): SyncResult {
  if (!isConfigured()) {
    return { ok: false, status: "disabled", queued: _queue.size, message: "Google Docs sync chưa được cấu hình." };
  }
  if (_queue.size === 0) {
    return { ok: true, status: "flushed", queued: 0, message: "Hàng đợi trống, không có gì để đồng bộ." };
  }
  const groups = groupQueueByCategory();
  let batches = 0;
  groups.forEach((items) => {
    batches += Math.ceil(items.length / BATCH_SIZE);
  });
  // Giữ queue để route thực thi; trả thông tin batch.
  return { ok: true, status: "flushed", queued: _queue.size, message: `Sẵn sàng ghi ${batches} lô (batch ${BATCH_SIZE} câu) vào ${groups.size} Google Doc.` };
}

export function getQueueSize(): number {
  return _queue.size;
}
