import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 10,
  duration: "1m"
};

function randomBytes(n) {
  const arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) arr[i] = Math.floor(Math.random() * 256);
  return arr.buffer;
}

export default function () {
  const buf = randomBytes(__ENV.BYTES ? Number(__ENV.BYTES) : 64 * 1024);
  const res = http.post(`${__ENV.BASE || "http://localhost:8080"}/bin`, buf, {
    headers: { "Content-Type": "application/octet-stream" }
  });
  check(res, { "200": (r) => r.status === 200 });
}
