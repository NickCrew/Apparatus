import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

export const options = {
  vus: __ENV.VUS ? Number(__ENV.VUS) : 10,
  duration: __ENV.DURATION || "1m"
};

const t = new Trend("latency");

export default function () {
  const url = `${__ENV.BASE || "http://localhost:8080"}/echo?foo=bar`;
  const res = http.get(url);
  t.add(res.timings.duration);
  check(res, {
    "status is 200": (r) => r.status === 200
  });
  sleep(0.2);
}
