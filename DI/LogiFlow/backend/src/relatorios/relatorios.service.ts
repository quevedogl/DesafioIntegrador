import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pedido } from '../pedidos/pedido.entity';
import { Produto } from '../produtos/produto.entity';

@Injectable()
export class RelatoriosService {
  constructor(
    @InjectRepository(Pedido) private readonly pedidoRepo: Repository<Pedido>,
    @InjectRepository(Produto) private readonly produtoRepo: Repository<Produto>,
  ) {}

  async getRelatorioVendas() {
    const resumoRaw: {
      total_pedidos: number;
      cancelados: number;
      entregues: number;
      receita_total: number;
    }[] = await this.pedidoRepo.query(`
      SELECT
        COUNT(DISTINCT p.id) AS total_pedidos,
        COUNT(DISTINCT CASE WHEN p.status = 'Cancelado' THEN p.id END) AS cancelados,
        COUNT(DISTINCT CASE WHEN p.status = 'Entregue'  THEN p.id END) AS entregues,
        COALESCE(SUM(CASE WHEN p.status != 'Cancelado'
          THEN CAST(pi.precoUnitario AS REAL) * pi.quantidade END), 0) AS receita_total
      FROM pedidos p
      LEFT JOIN pedido_itens pi ON pi.pedidoId = p.id
    `);

    const ticketRaw: { ticket_medio: number }[] = await this.pedidoRepo.query(`
      SELECT AVG(total_pedido) AS ticket_medio
      FROM (
        SELECT p.id, SUM(CAST(pi.precoUnitario AS REAL) * pi.quantidade) AS total_pedido
        FROM pedidos p
        JOIN pedido_itens pi ON pi.pedidoId = p.id
        WHERE p.status != 'Cancelado'
        GROUP BY p.id
      )
    `);

    const vendasMensaisRaw: {
      mes: string;
      total_pedidos: number;
      cancelados: number;
      receita: number;
    }[] = await this.pedidoRepo.query(`
      SELECT
        strftime('%Y-%m', p.criadoEm) AS mes,
        COUNT(DISTINCT p.id)          AS total_pedidos,
        COUNT(DISTINCT CASE WHEN p.status = 'Cancelado' THEN p.id END) AS cancelados,
        COALESCE(SUM(CASE WHEN p.status != 'Cancelado'
          THEN CAST(pi.precoUnitario AS REAL) * pi.quantidade END), 0) AS receita
      FROM pedidos p
      LEFT JOIN pedido_itens pi ON pi.pedidoId = p.id
      GROUP BY mes
      ORDER BY mes
    `);

    const topProdutosRaw: {
      nome: string;
      categoria: string;
      quantidade: number;
      receita: number;
    }[] = await this.pedidoRepo.query(`
      SELECT
        pr.nome,
        COALESCE(pr.categoria, 'Sem Categoria') AS categoria,
        SUM(pi.quantidade) AS quantidade,
        COALESCE(SUM(CAST(pi.precoUnitario AS REAL) * pi.quantidade), 0) AS receita
      FROM produtos pr
      JOIN pedido_itens pi ON pi.produtoId = pr.id
      JOIN pedidos p ON pi.pedidoId = p.id
      WHERE p.status != 'Cancelado'
      GROUP BY pr.id, pr.nome, pr.categoria
      ORDER BY receita DESC
      LIMIT 15
    `);

    const receitaCategoriaRaw: { categoria: string; receita: number }[] =
      await this.pedidoRepo.query(`
        SELECT
          COALESCE(pr.categoria, 'Sem Categoria') AS categoria,
          COALESCE(SUM(CAST(pi.precoUnitario AS REAL) * pi.quantidade), 0) AS receita
        FROM produtos pr
        JOIN pedido_itens pi ON pi.produtoId = pr.id
        JOIN pedidos p ON pi.pedidoId = p.id
        WHERE p.status != 'Cancelado'
        GROUP BY pr.categoria
        ORDER BY receita DESC
      `);

    const r = resumoRaw[0];
    const totalPedidos = Number(r?.total_pedidos ?? 0);
    const cancelados = Number(r?.cancelados ?? 0);

    return {
      resumo: {
        total_pedidos: totalPedidos,
        cancelados,
        entregues: Number(r?.entregues ?? 0),
        receita_total: Number(r?.receita_total ?? 0),
        taxa_cancelamento: totalPedidos > 0 ? cancelados / totalPedidos : 0,
        ticket_medio: Number(ticketRaw[0]?.ticket_medio ?? 0),
      },
      vendas_mensais: vendasMensaisRaw.map((row) => ({
        mes: row.mes,
        total_pedidos: Number(row.total_pedidos),
        cancelados: Number(row.cancelados),
        receita: Number(row.receita),
        taxa_cancelamento:
          Number(row.total_pedidos) > 0
            ? Number(row.cancelados) / Number(row.total_pedidos)
            : 0,
      })),
      top_produtos: topProdutosRaw.map((row) => ({
        nome: row.nome,
        categoria: row.categoria,
        quantidade: Number(row.quantidade),
        receita: Number(row.receita),
      })),
      receita_por_categoria: receitaCategoriaRaw.map((row) => ({
        categoria: row.categoria,
        receita: Number(row.receita),
      })),
    };
  }

