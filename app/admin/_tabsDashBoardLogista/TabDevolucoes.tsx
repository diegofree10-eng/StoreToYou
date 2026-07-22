"use client";

import React from "react";

interface TabDevolucoesProps {
  dadosFiltradosBusca: any[];
  formatarDataExibicao: (d: string) => string;
  formatarMoeda: (v: number) => string;
  alternarDevolucao: (id: string, status: boolean) => void;
  styles: any;
}

export const TabDevolucoes = ({ dadosFiltradosBusca, formatarDataExibicao, formatarMoeda, alternarDevolucao, styles }: TabDevolucoesProps) => {
  const itensDevolvidos = dadosFiltradosBusca.filter(p => p.devolvido === true);

  // Definimos o estilo unindo a sua formatação base com as cores de "restaurar"
  const estiloBotao = {
    ...styles.btnRestaurar, // Pega as propriedades base do seu objeto styles
    padding: '6px 12px',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'pointer',
    backgroundColor: '#e0f2fe', // Azul claro
    color: '#0284c7'           // Azul escuro
  };

  return (
    <table style={styles.table}>
      <thead>
        <tr style={styles.thRow}>
          <th style={styles.th}>Data</th>
          <th style={styles.th}>Pedido</th>
          <th style={styles.th}>Cliente</th>
          <th style={styles.th}>Valor Estornado</th>
          <th style={styles.th}>Ação</th>
        </tr>
      </thead>
      <tbody>
        {itensDevolvidos.map(p => (
          <tr key={p.id} style={{ ...styles.tr, background: '#fff5f5' }}>
            <td style={styles.td}>{formatarDataExibicao(p.data)}</td>
            <td style={styles.td}>
              <span style={styles.pedidoBadge}>#{p.numeroPedido || "N/A"}</span>
            </td>
            <td style={styles.td}>
              {typeof p.cliente === 'object' ? (p.cliente?.nome || "Cliente") : (p.cliente || "Cliente")}
            </td>
            <td style={styles.td}>{formatarMoeda(Number(p.financeiro?.total || 0))}</td>
            <td style={styles.td}>
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
            <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
              Nenhum registro de devolução ou cancelamento efetuado.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};