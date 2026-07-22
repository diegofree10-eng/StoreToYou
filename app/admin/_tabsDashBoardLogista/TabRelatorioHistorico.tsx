"use client";

import React, { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TabRelatorioHistoricoProps {
  pedidos: any[]; // Passaremos todos os pedidos aqui
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

      // Simulação rápida de lucro (ajuste conforme sua regra de custo)
      const lucroEstimado = valor * 0.4;

      if (!resumoAnual[ano]) resumoAnual[ano] = { faturamento: 0, lucro: 0, pedidos: 0 };
      resumoAnual[ano].faturamento += valor;
      resumoAnual[ano].lucro += lucroEstimado;
      resumoAnual[ano].pedidos += 1;
    });

    return Object.entries(resumoAnual).map(([ano, dados]) => ({ ano, ...dados }));
  }, [pedidos]);

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: '#1e293b' }}>📊 Evolução Histórica da Empresa</h2>

      {/* Cards de Performance Geral */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
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
      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ marginBottom: '20px' }}>Comparativo Anual (Faturamento vs Lucro)</h4>
        <div style={{ height: '350px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={relatorio}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ano" />
              <YAxis />
              <Tooltip formatter={(value: any) => formatarMoeda(Number(value) || 0)} />
              <Legend />
              <Bar dataKey="faturamento" fill="#3b82f6" name="Faturamento" />
              <Bar dataKey="lucro" fill="#10b981" name="Lucro" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Estilos simples
const cardStyle: React.CSSProperties = { background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' };
const labelStyle: React.CSSProperties = { fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' };
const valStyle: React.CSSProperties = { margin: '10px 0 0 0', fontSize: '20px', color: '#1e293b' };