import { Controller, Get } from '@nestjs/common';
import { RelatoriosService } from './relatorios.service';

@Controller('relatorios')
export class RelatoriosController {
  constructor(private readonly relatoriosService: RelatoriosService) {}

  @Get('vendas')
  getVendas() {
    return this.relatoriosService.getRelatorioVendas();
  }

  @Get('estoque')
  getEstoque() {
    return this.relatoriosService.getRelatorioEstoque();
  }
}
