import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: __ENV.VUS ? Number(__ENV.VUS) : 10,
  iterations: __ENV.ITERS ? Number(__ENV.ITERS) : 200
};

function payload(sizeKb) {
  const s = "A".repeat(1024);
  const chunks = [];
  for (let i = 0; i < sizeKb; i++) chunks.push(s);
  return chunks.join("");
}

export default function () {
  const size = __ENV.KB ? Number(__ENV.KB) : 512; // 512KB
  const body = payload(size);
  const res = http.post(`${__ENV.BASE || "http://localhost:8080"}/upload`, body, {
    headers: { "Content-Type": "text/plain" }
  });
  check(res, { "200": (r) => r.status === 200 });
}
