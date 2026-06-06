export interface DashboardData {
  totalPedidos: number;
  totalClientes: number;
  totalProdutos: number;
  receitaTotal: number;
  pedidosPorStatus: { status: string; total: number }[];
  vendasPorMes: { mes: string; total: number; quantidade: number }[];
  topClientes: { nome: string; total: number; pedidos: number }[];
  produtosMaisVendidos: { nome: string; quantidade: number; receita: number }[];
  vendasPorEstado: { estado: string; total: number }[];
  vendasPorCidade: { cidade: string; total: number }[];
  vendasPorPais: { pais: string; total: number }[];
  vendasPorCategoria: { categoria: string; total: number }[];
}
