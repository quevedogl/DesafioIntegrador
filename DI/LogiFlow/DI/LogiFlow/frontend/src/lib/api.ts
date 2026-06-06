import { Cliente, ClienteFormData } from "@/types/cliente";
import { Produto, ProdutoFormData } from "@/types/produto";
import { Pedido, PedidoPayload } from "@/types/pedido";
import { DashboardData } from "@/types/dashboard";

const BASE = "http://localhost:3001";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `Erro ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  clientes: {
    list: () => request<Cliente[]>("/clientes"),
    create: (data: ClienteFormData) =>
      request<Cliente>("/clientes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<ClienteFormData>) =>
      request<Cliente>(`/clientes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) =>
      request<void>(`/clientes/${id}`, { method: "DELETE" }),
  },
  produtos: {
    list: () => request<Produto[]>("/produtos"),
    create: (data: ProdutoFormData) =>
      request<Produto>("/produtos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<ProdutoFormData>) =>
      request<Produto>(`/produtos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) =>
      request<void>(`/produtos/${id}`, { method: "DELETE" }),
  },
  pedidos: {
    list: () => request<Pedido[]>("/pedidos"),
    create: (data: PedidoPayload) =>
      request<Pedido>("/pedidos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { status?: string; categoria?: string }) =>
      request<Pedido>(`/pedidos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) =>
      request<void>(`/pedidos/${id}`, { method: "DELETE" }),
  },
  dashboard: {
    get: () => request<DashboardData>("/dashboard"),
  },
};
