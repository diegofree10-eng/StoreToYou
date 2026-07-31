"use client";

import React, { useState, useMemo, useEffect } from "react";

export interface TabVendasProps {
  pedidos: any[];
  formatarDataExibicao: (data: any) => string;
  formatarMoeda: (valor: any) => string;
  alternarDevolucao: (id: string, statusAtual: boolean) => void; // <--- Atualize aqui
  pedidoExpandido: string | null;
  setPedidoExpandido: React.Dispatch<React.SetStateAction<string | null>>;
  LinhaPedido: React.ComponentType<any>;
  styles: { [key: string]: React.CSSProperties };
  itensPorPagina: number;
}

export const TabVendas = ({
  pedidos,
  formatarDataExibicao,
  formatarMoeda,
  alternarDevolucao,
  pedidoExpandido,
  setPedidoExpandido,
  LinhaPedido,
  styles,
  itensPorPagina
}: TabVendasProps) => {

  const [paginaAtual, setPaginaAtual] = useState(1);

  // Resetar página ao mudar os pedidos filtrados do pai ou a quantidade por página
  useEffect(() => {
    setPaginaAtual(1);
  }, [pedidos, itensPorPagina]);

  // Lógica de Paginação sobre os pedidos já filtrados
  const totalPaginas = Math.ceil(pedidos.length / itensPorPagina);
  const pedidosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return pedidos.slice(inicio, inicio + itensPorPagina);
  }, [pedidos, paginaAtual, itensPorPagina]);

  return (
    <>
      <table style={styles.table}>
        <thead>
          <tr style={styles.thRow}>
            <th style={styles.th}>Data</th>
            <th style={styles.th}>Pedido</th>
            <th style={styles.th}>Cliente</th>
            <th style={styles.th}>Total</th>
            <th style={styles.th}>Ação</th>
          </tr>
        </thead>
        <tbody>
          {pedidosPaginados.length > 0 ? (
            pedidosPaginados.map(p => (
              <LinhaPedido
                key={p.id}
                pedido={p}
                dataFormatada={formatarDataExibicao(p.data)}
                expandido={pedidoExpandido === p.id}
                onExpandir={(id: string) => setPedidoExpandido(pedidoExpandido === id ? null : id)}
                onDevolver={alternarDevolucao}
              />
            ))
          ) : (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                Nenhum pedido encontrado com estes filtros.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Controles de Paginação */}
      {totalPaginas > 1 && (
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
          <button
            disabled={paginaAtual === 1}
            onClick={() => setPaginaAtual(prev => prev - 1)}
            style={styles.btnAtalho}
          >
            Anterior
          </button>
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Pág {paginaAtual} de {totalPaginas}</span>
          <button
            disabled={paginaAtual >= totalPaginas}
            onClick={() => setPaginaAtual(prev => prev + 1)}
            style={styles.btnAtalho}
          >
            Próxima
          </button>
        </div>
      )}
    </>
  );
};