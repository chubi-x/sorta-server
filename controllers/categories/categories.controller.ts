import express, { Request, Response, Router } from "express";
import { usersRef } from "../../db/firebase";
import { hasSession, validateRequestBody } from "../../middleware";
import {
  CreateCategoryDto,
  UpdateCategoryAttributesDto,
  AddBookmarksToCategoryDto,
  DeleteBookmarksFromCategoryDto,
} from "./dto";
import {
  getCategories,
  createCategory,
  updateCategoryAttributes,
  addBookmarksToCategory,
  deleteBookmarksFromCategory,
  deleteCategory,
} from "./services/index";

const categoryRouter: Router = express.Router();

categoryRouter.get("/", hasSession, async (req: Request, res: Response) => {
  return await getCategories(req, res, usersRef);
});

categoryRouter.post(
  "/",
  hasSession,
  validateRequestBody(new CreateCategoryDto()),
  async (req: Request, res: Response) => {
    return await createCategory(req, res, usersRef);
  }
);
// update attributes
categoryRouter.patch(
  "/:categoryId",
  hasSession,
  validateRequestBody(new UpdateCategoryAttributesDto()),
  async (req: Request, res: Response) => {
    return await updateCategoryAttributes(req, res, usersRef);
  }
);
// add bookmarks to category
categoryRouter.patch(
  "/:categoryId/bookmarks/add",
  hasSession,
  validateRequestBody(new AddBookmarksToCategoryDto()),
  async (req: Request, res: Response) => {
    return await addBookmarksToCategory(req, res, usersRef);
  }
);
// remove bookmarks from category
categoryRouter.patch(
  "/:categoryId/bookmarks/delete",
  hasSession,
  validateRequestBody(new DeleteBookmarksFromCategoryDto()),
  async (req: Request, res: Response) => {
    return await deleteBookmarksFromCategory(req, res, usersRef);
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

