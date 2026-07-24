import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

/* global __ENV */

const mapDuration = new Trend("map_duration", true);

export const options = {
  stages: [
    { duration: "5s", target: 10 },
    { duration: "30s", target: 10 },
    { duration: "5s", target: 0 },
  ],
  thresholds: {
    checks: ["rate==1"],
    http_req_failed: ["rate==0"],
    map_duration: ["p(95)<500"],
  },
};

export default function loadMapFactories() {
  const response = http.get(
    `${__ENV.API_BASE_URL}/map/factories?bbox=70,0,140,60`,
    { tags: { endpoint: "MAP-3" } },
  );
  mapDuration.add(response.timings.duration);
  check(response, {
    "MAP-3 returns 200": ({ status }) => status === 200,
    "MAP-3 returns JSON": ({ headers }) =>
      headers["Content-Type"]?.includes("application/json") === true,
  });
  sleep(1);
}
