import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pedido } from '../pedidos/pedido.entity';
import { Cliente } from '../clientes/cliente.entity';
import { Produto } from '../produtos/produto.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Pedido, Cliente, Produto])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
