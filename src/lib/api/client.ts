import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./schema";

type TokenGetter = () => Promise<string | null>;
let getToken: TokenGetter = async () => null;

/** Called once by the auth bridge so every request carries the current Clerk session token. */
export const setTokenGetter = (fn: TokenGetter) => {
  getToken = fn;
};

let markReady: () => void = () => {};
const authReady = new Promise<void>((resolve) => (markReady = resolve));

/** Called once Clerk has loaded; requests wait for this so none goes out without a token. */
export const markAuthReady = () => markReady();

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
    readonly traceId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const auth: Middleware = {
  async onRequest({ request }) {
    await authReady;
    const token = await getToken();
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    request.headers.set("x-request-id", crypto.randomUUID());
    return request;
  },
};

/** The only HTTP client in the app; paths and payloads are typed from the backend's OpenAPI spec. */
export const api = createClient<paths>({ baseUrl: process.env.NEXT_PUBLIC_API_URL });
api.use(auth);

type ErrorBody = { error?: { code?: string; message?: string; details?: Record<string, unknown>; traceId?: string } };

/** Return the data or throw an ApiError carrying the backend's user-safe message. */
export async function unwrap<T>(call: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  let res: { data?: T; error?: unknown; response: Response };
  try {
    res = await call;
  } catch {
    throw new ApiError(0, "network", "Can't reach the server. Check your connection and try again.");
  }
  if (!res.response.ok || res.error) {
    const e = (res.error as ErrorBody | undefined)?.error;
    throw new ApiError(res.response.status, e?.code ?? "unknown", e?.message ?? "Something went wrong.", e?.details, e?.traceId);
  }
  return res.data as T;
}
