// Verify public /api/chat exam response: model, degraded, and Vietnamese content markers.
const body = {
  messages: [
    { role: "user", content: "Soạn 1 đề HSG Địa lí 9 đầy đủ theo ma trận Sở Hà Nội, kèm hướng dẫn chấm." },
  ],
};
const res = await fetch("https://teacher-os-chat-expert.vercel.app/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});
const data = await res.json();
const answer = data.answer ?? "";
const markers = ["Ma trận", "HƯỚNG DẪN CHẤM", "Đúng/Sai", "biểu đồ", "Câu I"];
console.log(JSON.stringify({
  http: res.status,
  model_used: data.model_used,
  degraded: data.degraded,
  attempted: data.model_attempted,
  last_error: data.last_error,
  answer_len: answer.length,
  markers: Object.fromEntries(markers.map((m) => [m, answer.includes(m)])),
  head: answer.slice(0, 200),
}, null, 2));
