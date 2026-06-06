"use client";

import { useEffect, useState, useCallback } from "react";
import { Cliente, ClienteFormData } from "@/types/cliente";
import { api } from "@/lib/api";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const EMPTY_FORM: ClienteFormData = {
  nome: "", email: "", cidade: "", estado: "", pais: "Brasil",
};

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validate(data: ClienteFormData): Partial<Record<keyof ClienteFormData, string>> {
  const erros: Partial<Record<keyof ClienteFormData, string>> = {};
  if (!data.nome.trim()) erros.nome = "O nome é obrigatório.";
  if (!data.email.trim()) erros.email = "O e-mail é obrigatório.";
  else if (!validateEmail(data.email)) erros.email = "Informe um e-mail válido.";
  if (!data.cidade.trim()) erros.cidade = "A cidade é obrigatória.";
  if (!data.estado) erros.estado = "O estado é obrigatório.";
  if (!data.pais.trim()) erros.pais = "O país é obrigatório.";
  return erros;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [form, setForm] = useState<ClienteFormData>(EMPTY_FORM);
  const [erros, setErros] = useState<Partial<Record<keyof ClienteFormData, string>>>({});
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  const carregar = useCallback(async () => {
    try {
      setClientes(await api.clientes.list());
    } catch {
      /* silencioso em listagem */
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
    if (erros[name as keyof ClienteFormData]) {
      setErros((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validacao = validate(form);
    if (Object.keys(validacao).length > 0) { setErros(validacao); return; }

    setLoading(true);
    try {
      if (editandoId) {
        await api.clientes.update(editandoId, form);
        mostrarFeedback("sucesso", "Cliente atualizado com sucesso.");
      } else {
        await api.clientes.create(form);
        mostrarFeedback("sucesso", "Cliente cadastrado com sucesso.");
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

  function handleEditar(c: Cliente) {
    setEditandoId(c.id);
    setForm({ nome: c.nome, email: c.email, cidade: c.cidade, estado: c.estado, pais: c.pais });
    setErros({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelar() {
    setEditandoId(null);
    setForm(EMPTY_FORM);
    setErros({});
  }

  async function handleRemover(id: string) {
    if (!confirm("Deseja remover este cliente?")) return;
    try {
      await api.clientes.remove(id);
      mostrarFeedback("sucesso", "Cliente removido.");
      await carregar();
    } catch (err: unknown) {
      mostrarFeedback("erro", err instanceof Error ? err.message : "Erro ao remover.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-orange-500 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <span className="text-2xl font-black tracking-tight">LogiFlow</span>
          <span className="text-orange-200 text-sm font-medium">Analytics</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Feedback */}
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
            {editandoId ? "Editar Cliente" : "Novo Cliente"}
          </h2>

          <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Nome completo" error={erros.nome}>
              <input
                name="nome"
                value={form.nome}
                onChange={handleChange}
                placeholder="Ex.: João da Silva"
                className={inputCls(!!erros.nome)}
              />
            </Field>

            <Field label="E-mail" error={erros.email}>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="joao@empresa.com"
                className={inputCls(!!erros.email)}
              />
            </Field>

            <Field label="Cidade" error={erros.cidade}>
              <input
                name="cidade"
                value={form.cidade}
                onChange={handleChange}
                placeholder="Ex.: São Paulo"
                className={inputCls(!!erros.cidade)}
              />
            </Field>

            <Field label="Estado (UF)" error={erros.estado}>
              <select
                name="estado"
                value={form.estado}
                onChange={handleChange}
                className={inputCls(!!erros.estado)}
              >
                <option value="">Selecione...</option>
                {ESTADOS_BR.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </Field>

            <Field label="País" error={erros.pais} className="md:col-span-2">
              <input
                name="pais"
                value={form.pais}
                onChange={handleChange}
                placeholder="Brasil"
                className={inputCls(!!erros.pais)}
              />
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
            <h2 className="text-xl font-bold text-gray-800">Clientes cadastrados</h2>
            <span className="text-sm text-gray-400">{clientes.length} registro(s)</span>
          </div>

          {clientes.length === 0 ? (
            <div className="px-8 py-12 text-center text-gray-400 text-sm">
              Nenhum cliente cadastrado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
                  <tr>
                    <th className="px-6 py-3 text-left">Nome</th>
                    <th className="px-6 py-3 text-left">E-mail</th>
                    <th className="px-6 py-3 text-left">Cidade</th>
                    <th className="px-6 py-3 text-left">UF</th>
                    <th className="px-6 py-3 text-left">País</th>
                    <th className="px-6 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clientes.map((c) => (
                    <tr key={c.id} className="hover:bg-orange-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-800">{c.nome}</td>
                      <td className="px-6 py-4 text-gray-600">{c.email}</td>
                      <td className="px-6 py-4 text-gray-600">{c.cidade}</td>
                      <td className="px-6 py-4 text-gray-600">{c.estado}</td>
                      <td className="px-6 py-4 text-gray-600">{c.pais}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleEditar(c)}
                          className="text-orange-500 hover:text-orange-700 font-medium transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleRemover(c.id)}
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