  async getRelatorioEstoque() {
    const resumoRaw: {
      total_produtos: number;
      valor_total: number;
      sem_estoque: number;
      estoque_critico: number;
    }[] = await this.produtoRepo.query(`
      SELECT
        COUNT(*)  AS total_produtos,
        COALESCE(SUM(CAST(preco AS REAL) * estoque), 0) AS valor_total,
        COUNT(CASE WHEN estoque = 0  THEN 1 END) AS sem_estoque,
        COUNT(CASE WHEN estoque > 0 AND estoque < 10 THEN 1 END) AS estoque_critico
      FROM produtos
    `);

    const produtosCriticosRaw: {
      id: string;
      nome: string;
      preco: number;
      estoque: number;
      categoria: string;
      total_vendido: number;
    }[] = await this.produtoRepo.query(`
      SELECT
        pr.id, pr.nome,
        CAST(pr.preco AS REAL) AS preco,
        pr.estoque,
        COALESCE(pr.categoria, 'Sem Categoria') AS categoria,
        COALESCE(SUM(pi.quantidade), 0) AS total_vendido
      FROM produtos pr
      LEFT JOIN pedido_itens pi ON pi.produtoId = pr.id
      LEFT JOIN pedidos p ON pi.pedidoId = p.id AND p.status != 'Cancelado'
      GROUP BY pr.id, pr.nome, pr.preco, pr.estoque, pr.categoria
      ORDER BY pr.estoque ASC
      LIMIT 20
    `);

    const semVendasRaw: {
      id: string;
      nome: string;
      preco: number;
      estoque: number;
      categoria: string;
    }[] = await this.produtoRepo.query(`
      SELECT pr.id, pr.nome,
             CAST(pr.preco AS REAL) AS preco,
             pr.estoque,
             COALESCE(pr.categoria, 'Sem Categoria') AS categoria
      FROM produtos pr
      LEFT JOIN pedido_itens pi ON pi.produtoId = pr.id
      WHERE pi.id IS NULL
      ORDER BY pr.nome
    `);

    const porCategoriaRaw: {
      categoria: string;
      total_produtos: number;
      unidades: number;
      valor: number;
    }[] = await this.produtoRepo.query(`
      SELECT
        COALESCE(categoria, 'Sem Categoria') AS categoria,
        COUNT(*) AS total_produtos,
        SUM(estoque) AS unidades,
        COALESCE(SUM(CAST(preco AS REAL) * estoque), 0) AS valor
      FROM produtos
      GROUP BY categoria
      ORDER BY valor DESC
    `);

    const r = resumoRaw[0];
    return {
      resumo: {
        total_produtos: Number(r?.total_produtos ?? 0),
        valor_total_estoque: Number(r?.valor_total ?? 0),
        sem_estoque: Number(r?.sem_estoque ?? 0),
        estoque_critico: Number(r?.estoque_critico ?? 0),
      },
      produtos_criticos: produtosCriticosRaw.map((row) => ({
        id: row.id,
        nome: row.nome,
        preco: Number(row.preco),
        estoque: Number(row.estoque),
        categoria: row.categoria,
        total_vendido: Number(row.total_vendido),
        alerta:
          Number(row.estoque) === 0
            ? 'Sem estoque'
            : Number(row.estoque) < 10
              ? 'Crítico'
              : 'Baixo',
      })),
      sem_vendas: semVendasRaw.map((row) => ({
        id: row.id,
        nome: row.nome,
        preco: Number(row.preco),
        estoque: Number(row.estoque),
        categoria: row.categoria,
      })),
      por_categoria: porCategoriaRaw.map((row) => ({
        categoria: row.categoria,
        total_produtos: Number(row.total_produtos),
        unidades: Number(row.unidades),
        valor: Number(row.valor),
      })),
    };
  }
}
