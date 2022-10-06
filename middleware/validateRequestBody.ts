import { Request, Response, NextFunction } from "express";
import { validate } from "class-validator";
import {
  bookmarkUpdateType,
  CreateCategoryDto,
  UpdateCategoryAttributesDto,
  UpdateCategoryBookmarksDto,
} from "../controllers/categories/dto";
import { ResponseHandler } from "../services";

/**
 * Function to validate request bodies
 * @param {CreateCategory | UpdateCategoryAttributes} dto - The dto object
 * @returns {object} response object
 */
export function validateRequestBody(
  dto:
    | CreateCategoryDto
    | UpdateCategoryAttributesDto
    | UpdateCategoryBookmarksDto
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
    } else if (dto instanceof UpdateCategoryBookmarksDto) {
      const updateType: bookmarkUpdateType = req.body.updateType;
      const bookmarksToUpdate: string[] = req.body.bookmarks;
      dto.updateType = updateType;
      dto.bookmarksToUpdate = bookmarksToUpdate;
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
