import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: __ENV.VUS ? Number(__ENV.VUS) : 20,
  duration: __ENV.DURATION || "2m",
  insecureSkipTLSVerify: true
};

export default function () {
  const base = __ENV.BASE_HTTPS || "https://echo.localtest.me";
  const res = http.get(`${base}/echo`, { tags: { proto: "h2" } });
  check(res, {
    "200": (r) => r.status === 200
  });
}
