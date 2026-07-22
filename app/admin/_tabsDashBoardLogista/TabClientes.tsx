"use client";

import React from "react";

interface TabClientesProps {
  clientesEstrela: Record<string, any>;
  formatarMoeda: (v: number) => string;
  styles: any;
}

export const TabClientes = ({ clientesEstrela, formatarMoeda, styles }: TabClientesProps) => {
  return (
    <table style={styles.table}>
      <thead>
        <tr style={styles.thRow}>
          <th style={styles.th}>Nome do Cliente</th>
          <th style={styles.th}>Qtd de Pedidos</th>
          <th style={styles.th}>Total Comprado</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(clientesEstrela)
          .sort((a: any, b: any) => b[1].total - a[1].total)
          .map(([nome, d]: any) => {
            // Se d.pedidos for um Set, usamos .size. Se for um número (fallback), usamos ele.
            const qtdPedidos = d.pedidos instanceof Set ? d.pedidos.size : (d.compras || 0);
            
            return (
              <tr key={nome} style={styles.tr}>
                <td style={styles.td}>👤 {nome}</td>
                <td style={styles.td}>{qtdPedidos} {qtdPedidos === 1 ? 'pedido' : 'pedidos'}</td>
                <td style={styles.td}>
                  <strong style={{ color: '#2c3e50' }}>{formatarMoeda(d.total)}</strong>
                </td>
              </tr>
            );
          })}
        {Object.keys(clientesEstrela).length === 0 && (
          <tr>
            <td colSpan={3} style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
              Sem listagem de compradores para este período.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};