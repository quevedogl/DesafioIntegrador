import type { Cliente } from "./cliente";
import type { Produto } from "./produto";

export type StatusPedido = "Pendente" | "Confirmado" | "Enviado" | "Entregue" | "Cancelado";

export interface PedidoItem {
  id: string;
  produto: Produto;
  quantidade: number;
  precoUnitario: number;
}

export interface Pedido {
  id: string;
  cliente: Cliente;
  itens: PedidoItem[];
  categoria: string | null;
  status: StatusPedido;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ItemFormData {
  produtoId: string;
  quantidade: string;
}

export interface PedidoPayload {
  clienteId: string;
  categoria?: string;
  itens: { produtoId: string; quantidade: number }[];
}

export interface PedidoFormData {
  clienteId: string;
  categoria: string;
  itens: ItemFormData[];
}
