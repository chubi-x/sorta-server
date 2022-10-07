import { IsNotEmpty, IsArray, IsString } from "class-validator";

export class DeleteBookmarksFromCategoryDto {
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  // an array of bookmark ids to delete
  bookmarkIdsToDelete!: string[];
}
