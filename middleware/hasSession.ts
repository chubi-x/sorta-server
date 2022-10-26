import { Request, Response, NextFunction } from "express";
import { ResponseHandler } from "../services";
//  session checker middleware
export function hasSession(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return ResponseHandler.clientError(res, "User not logged in.");
  } else {
    return next();
  }
}

