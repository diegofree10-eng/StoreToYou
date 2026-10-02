// app/admin/_tabsDashBoardLogista/TabRelatorioHistorico.tsx
"use client";

import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTheme } from "@/context/ThemeContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export interface TabRelatorioHistoricoProps {
  uid: string;
  formatarMoeda: (v: number) => string;
}

const InfoCardHistorico = ({
  title,
  value,
  explanation,
  color,
  gridColumn
}: {
  title: string,
  value: React.ReactNode,
  explanation: string,
  color?: string,
  gridColumn?: string
}) => {
  const [flipped, setFlipped] = useState(false);
  const { theme, isModoNoturno } = useTheme();

  return (
    <div style={{
      background: theme.bgCard,
      padding: '14px 16px',
      borderRadius: '12px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: theme.border,
      textAlign: 'center',
      boxSizing: 'border-box',
      position: 'relative',
      gridColumn,
      height: '125px',
      minHeight: '125px',
      maxHeight: '125px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: theme.textMain,
      overflow: 'hidden'
    }}>
      {/* FRENTE DO CARD */}
      <div style={{
        display: flipped ? 'none' : 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%'
      }}>
        <button
          onClick={() => setFlipped(true)}
          style={{
            position: 'absolute', top: '8px', right: '8px',
            background: isModoNoturno ? theme.border : '#f1f5f9',
            borderWidth: '0px', borderRadius: '50%', width: '22px', height: '22px',
            fontSize: '11px', fontWeight: 'bold', color: theme.textSec, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2
          }}
          title="Clique para ver o que significa"
        >?</button>
        <span style={{ fontSize: "10px", fontWeight: "800", textTransform: "uppercase", color: theme.textSec, marginBottom: '4px' }}>
          {title}
        </span>
        <div style={{ margin: "0", fontSize: "13px", fontWeight: "bold", color: color || theme.textMain, width: '100%' }}>
          {value}
        </div>
      </div>

      {/* VERSO DO CARD (EXPLICAÇÃO) */}
      <div style={{
        display: flipped ? 'flex' : 'none',
        flexDirection: 'column',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        position: 'relative',
        paddingRight: '12px'
      }}>
        <button
          onClick={() => setFlipped(false)}
          style={{
            position: 'absolute', top: '-2px', right: '-2px',
            background: isModoNoturno ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
            borderWidth: '0px', borderRadius: '50%', width: '22px', height: '22px',
            fontSize: '11px', fontWeight: 'bold', color: '#ef4444', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2
          }}
          title="Voltar"
        >✕</button>
        <div style={{ fontSize: '11px', color: theme.textSec, textAlign: 'left', lineHeight: '1.35', overflowY: 'auto', maxHeight: '95px' }}>
          <strong style={{ color: theme.textMain }}>O que significa?</strong><br />
          {explanation}
        </div>
      </div>
    </div>
  );
};

