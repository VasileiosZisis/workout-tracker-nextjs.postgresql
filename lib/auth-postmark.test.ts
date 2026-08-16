import { vi } from "vitest";
import { sendPostmarkVerificationRequest } from "./auth-postmark";

const params = {
  apiKey: "server-secret-token",
  from: "Workout Trackr <admin@workouttrackr.com>",
  to: "private@example.com",
  url: "https://www.workouttrackr.com/api/auth/callback/email?token=secret",
  theme: {},
};

function createLogger() {
  return {
    info: vi.fn<(message: string) => void>(),
    error: vi.fn<(message: string) => void>(),
  };
}

describe("Postmark verification request diagnostics", () => {
  it("logs the accepted response ID and a safe token fingerprint", async () => {
    const logger = createLogger();
    const fetchMock = vi.fn(
      async (
        _input: Parameters<typeof fetch>[0],
        _init?: Parameters<typeof fetch>[1],
      ) =>
        Response.json({
          ErrorCode: 0,
          Message: "OK",
          MessageID: "message-id-123",
          To: params.to,
        }),
    );

    await sendPostmarkVerificationRequest(params, {
      fetchImpl: fetchMock as unknown as typeof fetch,
      logger,
      now: () => 100,
    });

    const requestBody = JSON.parse(
      String(fetchMock.mock.calls[0]![1]?.body),
    );
    expect(requestBody.HtmlBody).toContain("Sign in to");
    expect(requestBody.HtmlBody).toContain(
      'src="https://www.workouttrackr.com/brand/wt-logo.png"',
    );
    expect(requestBody.HtmlBody).toContain('alt="Workout Trackr"');
    expect(requestBody.HtmlBody).not.toContain(
      "Sign in to <strong>www&#8203;.workouttrackr&#8203;.com</strong>",
    );

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledOnce();

    const event = JSON.parse(logger.info.mock.calls[0]![0]);
    expect(event).toMatchObject({
      event: "auth.postmark.send",
      outcome: "accepted",
      httpStatus: 200,
      postmarkErrorCode: 0,
      postmarkMessageId: "message-id-123",
      tokenMode: "server",
    });
    expect(event.tokenFingerprint).toMatch(/^[a-f0-9]{12}$/);

    const serializedEvent = JSON.stringify(event);
    expect(serializedEvent).not.toContain(params.apiKey);
    expect(serializedEvent).not.toContain(params.to);
    expect(serializedEvent).not.toContain(params.url);
    expect(serializedEvent).not.toContain(params.from);
  });

  it("identifies Postmark's non-delivering test token", async () => {
    const logger = createLogger();
    const fetchImpl = vi.fn(async () =>
      Response.json({ ErrorCode: 0, Message: "OK", MessageID: "test-id" }),
    ) as unknown as typeof fetch;

    await sendPostmarkVerificationRequest(
      { ...params, apiKey: "POSTMARK_API_TEST" },
      { fetchImpl, logger },
    );

    const event = JSON.parse(logger.info.mock.calls[0]![0]);
    expect(event.tokenMode).toBe("test");
  });

  it("rejects a Postmark error even when the HTTP response is successful", async () => {
    const logger = createLogger();
    const fetchImpl = vi.fn(async () =>
      Response.json({ ErrorCode: 300, Message: "Invalid sender" }),
    ) as unknown as typeof fetch;

    await expect(
      sendPostmarkVerificationRequest(params, { fetchImpl, logger }),
    ).rejects.toThrow("Postmark send failed with HTTP 200.");

    expect(logger.info).not.toHaveBeenCalled();
    const event = JSON.parse(logger.error.mock.calls[0]![0]);
    expect(event).toMatchObject({
      outcome: "rejected",
      httpStatus: 200,
      postmarkErrorCode: 300,
      postmarkMessageId: null,
    });
  });
});
