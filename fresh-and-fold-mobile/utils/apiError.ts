/** Stable, client-safe HTTP metadata. It intentionally carries no token/body. */
export class ApiRequestError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, options: { status?: number; code?: string } = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options.status;
    this.code = options.code;
  }
}
