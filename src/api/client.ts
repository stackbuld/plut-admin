const BASE_URL = "https://api-v2.plut.ng";
// const BASE_URL = "http://localhost:9090";

const SESSION_KEY = "plut-session";

type Session = { accessToken: string; userId: string };

function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const getAccessToken = (): string | null => getSession()?.accessToken ?? null;
export const getAdminUserId = (): string | null => getSession()?.userId ?? null;

type Envelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};

function forceLogout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.replace("/login");
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    forceLogout();
    throw new Error("Session expired. Redirecting to login…");
  }

  const envelope: Envelope<T> = await res.json();
  if (!res.ok || !envelope.success) {
    throw new Error(envelope.message ?? `HTTP ${res.status}`);
  }
  return envelope.data;
}

export const apiGet = <T>(path: string) => request<T>(path, { method: "GET" });

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    body: formData,
    // No Content-Type — browser sets multipart/form-data with boundary automatically
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) {
    forceLogout();
    throw new Error("Session expired. Redirecting to login…");
  }
  const envelope: Envelope<T> = await res.json();
  if (!res.ok || !envelope.success) throw new Error(envelope.message ?? `HTTP ${res.status}`);
  return envelope.data;
}

export const apiPost = <T>(path: string, body?: unknown) =>
  request<T>(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

export const apiPut = <T>(path: string, body?: unknown) =>
  request<T>(path, {
    method: "PUT",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

export const apiPatch = <T>(path: string, body?: unknown) =>
  request<T>(path, {
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

export const apiDelete = <T>(path: string, body?: unknown) =>
  request<T>(path, {
    method: "DELETE",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

function buildQs(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  }
  return qs.size ? `?${qs}` : "";
}

export { buildQs };
