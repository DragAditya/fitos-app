export type ActionResult<T = undefined> =
  | { ok: true; message: string; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
