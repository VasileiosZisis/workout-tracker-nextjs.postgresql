const DEFAULT_REDIRECT = "/logs";
const INTERNAL_ORIGIN = "https://workout-trackr.local";

export function getSafeRedirectTo(
  callbackUrl: string | string[] | undefined,
) {
  const candidate = Array.isArray(callbackUrl) ? callbackUrl[0] : callbackUrl;

  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return DEFAULT_REDIRECT;
  }

  try {
    const url = new URL(candidate, INTERNAL_ORIGIN);

    if (url.origin !== INTERNAL_ORIGIN) {
      return DEFAULT_REDIRECT;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_REDIRECT;
  }
}
