"use client";

import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TabRelatorioHistoricoProps {
  pedidos: any[]; 
  formatarMoeda: (v: number) => string;
}

export const TabRelatorioHistorico = ({ pedidos, formatarMoeda }: TabRelatorioHistoricoProps) => {

  const relatorio = useMemo(() => {
    const resumoAnual: Record<string, { faturamento: number, lucro: number, pedidos: number }> = {};

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
    });

    return Object.entries(resumoAnual).map(([ano, dados]) => ({ ano, ...dados }));
  }, [pedidos]);

  return (
    <div style={{ padding: '10px 0' }} className="tab-historico-container">
      <h2 style={{ color: '#1e293b', fontSize: '18px', marginBottom: '16px' }}>📊 Evolução Histórica da Empresa</h2>

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
      <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
        <h4 style={{ marginBottom: '20px', fontSize: '14px', color: '#334155' }}>Comparativo Anual (Faturamento vs Lucro)</h4>
        <div style={{ height: '320px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={relatorio}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ano" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(value: any) => formatarMoeda(Number(value) || 0)} />
              <Legend />
              <Bar dataKey="faturamento" fill="#3b82f6" name="Faturamento" />
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

// Estilos base de Desktop mantidos rigorosamente iguais
const cardStyle: React.CSSProperties = { background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' };
const valStyle: React.CSSProperties = { margin: '10px 0 0 0', fontSize: '20px', color: '#1e293b', wordBreak: 'break-word' };