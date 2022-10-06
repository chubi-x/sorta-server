import { IsNotEmpty, IsString, IsArray } from "class-validator";

export enum bookmarkUpdateType {
  ADD = "add",
  DELETE = "delete",
}
export class UpdateCategoryBookmarksDto {
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  bookmarksToUpdate!: string[];

  @IsNotEmpty()
  @IsString()
  updateType!: bookmarkUpdateType;
}
