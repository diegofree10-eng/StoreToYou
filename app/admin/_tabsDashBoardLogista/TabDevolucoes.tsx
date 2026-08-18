"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";

export interface TabDevolucoesProps {
  dadosFiltradosBusca: any[];
  formatarDataExibicao: (d: string) => string;
  formatarMoeda: (v: number) => string;
  alternarDevolucao: (id: string, status: boolean) => void;
  styles?: any;
}

export const TabDevolucoes = ({ 
  dadosFiltradosBusca, 
  formatarDataExibicao, 
  formatarMoeda, 
  alternarDevolucao, 
  styles = {} 
}: TabDevolucoesProps) => {

  const { theme, isModoNoturno } = useTheme();

  const itensDevolvidos = dadosFiltradosBusca.filter(p => p.devolvido === true);

  const estiloBotao = {
    ...(styles.btnRestaurar || {}),
    padding: '6px 12px',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'pointer',
    backgroundColor: isModoNoturno ? 'rgba(59, 130, 246, 0.2)' : '#e0f2fe',
    color: isModoNoturno ? '#93c5fd' : '#0284c7'
  };

  return (
    <div style={{ width: '100%', overflowX: 'auto', backgroundColor: theme.bgCard, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '10px', boxSizing: 'border-box' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', color: theme.textMain, backgroundColor: 'transparent', ...(styles.table || {}) }}>
        <thead>
          {/* 🌟 O styles.thRow vem primeiro, e as cores do theme vêm depois para forçar o ganho */}
          <tr style={{ ...(styles.thRow || {}), borderBottom: `1px solid ${theme.border}`, backgroundColor: theme.inputBg }}>
            <th style={{ ...(styles.th || {}), padding: '12px', textAlign: 'left', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.textSec }}>Data</th>
            <th style={{ ...(styles.th || {}), padding: '12px', textAlign: 'left', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.textSec }}>Pedido</th>
            <th style={{ ...(styles.th || {}), padding: '12px', textAlign: 'left', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.textSec }}>Cliente</th>
            <th style={{ ...(styles.th || {}), padding: '12px', textAlign: 'left', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.textSec }}>Valor Estornado</th>
            <th style={{ ...(styles.th || {}), padding: '12px', textAlign: 'left', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.textSec }}>Ação</th>
          </tr>
        </thead>
        <tbody>
          {itensDevolvidos.map(p => (
            <tr 
              key={p.id} 
              style={{ 
                ...(styles.tr || {}),
                borderBottom: `1px solid ${theme.border}`, 
                backgroundColor: isModoNoturno ? 'rgba(239, 68, 68, 0.08)' : '#fff5f5'
              }}
            >
              <td style={{ ...(styles.td || {}), padding: '12px', fontSize: '13px', backgroundColor: 'transparent', color: theme.textMain }}>{formatarDataExibicao(p.data)}</td>
              <td style={{ ...(styles.td || {}), padding: '12px', fontSize: '13px', backgroundColor: 'transparent', color: theme.textMain }}>
                <span style={{ ...(styles.pedidoBadge || {}), backgroundColor: isModoNoturno ? '#334155' : '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', color: theme.textMain }}>
                  #{p.numeroPedido || "N/A"}
                </span>
              </td>
              <td style={{ ...(styles.td || {}), padding: '12px', fontSize: '13px', backgroundColor: 'transparent', color: theme.textMain }}>
                {typeof p.cliente === 'object' ? (p.cliente?.nome || "Cliente") : (p.cliente || "Cliente")}
              </td>
              <td style={{ ...(styles.td || {}), padding: '12px', fontSize: '13px', backgroundColor: 'transparent', color: theme.textMain }}>{formatarMoeda(Number(p.financeiro?.total || 0))}</td>
              <td style={{ ...(styles.td || {}), padding: '12px', fontSize: '13px', backgroundColor: 'transparent', color: theme.textMain }}>
                <button 
                  onClick={() => alternarDevolucao(p.id, true)} 
                  style={estiloBotao}
                >
                  Restaurar
                </button>
              </td>
            </tr>
          ))}
          {itensDevolvidos.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: theme.textSec, fontSize: '13px', backgroundColor: 'transparent' }}>
                Nenhum registro de devolução ou cancelamento efetuado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};