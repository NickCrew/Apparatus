import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: __ENV.VUS ? Number(__ENV.VUS) : 30,
  duration: __ENV.DURATION || "2m"
};

const paths = [
  "/echo?param=../etc/passwd",
  "/search?q=1%27%20OR%20%271%27=%271",
  "/login;param=value",
  "/%2e%2e/%2e%2e/",
  "/api/%2e%2e%2fadmin",
  "/very/long/" + "a".repeat(1000)
];

export default function () {
  const base = __ENV.BASE || "http://localhost:8080";
  const headers = {
    "X-Long-Header": "x".repeat(2048),
    "X-Weird": "\"()<>[]{};:,./?-=+|\\"
  };
  const i = Math.floor(Math.random() * paths.length);
  const res = http.get(`${base}${paths[i]}`, { headers });
  check(res, { "received": (r) => r.status > 0 });
}
