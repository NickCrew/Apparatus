import http from "k6/http";
import { check } from "k6";

export const options = {
  stages: [
    { duration: "1m", target: 20 },
    { duration: "2m", target: 100 },
    { duration: "2m", target: 200 },
    { duration: "1m", target: 0 }
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"]
  }
};

export default function () {
  const base = __ENV.BASE || "http://localhost:8080";
  const res = http.get(`${base}/healthz`);
  check(res, { "200": (r) => r.status === 200 });
}
