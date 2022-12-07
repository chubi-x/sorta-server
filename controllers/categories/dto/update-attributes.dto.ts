import { IsString, IsOptional, IsNotEmpty, IsUrl } from "class-validator";
export class UpdateCategoryAttributesDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsUrl()
  @IsOptional()
  image?: string;
}

