import { Request, Response, NextFunction } from "express";

//  session checker middleware
export function hasSession(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.redirect("/authorize");
  } else {
    return next();
  }
}

