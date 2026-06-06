export interface RelatorioVendas {
  resumo: {
    total_pedidos: number;
    cancelados: number;
    entregues: number;
    receita_total: number;
    taxa_cancelamento: number;
    ticket_medio: number;
  };
  vendas_mensais: {
    mes: string;
    total_pedidos: number;
    cancelados: number;
    receita: number;
    taxa_cancelamento: number;
  }[];
  top_produtos: {
    nome: string;
    categoria: string;
    quantidade: number;
    receita: number;
  }[];
  receita_por_categoria: {
    categoria: string;
    receita: number;
  }[];
}

export interface RelatorioEstoque {
  resumo: {
    total_produtos: number;
    valor_total_estoque: number;
    sem_estoque: number;
    estoque_critico: number;
  };
  produtos_criticos: {
    id: string;
    nome: string;
    preco: number;
    estoque: number;
    categoria: string;
    total_vendido: number;
    alerta: 'Sem estoque' | 'Crítico' | 'Baixo';
  }[];
  sem_vendas: {
    id: string;
    nome: string;
    preco: number;
    estoque: number;
    categoria: string;
  }[];
  por_categoria: {
    categoria: string;
    total_produtos: number;
    unidades: number;
    valor: number;
  }[];
}
