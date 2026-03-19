/**
 * Domain error hierarchy.
 * Services throw these; withHandler() converts them to HTTP responses.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper prototype chain in transpiled ES5
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Not authenticated") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class LockedError extends AppError {
  constructor(message = "Resource is locked") {
    super(message, 423);
  }
}

export class UnprocessableError extends AppError {
  constructor(message: string) {
    super(message, 422);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

/**
 * Validates that `id` is a syntactically valid MongoDB ObjectId string.
 * Throws a 400 ValidationError if not, preventing downstream Mongoose
 * `CastError` exceptions and potential injection risks.
 */
export function assertObjectId(id: string | undefined | null, field = "id"): asserts id is string {
  const { isValidObjectId } = require("mongoose");
  if (!id || !isValidObjectId(id)) {
    throw new ValidationError(`Invalid ${field}: must be a valid ObjectId`);
  }
}
