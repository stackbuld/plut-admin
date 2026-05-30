import { generateVerifier, deriveChallenge } from "./pkce";

const AUTHORITY = "http://62.171.136.156:9061";
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

  window.location.href = `${AUTHORITY}/oauth/v2/authorize?${params}`;
}

export async function exchangeCode(code: string, returnedState: string | null): Promise<{
  access_token: string;
  id_token: string;
  refresh_token?: string;
}> {
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  const storedState = sessionStorage.getItem(PKCE_STATE_KEY);

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

export function isAdmin(claims: IdTokenClaims): boolean {
  const roles = claims["urn:zitadel:iam:org:project:roles"];
  return roles ? Object.keys(roles).includes("admin") : false;
}

export function buildLogoutUrl(idTokenHint?: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    post_logout_redirect_uri: `${window.location.origin}/login`,
    ...(idTokenHint ? { id_token_hint: idTokenHint } : {}),
  });
  return `${AUTHORITY}/oidc/v1/end_session?${params}`;
}
