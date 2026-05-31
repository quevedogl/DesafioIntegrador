import {
  IsNotEmpty,
  IsString,
  Length,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProdutoDto {
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @IsString()
  @Length(2, 150, { message: 'O nome deve ter entre 2 e 150 caracteres.' })
  nome: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'O preço deve ser um número.' })
  @IsPositive({ message: 'O preço deve ser maior que zero.' })
  preco: number;

  @Type(() => Number)
  @IsInt({ message: 'O estoque deve ser um número inteiro.' })
  @Min(0, { message: 'O estoque não pode ser negativo.' })
  estoque: number;

  @IsOptional()
  @IsString()
  @Length(2, 100, { message: 'A categoria deve ter entre 2 e 100 caracteres.' })
  categoria?: string;
}
