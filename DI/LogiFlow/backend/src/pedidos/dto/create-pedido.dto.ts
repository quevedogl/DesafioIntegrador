import {
  IsUUID,
  IsOptional,
  IsString,
  Length,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateItemDto {
  @IsUUID('4', { message: 'ID de produto inválido.' })
  produtoId: string;

  @Type(() => Number)
  @IsInt({ message: 'A quantidade deve ser um número inteiro.' })
  @Min(1, { message: 'A quantidade mínima por item é 1.' })
  quantidade: number;
}

export class CreatePedidoDto {
  @IsUUID('4', { message: 'ID de cliente inválido.' })
  clienteId: string;

  @IsOptional()
  @IsString()
  @Length(2, 100, { message: 'A categoria deve ter entre 2 e 100 caracteres.' })
  categoria?: string;

  @IsArray({ message: 'O pedido deve conter itens.' })
  @ArrayMinSize(1, { message: 'O pedido deve ter ao menos um item.' })
  @ValidateNested({ each: true })
  @Type(() => CreateItemDto)
  itens: CreateItemDto[];
}
