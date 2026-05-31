import { IsOptional, IsString, IsIn } from 'class-validator';

const STATUS_VALIDOS = ['Pendente', 'Confirmado', 'Enviado', 'Entregue', 'Cancelado'] as const;

export class UpdatePedidoDto {
  @IsOptional()
  @IsString()
  @IsIn(STATUS_VALIDOS, { message: 'Status inválido.' })
  status?: string;

  @IsOptional()
  @IsString()
  categoria?: string;
}
