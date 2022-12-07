import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  ValidateIf,
  isHexColor,
} from "class-validator";
export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsUrl()
  @ValidateIf((category) => !isHexColor(category.image))
  @IsOptional()
  image?: string;
}

