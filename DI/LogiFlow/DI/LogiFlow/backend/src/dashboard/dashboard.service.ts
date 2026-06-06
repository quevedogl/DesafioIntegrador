import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pedido } from '../pedidos/pedido.entity';
import { Cliente } from '../clientes/cliente.entity';
import { Produto } from '../produtos/produto.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Pedido) private readonly pedidoRepo: Repository<Pedido>,
    @InjectRepository(Cliente) private readonly clienteRepo: Repository<Cliente>,
    @InjectRepository(Produto) private readonly produtoRepo: Repository<Produto>,
  ) {}

  async getDados() {
    const [totalPedidos, totalClientes, totalProdutos] = await Promise.all([
      this.pedidoRepo.count(),
      this.clienteRepo.count(),
      this.produtoRepo.count(),
    ]);

    const receitaRaw: { total: number }[] = await this.pedidoRepo.query(
      `SELECT COALESCE(SUM(CAST(pi.precoUnitario AS REAL) * pi.quantidade), 0) AS total
       FROM pedidos p
       JOIN pedido_itens pi ON pi.pedidoId = p.id`,
    );
    const receitaTotal = Number(receitaRaw[0]?.total ?? 0);

    const pedidosPorStatus: { status: string; total: number }[] =
      await this.pedidoRepo.query(
        `SELECT status, COUNT(*) AS total FROM pedidos GROUP BY status ORDER BY total DESC`,
      );

    const vendasPorMes: { mes: string; total: number; quantidade: number }[] =
      await this.pedidoRepo.query(
        `SELECT strftime('%Y-%m', p.criadoEm) AS mes,
                COALESCE(SUM(CAST(pi.precoUnitario AS REAL) * pi.quantidade), 0) AS total,
                COUNT(DISTINCT p.id) AS quantidade
         FROM pedidos p
         JOIN pedido_itens pi ON pi.pedidoId = p.id
         GROUP BY mes
         ORDER BY mes`,
      );

    const topClientes: { nome: string; total: number; pedidos: number }[] =
      await this.pedidoRepo.query(
        `SELECT c.nome,
                COALESCE(SUM(CAST(pi.precoUnitario AS REAL) * pi.quantidade), 0) AS total,
                COUNT(DISTINCT p.id) AS pedidos
         FROM clientes c
         JOIN pedidos p ON p.clienteId = c.id
         JOIN pedido_itens pi ON pi.pedidoId = p.id
         GROUP BY c.id, c.nome
         ORDER BY total DESC
         LIMIT 10`,
      );

    const produtosMaisVendidos: { nome: string; quantidade: number; receita: number }[] =
      await this.pedidoRepo.query(
        `SELECT pr.nome,
                SUM(pi.quantidade) AS quantidade,
                COALESCE(SUM(CAST(pi.precoUnitario AS REAL) * pi.quantidade), 0) AS receita
         FROM produtos pr
         JOIN pedido_itens pi ON pi.produtoId = pr.id
         GROUP BY pr.id, pr.nome
         ORDER BY quantidade DESC
         LIMIT 10`,
      );

    const vendasPorEstado: { estado: string; total: number }[] =
      await this.pedidoRepo.query(
        `SELECT c.estado,
                COALESCE(SUM(CAST(pi.precoUnitario AS REAL) * pi.quantidade), 0) AS total
         FROM clientes c
         JOIN pedidos p ON p.clienteId = c.id
         JOIN pedido_itens pi ON pi.pedidoId = p.id
         GROUP BY c.estado
         ORDER BY total DESC`,
      );

    const vendasPorCidade: { cidade: string; total: number }[] =
      await this.pedidoRepo.query(
        `SELECT c.cidade,
                COALESCE(SUM(CAST(pi.precoUnitario AS REAL) * pi.quantidade), 0) AS total
         FROM clientes c
         JOIN pedidos p ON p.clienteId = c.id
         JOIN pedido_itens pi ON pi.pedidoId = p.id
         GROUP BY c.cidade
         ORDER BY total DESC
         LIMIT 10`,
      );

    const vendasPorPais: { pais: string; total: number }[] =
      await this.pedidoRepo.query(
        `SELECT c.pais,
                COALESCE(SUM(CAST(pi.precoUnitario AS REAL) * pi.quantidade), 0) AS total
         FROM clientes c
         JOIN pedidos p ON p.clienteId = c.id
         JOIN pedido_itens pi ON pi.pedidoId = p.id
         GROUP BY c.pais
         ORDER BY total DESC`,
      );

    const vendasPorCategoria: { categoria: string; total: number }[] =
      await this.pedidoRepo.query(
        `SELECT p.categoria,
                COALESCE(SUM(CAST(pi.precoUnitario AS REAL) * pi.quantidade), 0) AS total
         FROM pedidos p
         JOIN pedido_itens pi ON pi.pedidoId = p.id
         WHERE p.categoria IS NOT NULL
         GROUP BY p.categoria
         ORDER BY total DESC`,
      );

    return {
      totalPedidos,
      totalClientes,
      totalProdutos,
      receitaTotal,
      pedidosPorStatus: pedidosPorStatus.map((r) => ({
        status: r.status,
        total: Number(r.total),
      })),
      vendasPorMes: vendasPorMes.map((r) => ({
        mes: r.mes,
        total: Number(r.total),
        quantidade: Number(r.quantidade),
      })),
      topClientes: topClientes.map((r) => ({
        nome: r.nome,
        total: Number(r.total),
        pedidos: Number(r.pedidos),
      })),
      produtosMaisVendidos: produtosMaisVendidos.map((r) => ({
        nome: r.nome,
        quantidade: Number(r.quantidade),
        receita: Number(r.receita),
      })),
      vendasPorEstado: vendasPorEstado.map((r) => ({
        estado: r.estado,
        total: Number(r.total),
      })),
      vendasPorCidade: vendasPorCidade.map((r) => ({
        cidade: r.cidade,
        total: Number(r.total),
      })),
      vendasPorPais: vendasPorPais.map((r) => ({
        pais: r.pais,
        total: Number(r.total),
      })),
      vendasPorCategoria: vendasPorCategoria.map((r) => ({
        categoria: r.categoria,
        total: Number(r.total),
      })),
    };
  }
}
