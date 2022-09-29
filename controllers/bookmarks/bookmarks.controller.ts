import express, { Request, Response, Router } from "express";
import { usersRef } from "../../db/firebase";

import { hasSession } from "../../middleware/hasSession";
import deleteBookmark from "./services/delete-bookmark.service";
import getBookmarks from "./services/get-bookmark.service";

const bookmarkRouter: Router = express.Router();

bookmarkRouter.get("/", hasSession, (req: Request, res: Response) => {
  return getBookmarks(req, res, usersRef);
});

bookmarkRouter.delete(
  "/:bookmarkedTweetId",
  hasSession,
  (req: Request, res: Response) => {
    return deleteBookmark(req, res, usersRef);
  }
);
export { bookmarkRouter };

