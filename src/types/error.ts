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

export type ForbiddenErrorParams = {
  userId: string;
  entity: string;
  entityId: string;
};

export class ForbiddenError extends AppError<ForbiddenErrorParams> {
  constructor(
    { userId, entity, entityId }: ForbiddenErrorParams,
    options?: ErrorOptions
  ) {
    super("You do not have access to the given resource", options);
    this.kind = ErrorKind.Forbidden;
    this.code = "entity.forbidden";
    this.params = { userId, entity, entityId };
  }
}

export class UnauthorizedError extends AppError<string> {
  constructor(ipAddress: string, options?: ErrorOptions) {
    super("You need to login to proceed", options);
    this.kind = ErrorKind.Unauthorized;
    this.code = "api.unauthorized";
    this.params = ipAddress;
  }
}

export class NotFoundError extends AppError<{
  where: Record<string, unknown>;
  entity: string;
}> {
  constructor(
    entity: string,
    where: Record<string, unknown>,
    options?: ErrorOptions
  ) {
    super(`${entity} not found`, options);
    this.kind = ErrorKind.NotFound;
    this.code = "entity.not_found";
    this.params = { entity, where };
  }
}

export class RequiredFieldError extends AppError<string> {
  constructor(field: string, options?: ErrorOptions) {
    super(`field "${field}" is required`, options);
    this.kind = ErrorKind.BadInput;
    this.code = "field.required";
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
