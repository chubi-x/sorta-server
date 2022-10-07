import { IsString, IsNotEmpty, IsOptional, IsUrl } from "class-validator";
export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsUrl()
  @IsOptional()
  image?: string;
}
