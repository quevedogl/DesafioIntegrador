import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pedido } from './pedido.entity';
import { PedidoItem } from './pedido-item.entity';
import { Produto } from '../produtos/produto.entity';
import { Cliente } from '../clientes/cliente.entity';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';

@Injectable()
export class PedidosService {
  constructor(
    @InjectRepository(Pedido) private readonly pedidoRepo: Repository<Pedido>,
    @InjectRepository(PedidoItem) private readonly itemRepo: Repository<PedidoItem>,
    @InjectRepository(Produto) private readonly produtoRepo: Repository<Produto>,
    @InjectRepository(Cliente) private readonly clienteRepo: Repository<Cliente>,
  ) {}

  async create(dto: CreatePedidoDto): Promise<Pedido> {
    const cliente = await this.clienteRepo.findOneBy({ id: dto.clienteId });
    if (!cliente) throw new NotFoundException('Cliente não encontrado.');

    const itens: PedidoItem[] = [];
    for (const itemDto of dto.itens) {
      const produto = await this.produtoRepo.findOneBy({ id: itemDto.produtoId });
      if (!produto) {
        throw new BadRequestException(`Produto "${itemDto.produtoId}" não encontrado.`);
      }
      const item = this.itemRepo.create({
        produto,
        quantidade: itemDto.quantidade,
        precoUnitario: produto.preco,
      });
      itens.push(item);
    }

    const pedido = this.pedidoRepo.create({
      cliente,
      itens,
      categoria: dto.categoria ?? null,
      status: 'Pendente',
    });

    return this.pedidoRepo.save(pedido);
  }

  findAll(): Promise<Pedido[]> {
    return this.pedidoRepo.find({ order: { criadoEm: 'DESC' } });
  }

  async findOne(id: string): Promise<Pedido> {
    const pedido = await this.pedidoRepo.findOneBy({ id });
    if (!pedido) throw new NotFoundException('Pedido não encontrado.');
    return pedido;
  }

  async update(id: string, dto: UpdatePedidoDto): Promise<Pedido> {
    const pedido = await this.findOne(id);
    if (dto.status) pedido.status = dto.status as import('./pedido.entity').StatusPedido;
    if (dto.categoria !== undefined) pedido.categoria = dto.categoria || null;
    return this.pedidoRepo.save(pedido);
  }

  async remove(id: string): Promise<void> {
    const pedido = await this.findOne(id);
    await this.pedidoRepo.remove(pedido);
  }
}
