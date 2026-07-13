import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  const digest =
    typeof error === "object" && error && "digest" in error
      ? String(error.digest)
      : undefined;
  const errorName = error instanceof Error ? error.name : "UnknownError";

  console.error("Unhandled request error", {
    digest,
    errorName,
    method: request.method,
    path: request.path,
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
