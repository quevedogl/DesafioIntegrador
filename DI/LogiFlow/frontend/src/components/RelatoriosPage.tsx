"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "@/lib/api";
import type { RelatorioEstoque, RelatorioVendas } from "@/types/relatorios";
import type { ChurnCliente } from "@/types/estrategia";

// ── helpers ───────────────────────────────────────────────────────────────────

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }
function fmtMes(m: string) { const [a, mo] = m.split("-"); return `${mo}/${a}`; }

const COLORS = ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#eab308", "#ec4899", "#14b8a6"];

const ALERTA_BG: Record<string, string> = {
  "Sem estoque": "bg-red-100 text-red-700",
  "Crítico": "bg-orange-100 text-orange-700",
  "Baixo": "bg-yellow-100 text-yellow-700",
};

// ── shared UI ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className={`text-xl font-black ${color ?? "text-gray-800"}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

function Section({ title, badge, children }: { title: string; badge: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-6 print:break-inside-avoid">
      <div className="flex items-center gap-3">
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
          badge === "Gerencial" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
        }`}>{badge}</span>
        <h2 className="text-lg font-black text-gray-800">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
      {title && <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</h3>}
      {children}
    </div>
  );
}

// ── Report 1: Desempenho de Vendas ────────────────────────────────────────────

function RelatorioVendasSection({ data }: { data: RelatorioVendas }) {
  const { resumo, vendas_mensais, top_produtos, receita_por_categoria } = data;

  const melhorMes = vendas_mensais.reduce(
    (best, m) => (m.receita > best.receita ? m : best),
    vendas_mensais[0] ?? { mes: "—", receita: 0 }
  );

  return (
    <Section title="Desempenho de Vendas" badge="Gerencial">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Total Pedidos" value={String(resumo.total_pedidos)} />
        <KpiCard label="Entregues" value={String(resumo.entregues)} color="text-green-600" />
        <KpiCard label="Cancelados" value={String(resumo.cancelados)} color="text-red-600" />
        <KpiCard label="Receita Total" value={brl(resumo.receita_total)} />
        <KpiCard label="Ticket Médio" value={brl(resumo.ticket_medio)} />
        <KpiCard
          label="Taxa Cancelamento"
          value={pct(resumo.taxa_cancelamento)}
          color={resumo.taxa_cancelamento > 0.3 ? "text-red-600" : "text-gray-800"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Receita Mensal vs. Cancelamentos">
          {vendas_mensais.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={vendas_mensais.map((m) => ({ ...m, mes: fmtMes(m.mes) }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number, name: string) =>
                  name === "Receita" ? brl(v) : String(v)
                } />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="receita" name="Receita" stroke="#f97316" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="cancelados" name="Cancelados" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-8">Sem dados.</p>}
          {melhorMes.mes !== "—" && (
            <p className="text-xs text-gray-500">
              Melhor mês: <span className="font-semibold text-orange-500">{fmtMes(melhorMes.mes)}</span> — {brl(melhorMes.receita)}
            </p>
          )}
        </Card>

        <Card title="Receita por Categoria">
          {receita_por_categoria.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={receita_por_categoria} dataKey="receita" nameKey="categoria" cx="50%" cy="50%" outerRadius={80}
                  label={({ categoria, percent }) => `${categoria} ${(percent * 100).toFixed(0)}%`}>
                  {receita_por_categoria.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => brl(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-8">Sem dados.</p>}
        </Card>
      </div>

      <Card title="Top 15 Produtos por Receita">
        {top_produtos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Produto</th>
                  <th className="pb-2 pr-4">Categoria</th>
                  <th className="pb-2 pr-4 text-right">Qtd. Vendida</th>
                  <th className="pb-2 text-right">Receita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {top_produtos.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-2 pr-4 text-gray-400 font-mono text-xs">{i + 1}</td>
                    <td className="py-2 pr-4 font-medium text-gray-800">{p.nome}</td>
                    <td className="py-2 pr-4 text-gray-500">{p.categoria}</td>
                    <td className="py-2 pr-4 text-right font-mono">{p.quantidade}</td>
                    <td className="py-2 text-right font-mono font-semibold text-orange-600">{brl(p.receita)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-gray-400 text-center py-8">Sem vendas registradas.</p>}
      </Card>
    </Section>
  );
}

// ── Report 2: Estoque ─────────────────────────────────────────────────────────

function RelatorioEstoqueSection({ data }: { data: RelatorioEstoque }) {
  const { resumo, produtos_criticos, sem_vendas, por_categoria } = data;

  return (
    <Section title="Análise de Estoque e Produtos" badge="Gerencial">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total Produtos" value={String(resumo.total_produtos)} />
        <KpiCard label="Valor em Estoque" value={brl(resumo.valor_total_estoque)} />
        <KpiCard label="Sem Estoque" value={String(resumo.sem_estoque)} color={resumo.sem_estoque > 0 ? "text-red-600" : "text-gray-800"} />
        <KpiCard label="Estoque Crítico" value={String(resumo.estoque_critico)} color={resumo.estoque_critico > 0 ? "text-orange-500" : "text-gray-800"} sub="< 10 unidades" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Valor do Estoque por Categoria">
          {por_categoria.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={por_categoria} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="categoria" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Bar dataKey="valor" name="Valor" radius={[0, 4, 4, 0]}>
                  {por_categoria.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-8">Sem dados.</p>}
        </Card>

        <Card title="Unidades por Categoria">
          {por_categoria.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={por_categoria}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="categoria" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="unidades" name="Unidades em Estoque" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-8">Sem dados.</p>}
        </Card>
      </div>

      <Card title="Produtos com Estoque Baixo / Crítico (top 20)">
        {produtos_criticos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b">
                  <th className="pb-2 pr-4">Produto</th>
                  <th className="pb-2 pr-4">Categoria</th>
                  <th className="pb-2 pr-4 text-right">Estoque</th>
                  <th className="pb-2 pr-4 text-right">Já Vendido</th>
                  <th className="pb-2 pr-4 text-right">Preço</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {produtos_criticos.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-800">{p.nome}</td>
                    <td className="py-2 pr-4 text-gray-500">{p.categoria}</td>
                    <td className={`py-2 pr-4 text-right font-mono font-bold ${p.estoque === 0 ? "text-red-600" : p.estoque < 10 ? "text-orange-500" : "text-yellow-600"}`}>{p.estoque}</td>
                    <td className="py-2 pr-4 text-right font-mono text-gray-600">{p.total_vendido}</td>
                    <td className="py-2 pr-4 text-right font-mono text-gray-600">{brl(p.preco)}</td>
                    <td className="py-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ALERTA_BG[p.alerta]}`}>{p.alerta}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-gray-400 text-center py-8">Todos os produtos com estoque adequado.</p>}
      </Card>

      {sem_vendas.length > 0 && (
        <Card title={`Produtos Sem Nenhuma Venda (${sem_vendas.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b">
                  <th className="pb-2 pr-4">Produto</th>
                  <th className="pb-2 pr-4">Categoria</th>
                  <th className="pb-2 pr-4 text-right">Estoque</th>
                  <th className="pb-2 text-right">Preço</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sem_vendas.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-800">{p.nome}</td>
                    <td className="py-2 pr-4 text-gray-500">{p.categoria}</td>
                    <td className="py-2 pr-4 text-right font-mono text-gray-600">{p.estoque}</td>
                    <td className="py-2 text-right font-mono text-gray-600">{brl(p.preco)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Section>
  );
}

// ── Report 3: Retenção de Clientes (Estratégico) ──────────────────────────────

function RelatorioRetencao({ clientes }: { clientes: ChurnCliente[] }) {
  const altoRisco = clientes.filter((c) => c.risco_churn === "Alto");
  const medioRisco = clientes.filter((c) => c.risco_churn === "Médio");
  const receitaEmRisco = altoRisco.reduce((s, c) => s + c.receita_total, 0);

  const acoes: Record<string, string> = {
    Alto: "Contato urgente — oferecer desconto ou condição especial para reativação",
    Médio: "Acompanhamento proativo — enviar proposta personalizada nos próximos 30 dias",
    Baixo: "Manter relacionamento — foco em upsell e cross-sell",
  };

  const segmentos = [
    { nome: "Alto Risco", qtd: altoRisco.length, cor: "bg-red-500" },
    { nome: "Médio Risco", qtd: medioRisco.length, cor: "bg-orange-500" },
    { nome: "Baixo Risco", qtd: clientes.length - altoRisco.length - medioRisco.length, cor: "bg-green-500" },
  ];

  const pieData = segmentos.filter((s) => s.qtd > 0).map((s, i) => ({
    name: s.nome, value: s.qtd, fill: ["#ef4444", "#f97316", "#22c55e"][i],
  }));

  return (
    <Section title="Retenção de Clientes — Análise de Churn" badge="Estratégico">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total Clientes" value={String(clientes.length)} />
        <KpiCard label="Alto Risco" value={String(altoRisco.length)}
          sub={`${((altoRisco.length / (clientes.length || 1)) * 100).toFixed(0)}% da base`}
          color="text-red-600" />
        <KpiCard label="Médio Risco" value={String(medioRisco.length)} color="text-orange-500" />
        <KpiCard label="Receita em Risco" value={brl(receitaEmRisco)}
          sub="clientes alto risco" color="text-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Distribuição de Risco">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}
                  label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-8">Sem dados.</p>}
        </Card>

        <Card title="Ações Recomendadas por Segmento">
          <div className="flex flex-col gap-4">
            {segmentos.map((s) => (
              <div key={s.nome} className="flex gap-3">
                <div className={`w-2 rounded-full shrink-0 ${s.cor}`} />
                <div>
                  <p className="text-sm font-bold text-gray-700">{s.nome} — {s.qtd} cliente{s.qtd !== 1 ? "s" : ""}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{acoes[s.nome.replace(" Risco", "")]}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Clientes com Maior Risco de Churn">
        {altoRisco.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b">
                  <th className="pb-2 pr-4">Cliente</th>
                  <th className="pb-2 pr-4">Localidade</th>
                  <th className="pb-2 pr-4 text-right">Receita Total</th>
                  <th className="pb-2 pr-4 text-right">Taxa Canc.</th>
                  <th className="pb-2 pr-4 text-right">Último Pedido</th>
                  <th className="pb-2 text-right">Prob. Churn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {altoRisco.slice(0, 15).map((c) => (
                  <tr key={c.cliente_id} className="hover:bg-gray-50">
                    <td className="py-2 pr-4">
                      <p className="font-medium text-gray-800">{c.nome}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{c.cidade}/{c.estado}</td>
                    <td className="py-2 pr-4 text-right font-mono">{brl(c.receita_total)}</td>
                    <td className="py-2 pr-4 text-right font-mono text-red-500">{pct(c.taxa_cancelamento)}</td>
                    <td className="py-2 pr-4 text-right text-gray-500">{c.dias_desde_ultimo_pedido != null ? `${c.dias_desde_ultimo_pedido}d atrás` : "—"}</td>
                    <td className="py-2 text-right font-bold text-red-600">{pct(c.probabilidade_churn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-gray-400 text-center py-8">Nenhum cliente com alto risco de churn.</p>}
      </Card>
    </Section>
  );
}

// ── Report 4: Oportunidades de Expansão (Estratégico) ─────────────────────────

function RelatorioOportunidades({ clientes }: { clientes: ChurnCliente[] }) {
  const oportunidades = clientes
    .filter((c) => c.scoring_compra >= 0.5 && c.risco_churn !== "Alto")
    .sort((a, b) => b.scoring_compra - a.scoring_compra);

  const reativar = clientes.filter(
    (c) => c.risco_churn === "Médio" && c.dias_desde_ultimo_pedido !== null && c.dias_desde_ultimo_pedido > 30
  );

  const receitaPotencial = oportunidades.reduce((s, c) => s + c.ticket_medio, 0);

  const porEstado = oportunidades.reduce<Record<string, number>>((acc, c) => {
    acc[c.estado] = (acc[c.estado] ?? 0) + 1;
    return acc;
  }, {});
  const barEstado = Object.entries(porEstado)
    .map(([estado, qtd]) => ({ estado, qtd }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 10);

  return (
    <Section title="Oportunidades de Expansão e Upsell" badge="Estratégico">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Oportunidades" value={String(oportunidades.length)} sub="alta propensão de compra" />
        <KpiCard label="Para Reativar" value={String(reativar.length)} sub="risco médio + inativos 30d" color="text-orange-500" />
        <KpiCard label="Ticket Médio Potencial" value={brl(receitaPotencial / (oportunidades.length || 1))} />
        <KpiCard label="Score Médio" value={pct((oportunidades.reduce((s, c) => s + c.scoring_compra, 0)) / (oportunidades.length || 1))} color="text-green-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Top Oportunidades por Estado">
          {barEstado.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barEstado}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="estado" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="qtd" name="Clientes" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-8">Sem dados.</p>}
        </Card>

        <Card title="Distribuição de Score de Compra">
          {oportunidades.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={[
                { faixa: "50–60%", qtd: oportunidades.filter((c) => c.scoring_compra < 0.6).length },
                { faixa: "60–70%", qtd: oportunidades.filter((c) => c.scoring_compra >= 0.6 && c.scoring_compra < 0.7).length },
                { faixa: "70–80%", qtd: oportunidades.filter((c) => c.scoring_compra >= 0.7 && c.scoring_compra < 0.8).length },
                { faixa: "80–90%", qtd: oportunidades.filter((c) => c.scoring_compra >= 0.8 && c.scoring_compra < 0.9).length },
                { faixa: "90–100%", qtd: oportunidades.filter((c) => c.scoring_compra >= 0.9).length },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="faixa" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="qtd" name="Clientes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-8">Sem dados.</p>}
        </Card>
      </div>

      <Card title="Clientes Prioritários para Abordagem Comercial">
        {oportunidades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b">
                  <th className="pb-2 pr-4">Cliente</th>
                  <th className="pb-2 pr-4">Localidade</th>
                  <th className="pb-2 pr-4 text-right">Receita Total</th>
                  <th className="pb-2 pr-4 text-right">Ticket Médio</th>
                  <th className="pb-2 pr-4 text-right">Pedidos/mês</th>
                  <th className="pb-2 pr-4 text-right">Score Compra</th>
                  <th className="pb-2 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {oportunidades.slice(0, 15).map((c) => (
                  <tr key={c.cliente_id} className="hover:bg-gray-50">
                    <td className="py-2 pr-4">
                      <p className="font-medium text-gray-800">{c.nome}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{c.cidade}/{c.estado}</td>
                    <td className="py-2 pr-4 text-right font-mono">{brl(c.receita_total)}</td>
                    <td className="py-2 pr-4 text-right font-mono">{brl(c.ticket_medio)}</td>
                    <td className="py-2 pr-4 text-right font-mono">{c.pedidos_por_mes.toFixed(1)}</td>
                    <td className="py-2 pr-4 text-right font-bold text-green-600">{pct(c.scoring_compra)}</td>
                    <td className="py-2 text-center">
                      <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                        {c.scoring_compra >= 0.8 ? "Upsell" : "Follow-up"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-gray-400 text-center py-8">Sem oportunidades identificadas.</p>}
      </Card>

      {reativar.length > 0 && (
        <Card title="Clientes para Reativação (Médio Risco + Inativos > 30 dias)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b">
                  <th className="pb-2 pr-4">Cliente</th>
                  <th className="pb-2 pr-4">Localidade</th>
                  <th className="pb-2 pr-4 text-right">Receita Total</th>
                  <th className="pb-2 pr-4 text-right">Último Pedido</th>
                  <th className="pb-2 text-right">Risco Churn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reativar.slice(0, 10).map((c) => (
                  <tr key={c.cliente_id} className="hover:bg-gray-50">
                    <td className="py-2 pr-4">
                      <p className="font-medium text-gray-800">{c.nome}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{c.cidade}/{c.estado}</td>
                    <td className="py-2 pr-4 text-right font-mono">{brl(c.receita_total)}</td>
                    <td className="py-2 pr-4 text-right text-orange-500">{c.dias_desde_ultimo_pedido}d atrás</td>
                    <td className="py-2 text-right">
                      <span className="text-xs bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full">{pct(c.probabilidade_churn)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Section>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "vendas" | "estoque" | "retencao" | "oportunidades";

const TABS: { id: Tab; label: string; tipo: string }[] = [
  { id: "vendas", label: "Desempenho de Vendas", tipo: "Gerencial" },
  { id: "estoque", label: "Análise de Estoque", tipo: "Gerencial" },
  { id: "retencao", label: "Retenção de Clientes", tipo: "Estratégico" },
  { id: "oportunidades", label: "Oportunidades de Expansão", tipo: "Estratégico" },
];

export default function RelatoriosPage() {
  const [tab, setTab] = useState<Tab>("vendas");
  const [vendas, setVendas] = useState<RelatorioVendas | null>(null);
  const [estoque, setEstoque] = useState<RelatorioEstoque | null>(null);
  const [clientes, setClientes] = useState<ChurnCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const [v, e] = await Promise.all([
        api.relatorios.vendas(),
        api.relatorios.estoque(),
      ]);
      setVendas(v);
      setEstoque(e);
      // ML data — optional, doesn't block if Python service is down
      api.estrategia.clientes().then(setClientes).catch(() => setClientes([]));
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar relatórios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function imprimir() { window.print(); }

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <p className="text-gray-500 text-sm animate-pulse">Gerando relatórios…</p>
    </div>
  );

  if (erro) return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-4">
      <p className="text-red-500 text-sm">{erro}</p>
      <button onClick={carregar} className="bg-orange-500 text-white text-sm px-4 py-2 rounded-lg">Tentar novamente</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Header */}
      <header className="bg-orange-500 text-white shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-2xl font-black tracking-tight hover:text-orange-200">LogiFlow</a>
            <span className="text-orange-200 text-sm font-medium">Analytics</span>
            <span className="text-orange-300 text-sm">/ Relatórios</span>
          </div>
          <button onClick={imprimir}
            className="bg-white text-orange-600 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-orange-50">
            Imprimir / Exportar PDF
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 print:hidden">
        <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                t.tipo === "Gerencial" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
              }`}>{t.tipo}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main ref={printRef} className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-10">
        {/* Print header */}
        <div className="hidden print:block mb-4">
          <h1 className="text-2xl font-black text-gray-800">LogiFlow Analytics — Relatórios</h1>
          <p className="text-sm text-gray-500">Gerado em {new Date().toLocaleDateString("pt-BR")}</p>
        </div>

        {tab === "vendas" && vendas && <RelatorioVendasSection data={vendas} />}
        {tab === "estoque" && estoque && <RelatorioEstoqueSection data={estoque} />}
        {tab === "retencao" && <RelatorioRetencao clientes={clientes} />}
        {tab === "oportunidades" && <RelatorioOportunidades clientes={clientes} />}
      </main>
    </div>
  );
}
