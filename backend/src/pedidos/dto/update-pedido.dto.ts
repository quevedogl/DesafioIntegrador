import { IsOptional, IsString, IsIn, Length } from 'class-validator';

const STATUS_VALIDOS = ['Pendente', 'Confirmado', 'Enviado', 'Entregue', 'Cancelado'] as const;

export class UpdatePedidoDto {
  @IsOptional()
  @IsString()
  @IsIn(STATUS_VALIDOS, { message: 'Status inválido.' })
  status?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100, { message: 'A categoria deve ter entre 2 e 100 caracteres.' })
  categoria?: string;
}
