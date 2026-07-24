import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

/* global __ENV */

const searchDuration = new Trend("search_duration", true);

export const options = {
  stages: [
    { duration: "5s", target: 10 },
    { duration: "30s", target: 10 },
    { duration: "5s", target: 0 },
  ],
  thresholds: {
    checks: ["rate==1"],
    http_req_failed: ["rate==0"],
    search_duration: ["p(95)<300"],
  },
};

export default function loadSearch() {
  const response = http.get(`${__ENV.API_BASE_URL}/search?q=led`, {
    tags: { endpoint: "A-6" },
  });
  searchDuration.add(response.timings.duration);
  check(response, {
    "search returns 200": ({ status }) => status === 200,
    "search returns JSON": ({ headers }) =>
      headers["Content-Type"]?.includes("application/json") === true,
  });
  sleep(1);
}
