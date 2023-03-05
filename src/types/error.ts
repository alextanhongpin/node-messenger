export const enum ErrorKind {
  AlreadyExists = "already_exists",
  BadInput = "bad_input",
  Conflict = "conflict",
  Forbidden = "forbidden",
  Internal = "internal",
  NotFound = "not_found",
  Unauthorized = "unauthorized",
  Unknown = "unknown",
  Unprocessable = "unprocessable",
}

type ErrorCode = string;

export abstract class AppError<T> extends Error {
  kind: ErrorKind = ErrorKind.Unknown;
  code: ErrorCode = "unknown";
  params: T = {} as T;

  // Only works if using target ES2022?: ErrorOptions is a built-in type.
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      kind: this.kind,
      message: this.message,
      params: this.params,
    };
  }
}

export class RequiredFieldError extends AppError<string> {
  constructor(field: string, options?: ErrorOptions) {
    super(`field "${field}" is required`, options);
    this.kind = ErrorKind.BadInput;
    this.code = "app.required";
    this.params = field;
  }
}

export function validateRequiredFields(obj: Record<string, unknown>) {
  for (const key in obj) {
    // For string, number or boolean, it must not be  null or undefined.
    if (obj[key] === null || obj[key] === undefined) {
      throw new RequiredFieldError(key);
    }

    // For arrays, the length must not be 0.
    if (Array.isArray(obj[key]) && !(obj[key] as Array<unknown>).length) {
      throw new RequiredFieldError(key);
    }

    // NOTE: Do we need to check for objects? Probably not.
  }
}
