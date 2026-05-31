import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateClienteDto {
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @IsString()
  @Length(2, 150, { message: 'O nome deve ter entre 2 e 150 caracteres.' })
  nome: string;

  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  @IsNotEmpty({ message: 'A cidade é obrigatória.' })
  @IsString()
  @Length(2, 100)
  cidade: string;

  @IsNotEmpty({ message: 'O estado é obrigatório.' })
  @IsString()
  @Length(2, 2, { message: 'O estado deve ter a sigla de 2 letras (ex.: SP).' })
  estado: string;

  @IsNotEmpty({ message: 'O país é obrigatório.' })
  @IsString()
  @Length(2, 100)
  pais: string;
}
