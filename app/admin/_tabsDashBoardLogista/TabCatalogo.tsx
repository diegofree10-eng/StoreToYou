"use client";

import React from "react";

interface TabCatalogoProps {
  rankingProdutos: Record<string, any>;
  formatarMoeda: (v: number) => string;
  styles: any;
}

export const TabCatalogo = ({ rankingProdutos, formatarMoeda, styles }: TabCatalogoProps) => {
  return (
    <table style={styles.table}>
      <thead>
        <tr style={styles.thRow}>
          <th style={styles.th}>Produto</th>
          <th style={styles.th}>Variação / Modelo</th>
          <th style={styles.th}>Qtd Vendida</th>
          <th style={styles.th}>Lucro Líquido</th>
          <th style={styles.th}>Margem Retorno</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(rankingProdutos)
          .sort((a: any, b: any) => (b[1].lucro || 0) - (a[1].lucro || 0))
          .map(([chaveCombinada, d]: any) => {
            const quantidade = Number(d.qtd || d.browse || 0);
            const lucroLiquido = Number(d.lucro || 0);
            const valorTotalVendido = Number(d.valor || 1);
            
            const [nomeProduto, variacaoProduto] = chaveCombinada.split("|||");
            const margemPorcentagem = (lucroLiquido / valorTotalVendido) * 100;
            const isMargemAlta = (lucroLiquido / valorTotalVendido) > 0.5;

            return (
              <tr key={chaveCombinada} style={styles.tr}>
                <td style={{ ...styles.td, fontWeight: "600", color: "#1e293b" }}>📦 {nomeProduto}</td>
                <td style={styles.td}>
                  {variacaoProduto ? (
                    <span style={localStyles.variacaoBadge}>🎨 {variacaoProduto}</span>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>—</span>
                  )}
                </td>
                <td style={styles.td}>{quantidade} un.</td>
                <td style={styles.td}>
                  <strong style={{ color: lucroLiquido >= 0 ? '#27ae60' : '#e74c3c' }}>
                    {formatarMoeda(lucroLiquido)}
                  </strong>
                </td>
                <td style={styles.td}>
                  <span 
                    style={{ 
                      ...styles.badge, 
                      padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold',
                      background: isMargemAlta ? '#dcfce7' : '#fef9c3', 
                      color: isMargemAlta ? '#166534' : '#854d0e' 
                    }}
                  >
                    {margemPorcentagem.toFixed(1)}%
                  </span>
                </td>
              </tr>
            );
          })}
          
        {Object.keys(rankingProdutos).length === 0 && (
          <tr>
            <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
              Sem dados de produtos faturados no período selecionado.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

const localStyles = {
  variacaoBadge: {
    background: "#f1f5f9",
    color: "#475569",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "bold",
    border: "1px solid #e2e8f0",
    display: "inline-block"
  } as React.CSSProperties
};