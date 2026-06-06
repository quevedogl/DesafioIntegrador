export interface Produto {
  id: string;
  nome: string;
  preco: number;
  estoque: number;
  categoria: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ProdutoFormData {
  nome: string;
  preco: string;
  estoque: string;
  categoria: string;
}
