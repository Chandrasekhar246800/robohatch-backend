import { IsNotEmpty, IsString, IsNumber, IsIn, Min, MaxLength, IsUrl } from 'class-validator';

export class CreateProductModelDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @IsNotEmpty()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  fileUrl!: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['STL', 'OBJ', 'stl', 'obj'])
  fileType!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  fileSize!: number;
}

