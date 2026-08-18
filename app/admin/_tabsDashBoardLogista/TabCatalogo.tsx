"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext"; // 🌟 Importando o ThemeContext global

export interface TabCatalogoProps {
  rankingProdutos: Record<string, any>;
  formatarMoeda: (v: number) => string;
  styles?: any;
}

export const TabCatalogo = ({ rankingProdutos, formatarMoeda, styles = {} }: TabCatalogoProps) => {
  const { theme, isModoNoturno } = useTheme(); // 🌟 Consumindo as cores reais do tema

  return (
    <div style={{ width: '100%', overflowX: 'auto', backgroundColor: theme.bgCard, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '10px', boxSizing: 'border-box' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', color: theme.textMain, backgroundColor: 'transparent', ...(styles.table || {}) }}>
        <thead>
          <tr style={{ ...(styles.thRow || {}), borderBottom: `1px solid ${theme.border}`, backgroundColor: theme.inputBg }}>
            <th style={{ ...(styles.th || {}), padding: '12px', textAlign: 'left', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.textSec }}>Produto</th>
            <th style={{ ...(styles.th || {}), padding: '12px', textAlign: 'left', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.textSec }}>Variação / Modelo</th>
            <th style={{ ...(styles.th || {}), padding: '12px', textAlign: 'left', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.textSec }}>Qtd Vendida</th>
            <th style={{ ...(styles.th || {}), padding: '12px', textAlign: 'left', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.textSec }}>Lucro Líquido</th>
            <th style={{ ...(styles.th || {}), padding: '12px', textAlign: 'left', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.textSec }}>Margem Retorno</th>
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
                <tr key={chaveCombinada} style={{ ...(styles.tr || {}), borderBottom: `1px solid ${theme.border}` }}>
                  <td style={{ ...(styles.td || {}), padding: '12px', fontSize: '13px', backgroundColor: 'transparent', fontWeight: "600", color: theme.textMain }}>📦 {nomeProduto}</td>
                  <td style={{ ...(styles.td || {}), padding: '12px', fontSize: '13px', backgroundColor: 'transparent' }}>
                    {variacaoProduto ? (
                      <span style={{ 
                        background: isModoNoturno ? '#334155' : '#f1f5f9', 
                        color: isModoNoturno ? '#f1f5f9' : '#475569', 
                        padding: "4px 8px", 
                        borderRadius: "6px", 
                        fontSize: "12px", 
                        fontWeight: "bold", 
                        border: `1px solid ${theme.border}`, 
                        display: "inline-block" 
                      }}>
                        🎨 {variacaoProduto}
                      </span>
                    ) : (
                      <span style={{ color: theme.textSec }}>—</span>
                    )}
                  </td>
                  <td style={{ ...(styles.td || {}), padding: '12px', fontSize: '13px', backgroundColor: 'transparent', color: theme.textMain }}>{quantidade} un.</td>
                  <td style={{ ...(styles.td || {}), padding: '12px', fontSize: '13px', backgroundColor: 'transparent' }}>
                    <strong style={{ color: lucroLiquido >= 0 ? '#10b981' : '#ef4444' }}>
                      {formatarMoeda(lucroLiquido)}
                    </strong>
                  </td>
                  <td style={{ ...(styles.td || {}), padding: '12px', fontSize: '13px', backgroundColor: 'transparent' }}>
                    <span 
                      style={{ 
                        padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold',
                        background: isMargemAlta ? (isModoNoturno ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7') : (isModoNoturno ? 'rgba(245, 158, 11, 0.2)' : '#fef9c3'), 
                        color: isMargemAlta ? (isModoNoturno ? '#34d399' : '#166534') : (isModoNoturno ? '#fbbf24' : '#854d0e') 
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
              <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: theme.textSec, backgroundColor: 'transparent', fontSize: '13px' }}>
                Sem dados de produtos faturados no período selecionado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};