import type { GeoEntityPayload, MeshEventMessage } from "@/types/meshContract";

/**
 * Mesh Producer (client-side) — broadcast semantic topic state tới các node
 * consumer (Hub, GIS/Map, Assessment Engine) qua postMessage, không qua backend.
 *
 * Node này chạy trong iframe của Hub; do đó dùng `window.parent.postMessage`.
 * An toàn SSR: mọi lệnh đều được guard bởi `typeof window !== "undefined"`.
 */
export function dispatchMeshEvent(
  event: MeshEventMessage["event"],
  payload: Omit<GeoEntityPayload, "timestamp">,
): void {
  if (typeof window === "undefined") return;

  const message: MeshEventMessage = {
    protocol: "TEACHER_OS_MESH_V1",
    source: "chat-expert",
    event,
    payload: {
      ...payload,
      timestamp: Date.now(),
    },
  };

  try {
    window.parent.postMessage(message, "*");
  } catch {
    // Bỏ qua lỗi postMessage (ví dụ cross-origin frame bị chặn) — không crash UI.
  }
}
