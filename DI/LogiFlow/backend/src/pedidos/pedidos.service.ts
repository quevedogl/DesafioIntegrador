import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pedido, StatusPedido } from './pedido.entity';
import { PedidoItem } from './pedido-item.entity';
import { Produto } from '../produtos/produto.entity';
import { Cliente } from '../clientes/cliente.entity';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';

// Statuses in which the order holds reserved stock
const STATUSES_COM_ESTOQUE: StatusPedido[] = ['Pendente', 'Confirmado', 'Enviado'];

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

    // Aggregate quantities per product to handle duplicate items in one order
    const qtdPorProduto = new Map<string, { produto: Produto; quantidade: number }>();
    for (const itemDto of dto.itens) {
      const entry = qtdPorProduto.get(itemDto.produtoId);
      if (entry) {
        entry.quantidade += itemDto.quantidade;
      } else {
        const produto = await this.produtoRepo.findOneBy({ id: itemDto.produtoId });
        if (!produto) {
          throw new BadRequestException(`Produto "${itemDto.produtoId}" não encontrado.`);
        }
        qtdPorProduto.set(itemDto.produtoId, { produto, quantidade: itemDto.quantidade });
      }
    }

    // Validate all stock at once before changing anything
    for (const { produto, quantidade } of qtdPorProduto.values()) {
      if (produto.estoque < quantidade) {
        throw new BadRequestException(
          `Estoque insuficiente para "${produto.nome}". Disponível: ${produto.estoque}, solicitado: ${quantidade}.`,
        );
      }
    }

    // Decrement stock (reservation)
    for (const { produto, quantidade } of qtdPorProduto.values()) {
      produto.estoque -= quantidade;
      await this.produtoRepo.save(produto);
    }

    const itens: PedidoItem[] = dto.itens.map((itemDto) => {
      const { produto } = qtdPorProduto.get(itemDto.produtoId)!;
      return this.itemRepo.create({
        produto,
        quantidade: itemDto.quantidade,
        precoUnitario: produto.preco,
      });
    });

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

    if (dto.status && dto.status !== pedido.status) {
      if (pedido.status === 'Entregue') {
        throw new BadRequestException('Pedidos entregues não podem ser alterados.');
      }
      if (pedido.status === 'Cancelado') {
        throw new BadRequestException('Pedidos cancelados não podem ser reativados.');
      }

      // Cancelamento: devolve o estoque reservado
      if (dto.status === 'Cancelado') {
        await this.restaurarEstoque(pedido);
      }
    }

    if (dto.status) pedido.status = dto.status as StatusPedido;
    if (dto.categoria !== undefined) pedido.categoria = dto.categoria || null;
    return this.pedidoRepo.save(pedido);
  }

  async remove(id: string): Promise<void> {
    const pedido = await this.findOne(id);

    // Restore stock only if the order still holds a reservation
    if (STATUSES_COM_ESTOQUE.includes(pedido.status)) {
      await this.restaurarEstoque(pedido);
    }

    await this.pedidoRepo.remove(pedido);
  }

  private async restaurarEstoque(pedido: Pedido): Promise<void> {
    for (const item of pedido.itens) {
      const produto = await this.produtoRepo.findOneBy({ id: item.produto.id });
      if (produto) {
        produto.estoque += item.quantidade;
        await this.produtoRepo.save(produto);
      }
    }
  }
}
