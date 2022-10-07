import { IsString, IsOptional, IsNotEmpty, IsUrl } from "class-validator";
export class UpdateCategoryAttributesDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  description?: string;

  @IsString()
  @IsUrl()
  @IsOptional()
  @IsNotEmpty()
  image?: string;
}
