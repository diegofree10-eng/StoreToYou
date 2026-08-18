"use client";

import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTheme } from "@/context/ThemeContext"; // 🌟 Importando o hook do tema global

export interface TabRelatorioHistoricoProps {
  pedidos: any[]; 
  formatarMoeda: (v: number) => string;
}

export const TabRelatorioHistorico = ({ 
  pedidos, 
  formatarMoeda
}: TabRelatorioHistoricoProps) => {

  const { theme } = useTheme(); // 🌟 Consumindo diretamente o tema global definido no ThemeContext

  const { relatorio, melhorMes, melhorAno } = useMemo(() => {
    const resumoAnual: Record<string, { faturamento: number, lucro: number, pedidos: number }> = {};
    const todosOsMeses: { mes: string, lucro: number, ano: string }[] = [];

    pedidos.forEach(p => {
      if (p.status?.toLowerCase() !== 'concluído' || p.devolvido) return;

      const data = new Date(p.data);
      const ano = data.getFullYear().toString();
      const valor = Number(p.financeiro?.total || 0);
      const lucroEstimado = valor * 0.4;

      if (!resumoAnual[ano]) resumoAnual[ano] = { faturamento: 0, lucro: 0, pedidos: 0 };
      resumoAnual[ano].faturamento += valor;
      resumoAnual[ano].lucro += lucroEstimado;
      resumoAnual[ano].pedidos += 1;

      const mesNome = data.toLocaleDateString('pt-BR', { month: 'short' });
      todosOsMeses.push({ mes: mesNome, lucro: lucroEstimado, ano });
    });

    const listaAnual = Object.entries(resumoAnual).map(([ano, dados]) => ({ ano, ...dados }));

    // Cálculo do Melhor Mês da História
    const melhorMes = todosOsMeses.reduce((prev, curr) => 
      (curr.lucro > (prev?.lucro || 0) ? curr : prev), todosOsMeses[0] || { mes: '-', ano: '-', lucro: 0 }
    );

    // Cálculo do Melhor Ano de Lucro
    const melhorAno = listaAnual.reduce((prev: any, curr: any) => {
      return (curr.lucro > (prev?.lucro || 0)) ? { ano: curr.ano, valor: curr.lucro } : prev;
    }, { ano: 'N/A', valor: 0 });

    return { relatorio: listaAnual, melhorMes, melhorAno };
  }, [pedidos]);

  const cardStyle: React.CSSProperties = { background: theme.bgCard, padding: '20px', borderRadius: '12px', border: `1px solid ${theme.border}`, textAlign: 'center', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { fontSize: '11px', color: theme.textSec, textTransform: 'uppercase', fontWeight: 'bold' };
  const valStyle: React.CSSProperties = { margin: '10px 0 0 0', fontSize: '20px', color: theme.textMain, wordBreak: 'break-word' };

  return (
    <div style={{ padding: '10px 0', color: theme.textMain }} className="tab-historico-container">
      <h2 style={{ color: theme.textMain, fontSize: '18px', marginBottom: '16px' }}>📊 Evolução Histórica da Empresa</h2>

      {/* Cards de Recordes (Gamificação) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }} className="kpi-grid-historico">
        <div style={cardStyle}>
          <span style={labelStyle}>🏆 Melhor Mês da História</span>
          <h4 style={{ margin: '5px 0 0 0', color: theme.textMain, fontSize: '15px' }}>{melhorMes?.mes || '-'} / {melhorMes?.ano || '-'}</h4>
          <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '18px', marginTop: '4px' }}>{formatarMoeda(melhorMes?.lucro || 0)}</div>
        </div>
        <div style={cardStyle}>
          <span style={labelStyle}>🚀 Melhor Ano de Lucro</span>
          <h4 style={{ margin: '5px 0 0 0', color: theme.textMain, fontSize: '15px' }}>Ano de {melhorAno.ano}</h4>
          <div style={{ color: theme.primary, fontWeight: 'bold', fontSize: '18px', marginTop: '4px' }}>{formatarMoeda(melhorAno.valor)}</div>
        </div>
      </div>

      {/* Cards de Performance Geral */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }} className="kpi-grid-historico">
        <div style={cardStyle}>
          <span style={labelStyle}>Total de Anos Ativos</span>
          <h3 style={valStyle}>{relatorio.length}</h3>
        </div>
        <div style={cardStyle}>
          <span style={labelStyle}>Faturamento Acumulado</span>
          <h3 style={valStyle}>{formatarMoeda(relatorio.reduce((acc, curr) => acc + curr.faturamento, 0))}</h3>
        </div>
        <div style={cardStyle}>
          <span style={labelStyle}>Lucro Acumulado</span>
          <h3 style={valStyle}>{formatarMoeda(relatorio.reduce((acc, curr) => acc + curr.lucro, 0))}</h3>
        </div>
      </div>

      {/* Gráfico Comparativo */}
      <div style={{ background: theme.bgCard, padding: '16px', borderRadius: '12px', border: `1px solid ${theme.border}`, boxSizing: 'border-box' }}>
        <h4 style={{ marginBottom: '20px', fontSize: '14px', color: theme.textMain }}>Comparativo Anual (Faturamento vs Lucro)</h4>
        <div style={{ height: '320px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={relatorio}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis dataKey="ano" fontSize={12} stroke={theme.textSec} />
              <YAxis fontSize={12} stroke={theme.textSec} />
              <Tooltip 
                formatter={(value: any) => formatarMoeda(Number(value) || 0)} 
                contentStyle={{ backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.textMain }}
              />
              <Legend wrapperStyle={{ color: theme.textMain }} />
              <Bar dataKey="faturamento" fill={theme.primary} name="Faturamento" />
              <Bar dataKey="lucro" fill="#10b981" name="Lucro" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Estilos responsivos exclusivos para mobile */}
      <style jsx>{`
        @media (max-width: 768px) {
          .kpi-grid-historico {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};