import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: __ENV.VUS ? Number(__ENV.VUS) : 20,
  duration: __ENV.DURATION || "1m"
};

function makeHeaders(n) {
  const h = {};
  for (let i = 0; i < n; i++) h[`X-Custom-${i}`] = `val-${i}`;
  return h;
}

export default function () {
  const count = __ENV.HCOUNT ? Number(__ENV.HCOUNT) : 50;
  const url = `${__ENV.BASE || "http://localhost:8080"}/matrix`;
  const res = http.get(url, { headers: makeHeaders(count) });
  check(res, { "200": (r) => r.status === 200 });
}
