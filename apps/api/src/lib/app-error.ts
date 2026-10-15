export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }

  static badRequest(message = "Bad request", code = "BAD_REQUEST") {
    return new AppError(400, code, message);
  }
  static unauthorized(message = "Authentication required", code = "UNAUTHORIZED") {
    return new AppError(401, code, message);
  }
  static forbidden(message = "You do not have access to this resource", code = "FORBIDDEN") {
    return new AppError(403, code, message);
  }
  static notFound(message = "Not found", code = "NOT_FOUND") {
    return new AppError(404, code, message);
  }
}
