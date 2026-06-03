import { generateVerifier, deriveChallenge } from "./pkce";

const AUTHORITY = "https://auth.plut.ng";
const CLIENT_ID = "375064387368517634";

const PKCE_VERIFIER_KEY = "pkce_verifier";
const PKCE_STATE_KEY = "pkce_state";

function callbackUri() {
  return `${window.location.origin}/auth/callback`;
}

export async function beginLogin(loginHint?: string) {
  const verifier = generateVerifier();
  const challenge = await deriveChallenge(verifier);
  const state = crypto.randomUUID();

  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(PKCE_STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: callbackUri(),
    response_type: "code",
    scope: "openid profile email",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    ...(loginHint ? { login_hint: loginHint } : {}),
  });

  const authUrl = `${AUTHORITY}/oauth/v2/authorize?${params}`;

  // Zitadel sends `X-Frame-Options: DENY` / `frame-ancestors 'none'`, so it
  // refuses to render inside any iframe (e.g. the Lovable preview).
  // Detect that case and break out of the frame instead of redirecting in-frame.
  const inIframe = typeof window !== "undefined" && window.self !== window.top;
  if (inIframe) {
    // Stash PKCE in localStorage so the popped-out tab can complete the exchange.
    // (sessionStorage is per-tab and would be lost.)
    try {
      localStorage.setItem(PKCE_VERIFIER_KEY, verifier);
      localStorage.setItem(PKCE_STATE_KEY, state);
    } catch {}
    // Try to navigate the top window; if blocked by cross-origin, open a new tab.
    try {
      if (window.top) {
        window.top.location.href = authUrl;
        return;
      }
    } catch {}
    window.open(authUrl, "_blank", "noopener,noreferrer");
    return;
  }

  window.location.href = authUrl;
}

export async function exchangeCode(code: string, returnedState: string | null): Promise<{
  access_token: string;
  id_token: string;
  refresh_token?: string;
}> {
  const verifier =
    sessionStorage.getItem(PKCE_VERIFIER_KEY) ??
    localStorage.getItem(PKCE_VERIFIER_KEY);
  const storedState =
    sessionStorage.getItem(PKCE_STATE_KEY) ??
    localStorage.getItem(PKCE_STATE_KEY);

  if (!verifier) throw new Error("PKCE verifier missing — session may have expired.");
  if (returnedState && storedState && returnedState !== storedState) {
    throw new Error("State mismatch — possible CSRF.");
  }

  const res = await fetch(`${AUTHORITY}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code,
      redirect_uri: callbackUri(),
      code_verifier: verifier,
    }),
  });

  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(PKCE_STATE_KEY);
  localStorage.removeItem(PKCE_VERIFIER_KEY);
  localStorage.removeItem(PKCE_STATE_KEY);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  return res.json();
}

export type IdTokenClaims = {
  sub: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  "urn:zitadel:iam:org:project:roles"?: Record<string, Record<string, string>>;
};

export function parseIdToken(idToken: string): IdTokenClaims {
  const payload = idToken.split(".")[1];
  const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(json);
}

const ADMIN_ROLES = ["admin", "Administrator", "ADMIN"];

export function isAdmin(claims: IdTokenClaims): boolean {
  const roles = claims["urn:zitadel:iam:org:project:roles"];
  if (!roles) return false;
  return Object.keys(roles).some((r) => ADMIN_ROLES.includes(r));
}

export function buildLogoutUrl(idTokenHint?: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    post_logout_redirect_uri: `${window.location.origin}/login`,
    ...(idTokenHint ? { id_token_hint: idTokenHint } : {}),
  });
  return `${AUTHORITY}/oidc/v1/end_session?${params}`;
}
