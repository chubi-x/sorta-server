import { IsNotEmpty, IsString, IsArray } from "class-validator";

export class AddBookmarksToCategoryDto {
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  // an array of tweet ids to add
  bookmarksToAdd!: string[];
}

