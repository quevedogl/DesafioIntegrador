"use client";

import { useEffect, useState, useCallback } from "react";
import { Produto, ProdutoFormData } from "@/types/produto";
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

const EMPTY_FORM: ProdutoFormData = {
  nome: "",
  preco: "",
  estoque: "",
  categoria: "",
};

function validate(f: ProdutoFormData): Partial<Record<keyof ProdutoFormData, string>> {
  const erros: Partial<Record<keyof ProdutoFormData, string>> = {};
  if (!f.nome.trim()) erros.nome = "O nome é obrigatório.";
  if (!f.preco) {
    erros.preco = "O preço é obrigatório.";
  } else if (isNaN(Number(f.preco)) || Number(f.preco) <= 0) {
    erros.preco = "O preço deve ser maior que zero.";
  }
  if (f.estoque === "") {
    erros.estoque = "O estoque é obrigatório.";
  } else if (!Number.isInteger(Number(f.estoque)) || Number(f.estoque) < 0) {
    erros.estoque = "O estoque deve ser um número inteiro não negativo.";
  }
  return erros;
}

function fmt(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [form, setForm] = useState<ProdutoFormData>(EMPTY_FORM);
  const [erros, setErros] = useState<Partial<Record<keyof ProdutoFormData, string>>>({});
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  const carregar = useCallback(async () => {
    try {
      setProdutos(await api.produtos.list());
    } catch {
      /* silencioso */
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 4000);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (erros[name as keyof ProdutoFormData]) {
      setErros((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validacao = validate(form);
    if (Object.keys(validacao).length > 0) { setErros(validacao); return; }

    setLoading(true);
    try {
      const payload = {
        nome: form.nome,
        preco: Number(form.preco),
        estoque: Number(form.estoque),
        ...(form.categoria ? { categoria: form.categoria } : {}),
      };

      if (editandoId) {
        await api.produtos.update(editandoId, {
          nome: payload.nome,
          preco: String(payload.preco),
          estoque: String(payload.estoque),
          categoria: form.categoria,
        });
        mostrarFeedback("sucesso", "Produto atualizado com sucesso.");
      } else {
        await api.produtos.create(form);
        mostrarFeedback("sucesso", "Produto cadastrado com sucesso.");
      }
      setForm(EMPTY_FORM);
      setEditandoId(null);
      await carregar();
    } catch (err: unknown) {
      mostrarFeedback("erro", err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  function handleEditar(p: Produto) {
    setEditandoId(p.id);
    setForm({
      nome: p.nome,
      preco: String(p.preco),
      estoque: String(p.estoque),
      categoria: p.categoria ?? "",
    });
    setErros({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelar() {
    setEditandoId(null);
    setForm(EMPTY_FORM);
    setErros({});
  }

  async function handleRemover(id: string) {
    if (!confirm("Deseja remover este produto?")) return;
    try {
      await api.produtos.remove(id);
      mostrarFeedback("sucesso", "Produto removido.");
      await carregar();
    } catch (err: unknown) {
      mostrarFeedback("erro", err instanceof Error ? err.message : "Erro ao remover.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-orange-500 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <a href="/" className="text-2xl font-black tracking-tight hover:opacity-90">
            LogiFlow
          </a>
          <span className="text-orange-200 text-sm font-medium">Analytics</span>
          <span className="text-orange-300 mx-1">/</span>
          <span className="text-sm font-medium">Produtos</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {feedback && (
          <div
            className={`rounded-lg px-5 py-3 text-sm font-medium ${
              feedback.tipo === "sucesso"
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-red-100 text-red-800 border border-red-300"
            }`}
          >
            {feedback.msg}
          </div>
        )}

        {/* Formulário */}
        <section className="bg-white rounded-2xl shadow-sm p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">
            {editandoId ? "Editar Produto" : "Novo Produto"}
          </h2>

          <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Nome do produto" error={erros.nome} className="md:col-span-2">
              <input
                name="nome"
                value={form.nome}
                onChange={handleChange}
                placeholder="Ex.: Cimento CP-II 50 kg"
                className={inputCls(!!erros.nome)}
              />
            </Field>

            <Field label="Preço (R$)" error={erros.preco}>
              <input
                name="preco"
                type="number"
                min="0.01"
                step="0.01"
                value={form.preco}
                onChange={handleChange}
                placeholder="0,00"
                className={inputCls(!!erros.preco)}
              />
            </Field>

            <Field label="Estoque (unidades)" error={erros.estoque}>
              <input
                name="estoque"
                type="number"
                min="0"
                step="1"
                value={form.estoque}
                onChange={handleChange}
                placeholder="0"
                className={inputCls(!!erros.estoque)}
              />
            </Field>

            <Field label="Categoria (opcional)" error={erros.categoria} className="md:col-span-2">
              <select
                name="categoria"
                value={form.categoria}
                onChange={handleChange}
                className={inputCls(!!erros.categoria)}
              >
                <option value="">Sem categoria</option>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>

            <div className="md:col-span-2 flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                {loading ? "Salvando..." : editandoId ? "Salvar alterações" : "Cadastrar"}
              </button>
              {editandoId && (
                <button
                  type="button"
                  onClick={handleCancelar}
                  className="border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium px-6 py-2.5 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Tabela */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Produtos cadastrados</h2>
            <span className="text-sm text-gray-400">{produtos.length} registro(s)</span>
          </div>

          {produtos.length === 0 ? (
            <div className="px-8 py-12 text-center text-gray-400 text-sm">
              Nenhum produto cadastrado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
                  <tr>
                    <th className="px-6 py-3 text-left">Nome</th>
                    <th className="px-6 py-3 text-left">Preço</th>
                    <th className="px-6 py-3 text-left">Estoque</th>
                    <th className="px-6 py-3 text-left">Categoria</th>
                    <th className="px-6 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {produtos.map((p) => (
                    <tr key={p.id} className="hover:bg-orange-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-800">{p.nome}</td>
                      <td className="px-6 py-4 text-gray-600">{fmt(Number(p.preco))}</td>
                      <td className="px-6 py-4 text-gray-600">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.estoque === 0
                              ? "bg-red-100 text-red-700"
                              : p.estoque <= 5
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {p.estoque} un.
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {p.categoria ?? <span className="italic text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleEditar(p)}
                          className="text-orange-500 hover:text-orange-700 font-medium transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleRemover(p.id)}
                          className="text-red-500 hover:text-red-700 font-medium transition-colors"
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
    hasError
      ? "border-red-400 bg-red-50"
      : "border-gray-300 bg-white hover:border-gray-400",
  ].join(" ");
}

function Field({
  label,
  error,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
