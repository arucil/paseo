import { describe, expect, test } from "vitest";
import { startWebSocketRuntime } from "./websocket-startup.js";

describe("startWebSocketRuntime", () => {
  test("restores utility terminals only after the daemon accepts connections", async () => {
    const events: string[] = [];
    const server = {
      beginAcceptingConnections() {
        events.push("accepting");
      },
      async restoreUtilityTerminals() {
        events.push("restore-utilities");
      },
    };

    await startWebSocketRuntime({
      server,
      pluginRuntime: {
        bindPaseoSessionHost(boundServer) {
          expect(boundServer).toBe(server);
          events.push("bind-plugins");
        },
        async start() {
          events.push("start-plugins");
        },
      },
      beforeAcceptingConnections: async () => {
        events.push("settle-providers-and-recovery");
      },
    });

    expect(events).toEqual([
      "bind-plugins",
      "start-plugins",
      "settle-providers-and-recovery",
      "accepting",
      "restore-utilities",
    ]);
  });

  test("keeps ingress paused when startup preparation fails", async () => {
    const events: string[] = [];
    await expect(
      startWebSocketRuntime({
        server: {
          beginAcceptingConnections() {
            events.push("accepting");
          },
          async restoreUtilityTerminals() {
            events.push("restore-utilities");
          },
        },
        pluginRuntime: {
          bindPaseoSessionHost() {},
          async start() {},
        },
        beforeAcceptingConnections: async () => {
          throw new Error("recovery unavailable");
        },
      }),
    ).rejects.toThrow("recovery unavailable");
    expect(events).toEqual([]);
  });
});
