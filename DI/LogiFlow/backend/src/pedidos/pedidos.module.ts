import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pedido } from './pedido.entity';
import { PedidoItem } from './pedido-item.entity';
import { Produto } from '../produtos/produto.entity';
import { Cliente } from '../clientes/cliente.entity';
import { PedidosService } from './pedidos.service';
import { PedidosController } from './pedidos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Pedido, PedidoItem, Produto, Cliente])],
  controllers: [PedidosController],
  providers: [PedidosService],
})
export class PedidosModule {}
