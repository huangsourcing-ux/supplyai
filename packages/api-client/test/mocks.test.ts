import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { configureApiClient, getHealthLive } from "../src/index.js";
import {
  getGetHealthLiveMockHandler,
  getGetHealthLiveResponseMock,
} from "../src/mocks.js";

const server = setupServer(getGetHealthLiveMockHandler());

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("generated MSW contract mocks", () => {
  it("intercepts the generated client on any host", async () => {
    configureApiClient({
      baseUrl: "https://contract.example/api/v1",
    });

    await expect(getHealthLive()).resolves.toEqual(
      getGetHealthLiveResponseMock(),
    );
  });
});
