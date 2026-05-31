"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { DashboardData } from "@/types/dashboard";
import { api } from "@/lib/api";

const COLORS = ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#eab308", "#ec4899", "#14b8a6", "#f43f5e"];

const STATUS_COLORS: Record<string, string> = {
  Pendente: "#eab308",
  Confirmado: "#3b82f6",
  Enviado: "#a855f7",
  Entregue: "#22c55e",
  Cancelado: "#f43f5e",
};

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function fmtMes(mes: string) {
  const [ano, m] = mes.split("-");
  return `${m}/${ano}`;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-black text-gray-800">{value}</span>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-center text-sm text-gray-400 py-8">Sem dados ainda.</p>;
}

export default function DashboardPage() {
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await api.dashboard.get());
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar dados.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-orange-500 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <a href="/" className="text-2xl font-black tracking-tight hover:opacity-90">LogiFlow</a>
          <span className="text-orange-200 text-sm font-medium">Analytics</span>
          <span className="text-orange-300 mx-1">/</span>
          <span className="text-sm font-medium">Dashboard</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {carregando && (
          <p className="text-center text-gray-400 py-20">Carregando dados...</p>
        )}

        {erro && (
          <div className="bg-red-100 text-red-800 border border-red-300 rounded-lg px-5 py-3 text-sm">
            {erro}
            <button onClick={carregar} className="ml-3 underline font-medium">Tentar novamente</button>
          </div>
        )}

        {dados && !carregando && (
          <>
            {/* Cards resumo */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard label="Total de Pedidos" value={String(dados.totalPedidos)} />
              <SummaryCard label="Total de Clientes" value={String(dados.totalClientes)} />
              <SummaryCard label="Total de Produtos" value={String(dados.totalProdutos)} />
              <SummaryCard label="Receita Total" value={fmt(dados.receitaTotal)} />
            </div>

            {/* Linha 1: Status + Vendas por mês */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Pedidos por Status">
                {dados.pedidosPorStatus.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={dados.pedidosPorStatus}
                        dataKey="total"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ status, percent }) =>
                          `${status} (${(percent * 100).toFixed(0)}%)`
                        }
                      >
                        {dados.pedidosPorStatus.map((entry) => (
                          <Cell
                            key={entry.status}
                            fill={STATUS_COLORS[entry.status] ?? COLORS[0]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [v, "Pedidos"]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Vendas por Mês (R$)">
                {dados.vendasPorMes.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={dados.vendasPorMes.map((d) => ({ ...d, mes: fmtMes(d.mes) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => [fmt(v), "Receita"]} />
                      <Legend />
                      <Line type="monotone" dataKey="total" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} name="Receita" />
                      <Line type="monotone" dataKey="quantidade" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Pedidos" yAxisId={0} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* Linha 2: Top Clientes + Produtos mais vendidos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Top 10 Clientes (por Receita)">
                {dados.topClientes.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dados.topClientes} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip formatter={(v: number) => [fmt(v), "Receita"]} />
                      <Bar dataKey="total" fill="#f97316" radius={[0, 4, 4, 0]} name="Receita" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Top 10 Produtos Mais Vendidos (Qtd.)">
                {dados.produtosMaisVendidos.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dados.produtosMaisVendidos} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip formatter={(v: number, name: string) => [name === "receita" ? fmt(v) : v, name === "receita" ? "Receita" : "Quantidade"]} />
                      <Legend />
                      <Bar dataKey="quantidade" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Quantidade" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* Linha 3: Por estado + Por categoria */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Receita por Estado">
                {dados.vendasPorEstado.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={dados.vendasPorEstado}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="estado" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => [fmt(v), "Receita"]} />
                      <Bar dataKey="total" fill="#22c55e" radius={[4, 4, 0, 0]} name="Receita" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Receita por Categoria">
                {dados.vendasPorCategoria.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={dados.vendasPorCategoria}
                        dataKey="total"
                        nameKey="categoria"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ categoria, percent }) =>
                          `${categoria} (${(percent * 100).toFixed(0)}%)`
                        }
                      >
                        {dados.vendasPorCategoria.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [fmt(v), "Receita"]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* Linha 4: Por cidade + Por país */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Top 10 Cidades (por Receita)">
                {dados.vendasPorCidade.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={dados.vendasPorCidade} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="cidade" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip formatter={(v: number) => [fmt(v), "Receita"]} />
                      <Bar dataKey="total" fill="#a855f7" radius={[0, 4, 4, 0]} name="Receita" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Receita por País">
                {dados.vendasPorPais.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={dados.vendasPorPais} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="pais" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip formatter={(v: number) => [fmt(v), "Receita"]} />
                      <Bar dataKey="total" fill="#14b8a6" radius={[0, 4, 4, 0]} name="Receita" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
