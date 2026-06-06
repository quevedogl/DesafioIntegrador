"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import type { ChurnCliente, ChurnResumo } from "@/types/estrategia";

// ── helpers ───────────────────────────────────────────────────────────────────

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

const RISCO_COLOR: Record<string, string> = {
  Alto: "#ef4444",
  Médio: "#f97316",
  Baixo: "#22c55e",
};

const RISCO_BG: Record<string, string> = {
  Alto: "bg-red-100 text-red-700",
  Médio: "bg-orange-100 text-orange-700",
  Baixo: "bg-green-100 text-green-700",
};

// ── sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-black ${color ?? "text-gray-800"}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

function ModelBadge({ metricas }: { metricas: ChurnResumo["metricas_modelo"] | undefined }) {
  if (!metricas) return null;
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
        Random Forest — métricas do modelo
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        {[
          { label: "Acurácia", val: pct(metricas.acuracia) },
          { label: "Precisão Churn", val: pct(metricas.precisao_churn) },
          { label: "Recall Churn", val: pct(metricas.recall_churn) },
          { label: "F1 Churn", val: pct(metricas.f1_churn) },
        ].map((m) => (
          <div key={m.label} className="flex flex-col gap-0.5">
            <span className="text-lg font-black text-orange-500">{m.val}</span>
            <span className="text-xs text-gray-500">{m.label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400">
        Amostras de treino: {metricas.n_amostras_treino} · Pré-processamento: remoção de
        duplicatas, clipping IQR, normalização Z-Score
      </p>
    </div>
  );
}

type Filtro = "Todos" | "Alto" | "Médio" | "Baixo";

// ── main component ────────────────────────────────────────────────────────────

export default function DecisaoPage() {
  const [clientes, setClientes] = useState<ChurnCliente[]>([]);
  const [resumo, setResumo] = useState<ChurnResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [treinando, setTreinando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("Todos");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const [r, c] = await Promise.all([api.estrategia.resumo(), api.estrategia.clientes()]);
      setResumo(r);
      setClientes(c);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao conectar ao serviço ML (porta 8000).");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function retreinar() {
    setTreinando(true);
    try {
      await api.estrategia.treinar();
      await carregar();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao retreinar.");
    } finally {
      setTreinando(false);
    }
  }

  // ── derived data ─────────────────────────────────────────────────────────

  const filtrados =
    filtro === "Todos" ? clientes : clientes.filter((c) => c.risco_churn === filtro);

  const pieData = resumo
    ? [
        { name: "Alto Risco", value: resumo.alto_risco, fill: RISCO_COLOR["Alto"] },
        { name: "Médio Risco", value: resumo.medio_risco, fill: RISCO_COLOR["Médio"] },
        { name: "Baixo Risco", value: resumo.baixo_risco, fill: RISCO_COLOR["Baixo"] },
      ].filter((d) => d.value > 0)
    : [];

  const barData = clientes
    .slice(0, 10)
    .map((c) => ({
      nome: c.nome.split(" ")[0],
      churn: +(c.probabilidade_churn * 100).toFixed(1),
      scoring: +(c.scoring_compra * 100).toFixed(1),
    }));

  // ── render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500 text-sm animate-pulse">Carregando análise estratégica…</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500 text-sm max-w-md text-center">{erro}</p>
        <p className="text-gray-400 text-xs">
          Certifique-se de que o serviço Python está rodando em{" "}
          <code className="font-mono bg-gray-200 px-1 rounded">http://localhost:8000</code>
        </p>
        <button
          onClick={carregar}
          className="bg-orange-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-orange-600"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-orange-500 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-2xl font-black tracking-tight hover:text-orange-200">
              LogiFlow
            </a>
            <span className="text-orange-200 text-sm font-medium">Analytics</span>
            <span className="text-orange-300 text-sm">/ Decisão Estratégica</span>
          </div>
          <button
            onClick={retreinar}
            disabled={treinando}
            className="bg-white text-orange-600 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-orange-50 disabled:opacity-50 transition-colors"
          >
            {treinando ? "Retreinando…" : "Retreinar modelo"}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">

        {/* KPI cards */}
        {resumo && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Total de Clientes" value={String(resumo.total)} />
            <KpiCard
              label="Alto Risco de Churn"
              value={String(resumo.alto_risco)}
              sub={`${((resumo.alto_risco / (resumo.total || 1)) * 100).toFixed(0)}% da base`}
              color="text-red-600"
            />
            <KpiCard
              label="Médio Risco"
              value={String(resumo.medio_risco)}
              color="text-orange-500"
            />
            <KpiCard
              label="Taxa Média de Churn"
              value={pct(resumo.churn_medio)}
              sub="probabilidade média"
              color={resumo.churn_medio > 0.5 ? "text-red-600" : "text-gray-800"}
            />
          </div>
        )}

        {/* Model metrics */}
        <ModelBadge metricas={resumo?.metricas_modelo} />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
              Distribuição de Risco
            </h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-sm text-gray-400 py-8">Sem dados.</p>
            )}
          </div>

          {/* Bar — top 10 churn vs scoring */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
              Top 10 — Churn vs. Propensão à Compra (%)
            </h3>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                  <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Legend />
                  <Bar dataKey="churn" name="Risco Churn" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="scoring" name="Propensão Compra" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-sm text-gray-400 py-8">Sem dados.</p>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
              Classificação de Clientes
            </h3>
            {/* Filter buttons */}
            <div className="flex gap-2">
              {(["Todos", "Alto", "Médio", "Baixo"] as Filtro[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${
                    filtro === f
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filtrados.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">
              Nenhum cliente encontrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                    <th className="pb-3 pr-4 font-semibold">Cliente</th>
                    <th className="pb-3 pr-4 font-semibold">Cidade / UF</th>
                    <th className="pb-3 pr-4 font-semibold text-right">Pedidos</th>
                    <th className="pb-3 pr-4 font-semibold text-right">Receita Total</th>
                    <th className="pb-3 pr-4 font-semibold text-right">Canc.</th>
                    <th className="pb-3 pr-4 font-semibold text-right">Último Pedido</th>
                    <th className="pb-3 pr-4 font-semibold text-right">Churn</th>
                    <th className="pb-3 pr-4 font-semibold text-right">Compra</th>
                    <th className="pb-3 font-semibold text-center">Risco</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtrados.map((c) => (
                    <tr key={c.cliente_id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-gray-800">{c.nome}</p>
                        <p className="text-gray-400 text-xs">{c.email}</p>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {c.cidade} / {c.estado}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-gray-700">
                        {c.total_pedidos}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-gray-700">
                        {fmtBRL(c.receita_total)}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono">
                        <span
                          className={
                            c.taxa_cancelamento > 0.4
                              ? "text-red-600 font-semibold"
                              : "text-gray-600"
                          }
                        >
                          {pct(c.taxa_cancelamento)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right text-gray-600">
                        {c.dias_desde_ultimo_pedido != null
                          ? `${c.dias_desde_ultimo_pedido}d`
                          : "—"}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono font-semibold text-red-500">
                        {pct(c.probabilidade_churn)}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono font-semibold text-green-600">
                        {pct(c.scoring_compra)}
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full ${RISCO_BG[c.risco_churn]}`}
                        >
                          {c.risco_churn}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Feature importance */}
        {resumo?.metricas_modelo?.importancia_features && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
              Importância das Features — Random Forest
            </h3>
            <div className="flex flex-col gap-2">
              {Object.entries(resumo.metricas_modelo.importancia_features)
                .sort((a, b) => b[1] - a[1])
                .map(([feat, imp]) => (
                  <div key={feat} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-52 shrink-0 font-mono">{feat}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                      <div
                        className="bg-orange-400 h-2.5 rounded-full"
                        style={{ width: `${(imp * 100).toFixed(1)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 w-10 text-right">
                      {(imp * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
