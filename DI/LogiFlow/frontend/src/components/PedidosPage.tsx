"use client";

import { useEffect, useState, useCallback } from "react";
import type { Cliente } from "@/types/cliente";
import type { Produto } from "@/types/produto";
import type { Pedido, PedidoPayload, ItemFormData, StatusPedido } from "@/types/pedido";
import { api } from "@/lib/api";

const CATEGORIAS = [
  "Cimento e Argamassa",
  "Tintas e Vernizes",
  "Ferramentas",
  "Elétrico",
  "Hidráulico",
  "Acabamento",
  "Estrutural",
  "Outros",
];

const STATUS_LIST: StatusPedido[] = [
  "Pendente",
  "Confirmado",
  "Enviado",
  "Entregue",
  "Cancelado",
];

const STATUS_COLORS: Record<StatusPedido, string> = {
  Pendente: "bg-yellow-100 text-yellow-700",
  Confirmado: "bg-blue-100 text-blue-700",
  Enviado: "bg-purple-100 text-purple-700",
  Entregue: "bg-green-100 text-green-700",
  Cancelado: "bg-red-100 text-red-700",
};

const EMPTY_ITEM: ItemFormData = { produtoId: "", quantidade: "1" };

function emptyForm() {
  return { clienteId: "", categoria: "", itens: [{ ...EMPTY_ITEM }] };
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function calcTotal(itens: ItemFormData[], produtos: Produto[]) {
  return itens.reduce((sum, item) => {
    const p = produtos.find((x) => x.id === item.produtoId);
    return sum + (p ? Number(p.preco) * (Number(item.quantidade) || 0) : 0);
  }, 0);
}

function validate(
  form: ReturnType<typeof emptyForm>,
): Partial<{ clienteId: string; itens: string }> {
  const erros: Partial<{ clienteId: string; itens: string }> = {};
  if (!form.clienteId) erros.clienteId = "Selecione um cliente.";
  const itensValidos = form.itens.filter((i) => i.produtoId);
  if (itensValidos.length === 0) erros.itens = "Adicione ao menos um produto.";
  else if (form.itens.some((i) => i.produtoId && Number(i.quantidade) < 1))
    erros.itens = "Todas as quantidades devem ser ≥ 1.";
  return erros;
}

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [erros, setErros] = useState<Partial<{ clienteId: string; itens: string }>>({});
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  const carregar = useCallback(async () => {
    const [p, c, pr] = await Promise.allSettled([
      api.pedidos.list(),
      api.clientes.list(),
      api.produtos.list(),
    ]);
    if (p.status === "fulfilled") setPedidos(p.value);
    if (c.status === "fulfilled") setClientes(c.value);
    if (pr.status === "fulfilled") setProdutos(pr.value);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 4000);
  }

  /* ── itens dinâmicos ── */
  function addItem() {
    setForm((f) => ({ ...f, itens: [...f.itens, { ...EMPTY_ITEM }] }));
  }

  function removeItem(idx: number) {
    setForm((f) => ({ ...f, itens: f.itens.filter((_, i) => i !== idx) }));
  }

  function changeItem(idx: number, field: keyof ItemFormData, value: string) {
    setForm((f) => {
      const itens = f.itens.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item,
      );
      return { ...f, itens };
    });
    if (erros.itens) setErros((e) => ({ ...e, itens: undefined }));
  }

  /* ── submit ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validacao = validate(form);
    if (Object.keys(validacao).length > 0) { setErros(validacao); return; }

    setLoading(true);
    try {
      const payload: PedidoPayload = {
        clienteId: form.clienteId,
        ...(form.categoria ? { categoria: form.categoria } : {}),
        itens: form.itens
          .filter((i) => i.produtoId)
          .map((i) => ({ produtoId: i.produtoId, quantidade: Number(i.quantidade) })),
      };
      await api.pedidos.create(payload);
      mostrarFeedback("sucesso", "Pedido criado com sucesso.");
      setForm(emptyForm());
      setErros({});
      await carregar();
    } catch (err: unknown) {
      mostrarFeedback("erro", err instanceof Error ? err.message : "Erro ao criar pedido.");
    } finally {
      setLoading(false);
    }
  }

  /* ── atualizar status ── */
  async function handleStatus(id: string, status: string) {
    try {
      await api.pedidos.update(id, { status });
      await carregar();
    } catch (err: unknown) {
      mostrarFeedback("erro", err instanceof Error ? err.message : "Erro ao atualizar status.");
    }
  }

  /* ── remover ── */
  async function handleRemover(id: string) {
    if (!confirm("Deseja remover este pedido? O estoque dos produtos será restaurado.")) return;
    try {
      await api.pedidos.remove(id);
      mostrarFeedback("sucesso", "Pedido removido.");
      await carregar();
    } catch (err: unknown) {
      mostrarFeedback("erro", err instanceof Error ? err.message : "Erro ao remover.");
    }
  }

  const produtosFiltrados = form.categoria
    ? produtos.filter((p) => p.categoria === form.categoria)
    : produtos;

  function handleCategoriaChange(novaCategoria: string) {
    setForm((f) => ({
      ...f,
      categoria: novaCategoria,
      // limpa itens cujo produto não pertence à nova categoria
      itens: f.itens.map((item) => {
        if (!item.produtoId) return item;
        const produto = produtos.find((p) => p.id === item.produtoId);
        const pertence = novaCategoria
          ? produto?.categoria === novaCategoria
          : true;
        return pertence ? item : { ...EMPTY_ITEM };
      }),
    }));
  }

  const total = calcTotal(form.itens, produtos);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-orange-500 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <a href="/" className="text-2xl font-black tracking-tight hover:opacity-90">LogiFlow</a>
          <span className="text-orange-200 text-sm font-medium">Analytics</span>
          <span className="text-orange-300 mx-1">/</span>
          <span className="text-sm font-medium">Pedidos</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {feedback && (
          <div className={`rounded-lg px-5 py-3 text-sm font-medium ${
            feedback.tipo === "sucesso"
              ? "bg-green-100 text-green-800 border border-green-300"
              : "bg-red-100 text-red-800 border border-red-300"
          }`}>
            {feedback.msg}
          </div>
        )}

        {/* ── Formulário ── */}
        <section className="bg-white rounded-2xl shadow-sm p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Novo Pedido</h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* Cliente + Categoria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Cliente *" error={erros.clienteId}>
                <select
                  value={form.clienteId}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, clienteId: e.target.value }));
                    if (erros.clienteId) setErros((er) => ({ ...er, clienteId: undefined }));
                  }}
                  className={inputCls(!!erros.clienteId)}
                >
                  <option value="">Selecione o cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome} — {c.cidade}/{c.estado}</option>
                  ))}
                </select>
              </Field>

              <Field label="Categoria (opcional)">
                <select
                  value={form.categoria}
                  onChange={(e) => handleCategoriaChange(e.target.value)}
                  className={inputCls(false)}
                >
                  <option value="">Sem categoria</option>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>

            {/* Itens */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Produtos do pedido *
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-orange-500 hover:text-orange-700 text-sm font-semibold transition-colors"
                >
                  + Adicionar item
                </button>
              </div>

              {erros.itens && (
                <p className="mb-2 text-xs text-red-600">{erros.itens}</p>
              )}

              <div className="space-y-3">
                {form.itens.map((item, idx) => {
                  const prodSelecionado = produtos.find((p) => p.id === item.produtoId);
                  return (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                      <div className="flex-1">
                        <select
                          value={item.produtoId}
                          onChange={(e) => changeItem(idx, "produtoId", e.target.value)}
                          className={inputCls(false)}
                        >
                          <option value="">Selecione o produto...</option>
                          {produtosFiltrados.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome} — {fmt(Number(p.preco))}
                              {p.categoria ? ` (${p.categoria})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-28">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantidade}
                          onChange={(e) => changeItem(idx, "quantidade", e.target.value)}
                          placeholder="Qtd."
                          className={inputCls(false)}
                        />
                      </div>

                      {prodSelecionado && (
                        <span className="text-sm text-gray-500 w-28 text-right shrink-0">
                          {fmt(Number(prodSelecionado.preco) * (Number(item.quantidade) || 0))}
                        </span>
                      )}

                      {form.itens.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0 transition-colors"
                          title="Remover item"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {total > 0 && (
                <div className="mt-3 text-right text-sm font-semibold text-gray-700">
                  Total estimado: <span className="text-orange-500">{fmt(total)}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              {loading ? "Salvando..." : "Criar pedido"}
            </button>
          </form>
        </section>

        {/* ── Lista de pedidos ── */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Pedidos</h2>
            <span className="text-sm text-gray-400">{pedidos.length} registro(s)</span>
          </div>

          {pedidos.length === 0 ? (
            <div className="px-8 py-12 text-center text-gray-400 text-sm">
              Nenhum pedido cadastrado ainda.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {pedidos.map((p) => {
                const valorTotal = p.itens.reduce(
                  (s, i) => s + Number(i.precoUnitario) * i.quantidade,
                  0,
                );
                return (
                  <div key={p.id} className="px-8 py-5 hover:bg-orange-50 transition-colors">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-800">{p.cliente.nome}</span>
                          <span className="text-gray-400 text-xs">{p.cliente.cidade}/{p.cliente.estado}</span>
                          {p.categoria && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                              {p.categoria}
                            </span>
                          )}
                        </div>

                        <ul className="text-sm text-gray-500 space-y-0.5 mt-1">
                          {p.itens.map((item) => (
                            <li key={item.id}>
                              {item.produto.nome} × {item.quantidade} ={" "}
                              {fmt(Number(item.precoUnitario) * item.quantidade)}
                            </li>
                          ))}
                        </ul>

                        <p className="text-sm font-semibold text-orange-500 mt-1">
                          Total: {fmt(valorTotal)}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {p.status === "Entregue" || p.status === "Cancelado" ? (
                          <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${STATUS_COLORS[p.status]}`}>
                            {p.status}
                          </span>
                        ) : (
                          <select
                            value={p.status}
                            onChange={(e) => handleStatus(p.id, e.target.value)}
                            className={`text-xs font-medium px-3 py-1.5 rounded-full border-0 outline-none cursor-pointer ${STATUS_COLORS[p.status]}`}
                          >
                            {STATUS_LIST.filter((s) => s !== "Entregue" || p.status === "Enviado").map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        )}

                        {p.status !== "Entregue" && (
                          <button
                            onClick={() => handleRemover(p.id)}
                            className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function inputCls(hasError: boolean) {
  return [
    "w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors",
    "focus:ring-2 focus:ring-orange-400 focus:border-orange-400",
    hasError ? "border-red-400 bg-red-50" : "border-gray-300 bg-white hover:border-gray-400",
  ].join(" ");
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
