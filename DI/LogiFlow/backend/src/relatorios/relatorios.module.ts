import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pedido } from '../pedidos/pedido.entity';
import { Produto } from '../produtos/produto.entity';
import { RelatoriosService } from './relatorios.service';
import { RelatoriosController } from './relatorios.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Pedido, Produto])],
  controllers: [RelatoriosController],
  providers: [RelatoriosService],
})
export class RelatoriosModule {}
