type CredentialsLoginResult =
  | { ok: true }
  | { ok: false; reason: "invalid_credentials" | "pending_approval" | "network" };

function resolveCallbackUrl(callbackUrl: string): string {
  if (callbackUrl.startsWith("http://") || callbackUrl.startsWith("https://")) {
    return callbackUrl;
  }
  const path = callbackUrl.startsWith("/") ? callbackUrl : `/${callbackUrl}`;
  return `${window.location.origin}${path}`;
}

function parseAuthError(redirectUrl: string): string | null {
  try {
    return new URL(redirectUrl, window.location.origin).searchParams.get("error");
  } catch {
    return null;
  }
}

/** Login con credenciales vía API de NextAuth (sin depender de signIn/getProviders). */
export async function credentialsLogin(
  email: string,
  password: string,
  callbackUrl = "/",
): Promise<CredentialsLoginResult> {
  const targetUrl = resolveCallbackUrl(callbackUrl);

  let csrfToken: string;
  try {
    const csrfRes = await fetch("/api/auth/csrf", { cache: "no-store" });
    if (!csrfRes.ok) return { ok: false, reason: "network" };
    const csrfData = (await csrfRes.json()) as { csrfToken?: string };
    if (!csrfData.csrfToken) return { ok: false, reason: "network" };
    csrfToken = csrfData.csrfToken;
  } catch {
    return { ok: false, reason: "network" };
  }

  let redirectUrl: string;
  try {
    const res = await fetch("/api/auth/callback/credentials", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Auth-Return-Redirect": "1",
      },
      body: new URLSearchParams({
        csrfToken,
        email,
        password,
        callbackUrl: targetUrl,
      }),
    });

    const data = (await res.json()) as { url?: string };
    redirectUrl = data.url ?? targetUrl;
  } catch {
    return { ok: false, reason: "network" };
  }

  const authError = parseAuthError(redirectUrl);
  if (authError === "CuentaPendienteAprobacion") {
    return { ok: false, reason: "pending_approval" };
  }
  if (authError) {
    return { ok: false, reason: "invalid_credentials" };
  }

  window.location.assign(redirectUrl);
  return { ok: true };
}
