import { createHash } from "node:crypto";

interface PostmarkTheme {
  brandColor?: string;
  buttonText?: string;
}

interface SendPostmarkVerificationRequestParams {
  apiKey: string;
  from: string;
  to: string;
  url: string;
  theme: PostmarkTheme;
}

interface PostmarkResponseBody {
  ErrorCode?: number;
  MessageID?: string;
}

interface PostmarkLogger {
  info(message: string): void;
  error(message: string): void;
}

interface PostmarkDependencies {
  fetchImpl?: typeof fetch;
  logger?: PostmarkLogger;
  now?: () => number;
}

function tokenFingerprint(apiKey: string) {
  return createHash("sha256").update(apiKey).digest("hex").slice(0, 12);
}

function emailHtml({
  url,
  host,
  theme,
}: {
  url: string;
  host: string;
  theme: PostmarkTheme;
}) {
  const brandColor = theme.brandColor || "#346df1";
  const buttonText = theme.buttonText || "#fff";
  const logoUrl = `https://${host}/brand/wt-logo.png`;

  return `
<body style="background: #f9f9f9;">
  <table width="100%" border="0" cellspacing="20" cellpadding="0"
    style="background: #fff; max-width: 600px; margin: auto; border-radius: 10px;">
    <tr>
      <td align="center"
        style="padding: 10px 0px 8px; font-size: 22px; font-family: Helvetica, Arial, sans-serif; color: #444;">
        Sign in to
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 0px 20px 10px;">
        <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center">
          <tr>
            <td align="center" bgcolor="#111827"
              style="padding: 12px 16px; border-radius: 8px;">
              <img src="${logoUrl}" alt="Workout Trackr" width="280"
                style="display: block; width: 100%; max-width: 280px; height: auto; margin: 0 auto; border: 0;" />
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="border-radius: 5px;" bgcolor="${brandColor}"><a href="${url}"
                target="_blank"
                style="font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${buttonText}; text-decoration: none; border-radius: 5px; padding: 10px 20px; border: 1px solid ${brandColor}; display: inline-block; font-weight: bold;">Sign
                in</a></td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center"
        style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: #444;">
        If you did not request this email you can safely ignore it.
      </td>
    </tr>
  </table>
</body>
`;
}

function emailText({ url, host }: { url: string; host: string }) {
  return `Sign in to ${host}\n${url}\n\n`;
}

async function responseBody(response: Response) {
  try {
    return (await response.json()) as PostmarkResponseBody;
  } catch {
    return null;
  }
}

export async function sendPostmarkVerificationRequest(
  params: SendPostmarkVerificationRequestParams,
  dependencies: PostmarkDependencies = {},
) {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const logger = dependencies.logger ?? console;
  const now = dependencies.now ?? Date.now;
  const startedAt = now();
  const fingerprint = tokenFingerprint(params.apiKey);
  const tokenMode =
    params.apiKey === "POSTMARK_API_TEST" ? "test" : "server";
  const host = new URL(params.url).host;

  let response: Response;

  try {
    response = await fetchImpl("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": params.apiKey,
      },
      body: JSON.stringify({
        From: params.from,
        To: params.to,
        Subject: `Sign in to ${host}`,
        TextBody: emailText({ url: params.url, host }),
        HtmlBody: emailHtml({ url: params.url, host, theme: params.theme }),
        MessageStream: "outbound",
      }),
    });
  } catch (error) {
    logger.error(
      JSON.stringify({
        level: "error",
        event: "auth.postmark.send",
        outcome: "network_error",
        tokenFingerprint: fingerprint,
        tokenMode,
        errorName: error instanceof Error ? error.name : "UnknownError",
        durationMs: now() - startedAt,
      }),
    );
    throw error;
  }

  const body = await responseBody(response);
  const postmarkErrorCode =
    typeof body?.ErrorCode === "number" ? body.ErrorCode : null;
  const postmarkMessageId =
    typeof body?.MessageID === "string" ? body.MessageID : null;
  const accepted =
    response.ok && (postmarkErrorCode === null || postmarkErrorCode === 0);
  const log = JSON.stringify({
    level: accepted ? "info" : "error",
    event: "auth.postmark.send",
    outcome: accepted ? "accepted" : "rejected",
    httpStatus: response.status,
    postmarkErrorCode,
    postmarkMessageId,
    tokenFingerprint: fingerprint,
    tokenMode,
    durationMs: now() - startedAt,
  });

  if (accepted) {
    logger.info(log);
    return;
  }

  logger.error(log);
  throw new Error(`Postmark send failed with HTTP ${response.status}.`);
}
