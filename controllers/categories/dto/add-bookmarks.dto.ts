import { IsNotEmpty, IsString, IsArray } from "class-validator";

export class AddBookmarksToCategoryDto {
  @IsNotEmpty()
  @IsArray()
  // an array of tweets to add
  bookmarksToAdd!: Bookmark[];
}

