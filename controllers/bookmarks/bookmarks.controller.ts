import express, { Request, Response, Router } from "express";
import NodeCache from "node-cache";
import { usersRef } from "../../firebase/firebase";

import { hasSession } from "../../middleware/hasSession";
import deleteBookmark from "./services/delete-bookmark.service";
import getBookmarks from "./services/get-bookmark.service";

const bookmarkRouter: Router = express.Router();
export const bookmarkCache = new NodeCache();
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

