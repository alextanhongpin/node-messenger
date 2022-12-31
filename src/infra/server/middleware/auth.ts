import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "types/error";

export function requireAuthHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!res.locals.userId) {
    throw new UnauthorizedError(req.ip);
  }

  return next();
}

export type Claims = {
  userId: string;
};

export function authHandler(secret: string) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers["authorization"];

      const token = authHeader?.split(" ")?.[1];
      if (token) {
        const { userId } = await verify<Claims>(secret, token);
        res.locals.userId = userId;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function sign<T extends object>(
  secret: string,
  params: T,
  expiresIn = "2d"
): Promise<string> {
  return new Promise((resolve, reject) => {
    jwt.sign(
      params,
      secret,
      { algorithm: "HS256", expiresIn },
      function (err: unknown, token: string | undefined) {
        if (err) return reject(err);
        if (!token) {
          return reject(new Error("failed to generate auth token"));
        }
        return resolve(token);
      }
    );
  });
}

export function verify<T>(secret: string, token: string): Promise<T> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, function (err: unknown, decoded: unknown) {
      err ? reject(err) : resolve(decoded as T);
    });
  });
}
