import { IsNotEmpty, IsString, IsNumber, Min, MaxLength } from 'class-validator';

export class CreateMaterialDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price!: number;
}

