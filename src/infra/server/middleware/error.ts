import { NextFunction, Request, Response } from "express";
import { AppError, ErrorKind } from "types/error";

// NOTE: This must be attached last.
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (res.headersSent) {
    return next(err);
  }

  // TODO: Improve logging.
  console.log(err);
  if (err instanceof AppError) {
    return res.status(statusCode(err.kind)).json({ error: err });
  }

  res.status(500).json({ error: "An unexpected error has occured" });
}

function statusCode(kind: ErrorKind): number {
  switch (kind) {
    case ErrorKind.AlreadyExists:
      return 422;
    case ErrorKind.BadInput:
      return 400;
    case ErrorKind.Conflict:
      return 409;
    case ErrorKind.Forbidden:
      return 403;
    case ErrorKind.Internal:
      return 500;
    case ErrorKind.NotFound:
      return 404;
    case ErrorKind.Unauthorized:
      return 401;
    case ErrorKind.Unknown:
      return 500;
    case ErrorKind.Unprocessable:
      return 422;
    default:
      throw new Error(`unknown error kind: ${kind}`);
  }
}