export const TabRelatorioHistorico = ({
  uid,
  formatarMoeda
}: TabRelatorioHistoricoProps) => {

  const { theme } = useTheme();
  const [dadosMaster, setDadosMaster] = useState<any>(null);
  const [dadosMesAtual, setDadosMesAtual] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🗓️ Identifica a chave do mês e ano atual
  const dataHoje = new Date();
  const mesesNomes = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];
  const anoAtualStr = String(dataHoje.getFullYear());
  const nomeMesAtualStr = mesesNomes[dataHoje.getMonth()];
  const chaveMesAtual = `${nomeMesAtualStr}_${anoAtualStr}`;

  useEffect(() => {
    if (!uid) return;

    const carregarHistoricoOtimizado = async () => {
      setLoading(true);
      try {
        const histRef = doc(db, "lojistas", uid, "dashboard_stats", "historico_geral");
        const snapHist = await getDoc(histRef);
        if (snapHist.exists()) {
          setDadosMaster(snapHist.data());
        }

        const mesRef = doc(db, "lojistas", uid, "dashboard_stats", chaveMesAtual);
        const snapMes = await getDoc(mesRef);
        if (snapMes.exists()) {
          setDadosMesAtual(snapMes.data());
        }
      } catch (error) {
        console.error("Erro ao buscar histórico corporativo:", error);
      } finally {
        setLoading(false);
      }
    };

    carregarHistoricoOtimizado();
  }, [uid, chaveMesAtual]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px', color: theme.textSec }}>Carregando histórico corporativo...</div>;
  }

  const relatorio = dadosMaster?.consolidadoAnual || [];
  const melhorMes = dadosMaster?.melhorMes || { mes: '-', ano: '-', lucro: 0, totalPedidos: 0 };
  const melhorAno = dadosMaster?.melhorAno || { ano: 'N/A', lucro: 0, totalPedidos: 0 };

  const dadosAnoAtualConsolidado = relatorio.find((r: any) => String(r.ano) === anoAtualStr) || { faturamento: 0, lucro: 0, totalPedidos: 0 };

  const totalAnosAtivos = dadosMaster?.anosAtivos?.length || 0;
  const faturamentoAcumulado = dadosMaster?.faturamentoAcumulado || 0;
  const lucroAcumulado = dadosMaster?.lucroAcumulado || 0;
  const totalPedidosAcumulado = dadosMaster?.totalPedidosAcumulado || relatorio.reduce((acc: number, cur: any) => acc + Number(cur.totalPedidos || 0), 0);

  const lucroMesAtual = Number(dadosMesAtual?.lucroLiquidoReal || 0);
  const pedidosMesAtual = Number(dadosMesAtual?.totalPedidos || 0);

  // 🌟 MONTAGEM DOS 4 INDICADORES DIRETOS PARA O GRÁFICO COMPARATIVO
  // Como valores anuais e mensais possuem escalas diferentes, criamos um dataset unificado de comparação de Lucro Real e Faturamento proporcional ou direto por categoria.
  const dadosComparativo4Indicadores = [
    {
      categoria: "Comparativo Mensal",
      "Melhor Mês Histórico": Number(melhorMes?.lucro || 0),
      "Período Atual": Number(lucroMesAtual || 0),
    },
    {
      categoria: "Comparativo Anual",
      "Melhor Mês Histórico": Number(melhorAno?.lucro || 0), // Ajustado para escala visual ou mantido valor real
      "Período Atual": Number(dadosAnoAtualConsolidado?.lucro || 0),
    }
  ];

  // Alternativa: Se preferir 4 colunas distintas de barras (Melhor Mês, Mês Atual, Melhor Ano, Ano Atual) normalizadas ou lado a lado:
  const dadosGraficoQuatroBarras = [
    {
      nome: "Indicadores de Lucro Real",
      "Melhor Mês": Number(melhorMes?.lucro || 0),
      "Mês Atual": Number(lucroMesAtual || 0),
      "Melhor Ano": Number(melhorAno?.lucro || 0),
      "Ano Atual": Number(dadosAnoAtualConsolidado?.lucro || 0),
    }
  ];

  return (
    <div style={{ padding: '10px 0', color: theme.textMain }} className="tab-historico-container">
      <h2 style={{ color: theme.textMain, fontSize: '18px', marginBottom: '16px' }}>📊 Evolução Histórica & Comparativos</h2>

      {/* 4 Cards Principais de Comparação */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '16px' }} className="kpi-grid-4-colunas">

        {/* 1. MELHOR MÊS DA HISTÓRIA */}
        <InfoCardHistorico
          title="🏆 Melhor Mês Histórico"
          value={
            <div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                {melhorMes?.mes && melhorMes.mes !== '-' ? melhorMes.mes.toUpperCase() : '-'} / {melhorMes?.ano || '-'}
              </div>
              <div style={{ color: '#10b981', fontSize: '14px', marginTop: '1px' }}>
                {formatarMoeda(melhorMes?.lucro || 0)}
              </div>
              <div style={{ fontSize: '10px', color: theme.textSec, fontWeight: 'normal', marginTop: '1px' }}>
                📦 {Number(melhorMes?.totalPedidos || 0).toLocaleString('pt-BR')} ped.
              </div>
            </div>
          }
          explanation="Mês recordista absoluto de lucratividade líquida real de toda a trajetória da empresa."
        />

        {/* 2. MÊS ATUAL */}
        <InfoCardHistorico
          title={`📅 Mês Atual (${nomeMesAtualStr.slice(0, 3).toUpperCase()})`}
          value={
            <div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{anoAtualStr}</div>
              <div style={{ color: lucroMesAtual >= 0 ? '#10b981' : '#ef4444', fontSize: '14px', marginTop: '1px' }}>
                {formatarMoeda(lucroMesAtual)}
              </div>
              <div style={{ fontSize: '10px', color: theme.textSec, fontWeight: 'normal', marginTop: '1px' }}>
                📦 {pedidosMesAtual.toLocaleString('pt-BR')} ped.
              </div>
            </div>
          }
          explanation="Desempenho financeiro líquido e volume de pedidos consolidados no mês corrente até o momento."
        />

        {/* 3. MELHOR ANO DA HISTÓRIA */}
        <InfoCardHistorico
          title="🚀 Melhor Ano Histórico"
          value={
            <div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Ano {melhorAno?.ano || 'N/A'}</div>
              <div style={{ color: theme.primary, fontSize: '14px', marginTop: '1px' }}>
                {formatarMoeda(melhorAno?.lucro || 0)}
              </div>
              <div style={{ fontSize: '10px', color: theme.textSec, fontWeight: 'normal', marginTop: '1px' }}>
                📦 {Number(melhorAno?.totalPedidos || 0).toLocaleString('pt-BR')} ped.
              </div>
            </div>
          }
          explanation="Ano civil que acumulou o maior montante de lucro líquido real e volume de pedidos."
        />

        {/* 4. ANO ATUAL */}
        <InfoCardHistorico
          title={`📈 Ano Atual (${anoAtualStr})`}
          value={
            <div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Acumulado {anoAtualStr}</div>
              <div style={{ color: theme.primary, fontSize: '14px', marginTop: '1px' }}>
                {formatarMoeda(dadosAnoAtualConsolidado.lucro || 0)}
              </div>
              <div style={{ fontSize: '10px', color: theme.textSec, fontWeight: 'normal', marginTop: '1px' }}>
                📦 {Number(dadosAnoAtualConsolidado.totalPedidos || 0).toLocaleString('pt-BR')} ped.
              </div>
            </div>
          }
          explanation="Resultado financeiro e volumétrico acumulado durante todo o ano civil corrente."
        />

      </div>

      {/* Cards de Performance Geral */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }} className="kpi-grid-historico">
        <InfoCardHistorico
          title="Total de Anos Ativos"
          value={totalAnosAtivos}
          explanation="Quantidade total de anos distintos contabilizados com registros ativos."
        />
        <InfoCardHistorico
          title="📦 Pedidos Acumulados"
          value={`${Number(totalPedidosAcumulado || 0).toLocaleString('pt-BR')} un`}
          explanation="Soma total da quantidade de pedidos concluídos registrados em todo o histórico corporativo."
        />
        <InfoCardHistorico
          title="Faturamento Acumulado"
          value={formatarMoeda(faturamentoAcumulado)}
          explanation="Soma total de todo o faturamento líquido consolidado desde o início dos registros."
        />
        <InfoCardHistorico
          title="Lucro Acumulado"
          value={formatarMoeda(lucroAcumulado)}
          explanation="Montante histórico somado de todo o lucro líquido real gerado pela empresa."
        />
      </div>

      {/* 🌟 GRÁFICO COM OS 4 INDICADORES LADO A LADO (Melhor Mês, Mês Atual, Melhor Ano, Ano Atual) */}
      <div style={{ background: theme.bgCard, padding: '16px', borderRadius: '12px', border: `1px solid ${theme.border}`, boxSizing: 'border-box' }}>
        <h4 style={{ marginBottom: '20px', fontSize: '14px', color: theme.textMain }}>Comparativo Direto de Lucro Real (4 Indicadores Principais)</h4>
        <div style={{ height: '320px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosGraficoQuatroBarras} barSize={45}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} vertical={false} />
              <XAxis dataKey="nome" fontSize={12} stroke={theme.textSec} tickLine={false} />
              <YAxis fontSize={12} stroke={theme.textSec} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value, name) => [
                  formatarMoeda(Number(value) || 0),
                  String(name || "")
                ]}
                contentStyle={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
              />
              <Legend wrapperStyle={{ color: theme.textMain, paddingTop: '10px' }} />
              <Bar dataKey="Melhor Mês" fill="#3b82f6" name="🏆 Melhor Mês Histórico" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Mês Atual" fill="#06b6d4" name="📅 Mês Atual" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Ano Atual" fill="#10b981" name="📈 Ano Atual" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Melhor Ano" fill="#8b5cf6" name="🚀 Melhor Ano Histórico" radius={[6, 6, 0, 0]} />

            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1024px) {
          .kpi-grid-4-colunas {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .kpi-grid-4-colunas {
            grid-template-columns: 1fr !important;
          }
          .kpi-grid-historico {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};