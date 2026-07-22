"use client";

import React, { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TabLucroRealProps {
  faturamento: number;
  custoTotal: number;
  lucroReal: number;
  despesaFreteLojista: number;
  despesasFixas: number;
  despesasVariaveis: number;
  formatarMoeda: (v: number) => string;
  // 🔥 Alterado para aceitar o objeto agrupado por ano
  evolucaoMensal: Record<string, { mes: string, lucro: number, ano: string }[]>;
}

export const TabLucroReal = ({
  faturamento,
  custoTotal,
  lucroReal,
  despesaFreteLojista,
  despesasFixas,
  despesasVariaveis,
  formatarMoeda,
  evolucaoMensal
}: TabLucroRealProps) => {

  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear().toString());

  const totalCustosVariaveis = custoTotal + despesaFreteLojista + despesasVariaveis;
  const margemContribuicao = faturamento - totalCustosVariaveis;
  const margemPercentual = faturamento > 0 ? (margemContribuicao / faturamento) * 100 : 0;

  // Lógica de Recordes e Processamento de Dados
  const dadosProcessados = useMemo(() => {
    // 1. Transformamos o objeto { ano: [meses] } em um array plano
    const todosOsDados = Object.values(evolucaoMensal || {}).flat();

    if (!todosOsDados || todosOsDados.length === 0) {
      return { melhorMes: { mes: '-', ano: '-', lucro: 0 }, melhorAno: { ano: 'N/A', valor: 0 } };
    }

    // 2. Melhor Mês
    const melhorMes = todosOsDados.reduce((prev, curr) =>
      (curr.lucro > (prev?.lucro || 0) ? curr : prev), todosOsDados[0]);

    // 3. Melhor Ano (Ajustado para garantir a soma)
    const lucrosPorAno = todosOsDados.reduce((acc: any, curr) => {
      const ano = curr.ano.toString(); // Garante que é string
      acc[ano] = (acc[ano] || 0) + curr.lucro;
      return acc;
    }, {});

    // Filtra para garantir que não estamos comparando 'undefined'
    const anosArray = Object.entries(lucrosPorAno);

    const melhorAno = anosArray.reduce((prev: any, curr: any) => {
      // curr[1] é o lucro, curr[0] é o ano
      return (curr[1] > prev.valor) ? { ano: curr[0], valor: curr[1] } : prev;
    }, { ano: 'N/A', valor: 0 });

    return { melhorMes, melhorAno };
  }, [evolucaoMensal]);

  return (
    <div style={localStyles.container}>

      {/* 1. CARDS DE RECORDE (GAMIFICAÇÃO) */}
      <div style={localStyles.kpiGrid}>
        <div style={localStyles.kpiCard}>
          <span style={localStyles.cardLabel}>🏆 Melhor Mês da História</span>
          <h4 style={{ margin: '5px 0 0 0' }}>{dadosProcessados.melhorMes?.mes || '-'} / {dadosProcessados.melhorMes?.ano || '-'}</h4>
          <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '18px' }}>{formatarMoeda(dadosProcessados.melhorMes?.lucro || 0)}</div>
        </div>
        <div style={localStyles.kpiCard}>
          <span style={localStyles.cardLabel}>🚀 Melhor Ano de Lucro</span>
          <h4 style={{ margin: '5px 0 0 0' }}>Ano de {dadosProcessados.melhorAno.ano}</h4>
          <div style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '18px' }}>{formatarMoeda(dadosProcessados.melhorAno.valor)}</div>
        </div>
      </div>

      {/* 2. INDICADORES ATUAIS */}
      <div style={localStyles.kpiGrid}>
        <div style={localStyles.kpiCard}>
          <span style={localStyles.cardLabel}>Margem de Contribuição</span>
          <h3 style={{ ...localStyles.kpiVal, color: margemPercentual > 30 ? '#10b981' : '#f59e0b' }}>
            {margemPercentual.toFixed(1)}%
          </h3>
        </div>
        <div style={localStyles.kpiCard}>
          <span style={localStyles.cardLabel}>Lucro Líquido Real</span>
          <h3 style={{ ...localStyles.kpiVal, color: lucroReal >= 0 ? '#10b981' : '#ef4444' }}>
            {formatarMoeda(lucroReal)}
          </h3>
        </div>
      </div>

      {/* 3. GRÁFICO DE EVOLUÇÃO */}
      <div style={localStyles.dreCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h4 style={localStyles.dreTitle}>📈 Evolução Mensal do Lucro</h4>
          <select value={anoSelecionado} onChange={(e) => setAnoSelecionado(e.target.value)} style={{ padding: '5px', borderRadius: '5px' }}>
            {Object.keys(evolucaoMensal).map(ano => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>
        </div>
        <div style={{ height: '250px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            {/* 🔥 Agora o gráfico lê o ano específico do objeto */}
            <LineChart data={evolucaoMensal[anoSelecionado] || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(value: any) => formatarMoeda(Number(value) || 0)} />
              <Line type="monotone" dataKey="lucro" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="Lucro" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. DRE GERENCIAL */}
      <div style={{ ...localStyles.dreCard, marginTop: '20px' }}>
        <h4 style={localStyles.dreTitle}>📊 Demonstrativo de Resultados</h4>
        <div style={localStyles.row}><span>Receita Bruta Total</span> <span>{formatarMoeda(faturamento)}</span></div>
        <div style={{ ...localStyles.row, color: '#ef4444' }}>
          <span>(-) Custos Variáveis (Insumos + Fretes + Despesas Var.)</span>
          <span>- {formatarMoeda(totalCustosVariaveis)}</span>
        </div>
        <div style={{ ...localStyles.row, background: '#f8fafc', fontWeight: 'bold', padding: '8px' }}>
          <span>(=) Margem de Contribuição</span>
          <span>{formatarMoeda(margemContribuicao)}</span>
        </div>
        <div style={{ ...localStyles.row, color: '#ef4444', marginTop: '10px' }}>
          <span>(-) Despesas Fixas (Aba Despesas)</span>
          <span>- {formatarMoeda(despesasFixas)}</span>
        </div>
        <div style={{ ...localStyles.row, borderTop: '2px solid #1e293b', marginTop: '10px', paddingTop: '10px', fontWeight: 'bold' }}>
          <span>(=) LUCRO LÍQUIDO FINAL</span>
          <span>{formatarMoeda(lucroReal)}</span>
        </div>
      </div>

      <div style={localStyles.auditoriaFooter}>
        💡 <strong>Dica de Gestão:</strong> Sua Margem de Contribuição ideal deve estar acima de 30%.
        {margemPercentual < 30 && " Sua margem está baixa. Revise seu preço de venda ou o custo dos insumos."}
      </div>
    </div>
  );
};

const localStyles: Record<string, React.CSSProperties> = {
  container: { padding: "10px 0", fontFamily: "sans-serif" },
  kpiGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "25px" },
  kpiCard: { background: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", textAlign: "center" },
  kpiVal: { margin: "10px 0 0 0", fontSize: "28px" },
  dreCard: { background: "#fff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" },
  dreTitle: { margin: "0 0 15px 0", borderBottom: "1px solid #eee", paddingBottom: "10px" },
  row: { display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "14px" },
  cardLabel: { fontSize: "11px", color: "#64748b", fontWeight: "800", textTransform: "uppercase" },
  auditoriaFooter: { background: "#eff6ff", padding: "15px", borderRadius: "8px", marginTop: "20px", fontSize: "13px", color: "#1e40af" }
};