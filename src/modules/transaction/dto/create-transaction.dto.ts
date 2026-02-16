import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class DetailDTO {
  @IsNumber()
  itemId!: number;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  totalAmount!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateTransactionDTO {
  @IsNumber()
  totalAmount!: number;

  @IsNumber()
  adminFee!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetailDTO)
  details?: DetailDTO[];

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;
}