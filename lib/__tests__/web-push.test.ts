import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue(undefined),
  },
}));

import webPush from "web-push";
import { sendPushNotification } from "../web-push";

describe("sendPushNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends with high urgency so the push isn't batched/delayed by iOS", async () => {
    await sendPushNotification(
      { endpoint: "https://web.push.apple.com/x", p256dh: "p", auth: "a" },
      { title: "Pasta", body: "ready" },
    );

    expect(webPush.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "https://web.push.apple.com/x" }),
      expect.any(String),
      expect.objectContaining({ urgency: "high", TTL: 86_400 }),
    );
  });
});
