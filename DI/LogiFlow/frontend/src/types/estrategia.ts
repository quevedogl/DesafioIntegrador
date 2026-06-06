export interface ChurnCliente {
  cliente_id: string;
  nome: string;
  email: string;
  cidade: string;
  estado: string;
  total_pedidos: number;
  receita_total: number;
  ticket_medio: number;
  taxa_cancelamento: number;
  total_cancelados: number;
  dias_desde_ultimo_pedido: number | null;
  pedidos_por_mes: number;
  probabilidade_churn: number;
  risco_churn: "Alto" | "Médio" | "Baixo";
  scoring_compra: number;
}

export interface MetricasModelo {
  acuracia: number;
  precisao_churn: number;
  recall_churn: number;
  f1_churn: number;
  n_amostras_treino: number;
  importancia_features: Record<string, number>;
}

export interface ChurnResumo {
  total: number;
  alto_risco: number;
  medio_risco: number;
  baixo_risco: number;
  churn_medio: number;
  metricas_modelo: MetricasModelo;
}
