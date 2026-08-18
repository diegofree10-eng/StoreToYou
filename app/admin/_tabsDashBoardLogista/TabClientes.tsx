"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext"; // 🌟 Importando o ThemeContext global

export interface TabClientesProps {
  clientesEstrela: Record<string, any>;
  formatarMoeda: (v: number) => string;
  styles?: any;
}

export const TabClientes = ({ clientesEstrela, formatarMoeda, styles = {} }: TabClientesProps) => {
  const { theme } = useTheme(); // 🌟 Consumindo as cores do tema

  return (
    // 🌟 Wrapper para forçar o fundo do Card e anular resquícios de fundos brancos externos
    <div style={{ width: '100%', overflowX: 'auto', backgroundColor: theme.bgCard, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '10px', boxSizing: 'border-box' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', color: theme.textMain, backgroundColor: 'transparent', ...(styles.table || {}) }}>
        <thead>
          <tr style={{ ...(styles.thRow || {}), borderBottom: `1px solid ${theme.border}`, backgroundColor: theme.inputBg }}>
            <th style={{ ...(styles.th || {}), padding: '12px', textAlign: 'left', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.textSec }}>Nome do Cliente</th>
            <th style={{ ...(styles.th || {}), padding: '12px', textAlign: 'left', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.textSec }}>Qtd de Pedidos</th>
            <th style={{ ...(styles.th || {}), padding: '12px', textAlign: 'left', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.textSec }}>Total Comprado</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(clientesEstrela)
            .sort((a: any, b: any) => b[1].total - a[1].total)
            .map(([nome, d]: any) => {
              // Se d.pedidos for um Set, usamos .size. Se for um número (fallback), usamos ele.
              const qtdPedidos = d.pedidos instanceof Set ? d.pedidos.size : (d.compras || 0);
              
              return (
                <tr key={nome} style={{ ...(styles.tr || {}), borderBottom: `1px solid ${theme.border}` }}>
                  <td style={{ ...(styles.td || {}), padding: '12px', fontSize: '13px', backgroundColor: 'transparent', color: theme.textMain }}>👤 {nome}</td>
                  <td style={{ ...(styles.td || {}), padding: '12px', fontSize: '13px', backgroundColor: 'transparent', color: theme.textMain }}>{qtdPedidos} {qtdPedidos === 1 ? 'pedido' : 'pedidos'}</td>
                  <td style={{ ...(styles.td || {}), padding: '12px', fontSize: '13px', backgroundColor: 'transparent' }}>
                    {/* 🌟 Removendo a cor hardcoded (#2c3e50) e usando a cor principal ou primária do tema */}
                    <strong style={{ color: theme.textMain }}>{formatarMoeda(d.total)}</strong>
                  </td>
                </tr>
              );
            })}
          {Object.keys(clientesEstrela).length === 0 && (
            <tr>
              <td colSpan={3} style={{ textAlign: 'center', padding: '30px', color: theme.textSec, backgroundColor: 'transparent', fontSize: '13px' }}>
                Sem listagem de compradores para este período.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};