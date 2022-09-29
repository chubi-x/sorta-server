import express, { Request, Response, Router } from "express";
import { usersRef } from "../../db/firebase";
import { hasSession } from "../../middleware/index";
import {
  getCategories,
  createCategory,
  updateCategoryAttributes,
  updateCategoryBookmarks,
  deleteCategory,
} from "./services/index";

const categoryRouter: Router = express.Router();

categoryRouter.get("/", hasSession, async (req: Request, res: Response) => {
  return await getCategories(req, res, usersRef);
});

categoryRouter.post("/", hasSession, async (req: Request, res: Response) => {
  return await createCategory(req, res, usersRef);
});
// update attributes
categoryRouter.patch(
  "/:categoryId",
  hasSession,
  async (req: Request, res: Response) => {
    return await updateCategoryAttributes(req, res, usersRef);
  }
);
// update bookmarks
categoryRouter.patch(
  "/:categoryId/bookmarks",
  hasSession,
  async (req: Request, res: Response) => {
    return await updateCategoryBookmarks(req, res, usersRef);
  }
);

categoryRouter.delete(
  "/:categoryId",
  hasSession,
  async (req: Request, res: Response) => {
    return await deleteCategory(req, res, usersRef);
  }
);
export { categoryRouter };

