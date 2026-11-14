import { auth } from './firebase.ts';

let memoryFirebaseToken: string | null = null;

export function setMemoryFirebaseToken(token: string | null) {
  memoryFirebaseToken = token;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach Firebase ID token in memory if customer signed in with Google
  if (!headers.has('Authorization')) {
    if (auth.currentUser) {
      try {
        const freshToken = await auth.currentUser.getIdToken();
        memoryFirebaseToken = freshToken;
        headers.set('Authorization', `Bearer ${freshToken}`);
      } catch {
        if (memoryFirebaseToken) {
          headers.set('Authorization', `Bearer ${memoryFirebaseToken}`);
        }
      }
    } else if (memoryFirebaseToken) {
      headers.set('Authorization', `Bearer ${memoryFirebaseToken}`);
    }
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`) as Error & {
      status?: number;
      mustChangePassword?: boolean;
      existing?: unknown;
    };
    err.status = res.status;
    err.mustChangePassword = data.mustChangePassword;
    err.existing = data.existing;
    throw err;
  }
  return data as T;
}

export function formatPKR(amount: number | null | undefined): string {
  const val = Number(amount || 0);
  return `PKR ${val.toLocaleString('en-PK')}`;
}
