import { Request, Response, NextFunction } from "express";
import { validate } from "class-validator";
import {
  CreateCategoryDto,
  UpdateCategoryAttributesDto,
  AddBookmarksToCategoryDto,
  DeleteBookmarksFromCategoryDto,
} from "../controllers/categories/dto";
import { ResponseHandler } from "../services";

/**
 * Function to validate request bodies
 * @param {CreateCategoryDto | UpdateCategoryAttributesDto | AddBookmarkToCategoryDto } dto - The dto object
 * @returns {object} response object
 */
export function validateRequestBody(
  dto:
    | CreateCategoryDto
    | UpdateCategoryAttributesDto
    | AddBookmarksToCategoryDto
    | DeleteBookmarksFromCategoryDto
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (
      dto instanceof CreateCategoryDto ||
      dto instanceof UpdateCategoryAttributesDto
    ) {
      const { name, description, image } = req.body;
      dto.name = name;
      dto.description = description;
      dto.image = image;
    } else if (dto instanceof AddBookmarksToCategoryDto) {
      const bookmarksToAdd: string[] = req.body.bookmarks;
      dto.bookmarksToAdd = bookmarksToAdd;
    } else if (dto instanceof DeleteBookmarksFromCategoryDto) {
      const bookmarkIdsToDelete: string[] = req.body.bookmarkIds;
      dto.bookmarkIdsToDelete = bookmarkIdsToDelete;
    }
    const validationErrors = await validate(dto, {
      validationError: { target: false },
      forbidUnknownValues: true,
    });
    if (validationErrors.length) {
      return ResponseHandler.clientError(res, validationErrors);
    } else next();
  };
}

