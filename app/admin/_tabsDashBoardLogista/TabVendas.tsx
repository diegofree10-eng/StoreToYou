// components/TabVendas.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Pedido } from "@/types/pedido";

export interface TabVendasProps {
  pedidos: any[];
  formatarDataExibicao: (data: any) => string;
  formatarMoeda: (valor: any) => string;
  alternarDevolucao: (pedido: Pedido) => void;
  pedidoExpandido: string | null;
  setPedidoExpandido: React.Dispatch<React.SetStateAction<string | null>>;
  LinhaPedido: React.ComponentType<any>;
  styles: { [key: string]: React.CSSProperties };
  itensPorPagina: number;
  theme?: any;
  isModoNoturno?: boolean;
}

const DEFAULT_THEME = {
  bgApp: "#f8fafc",
  bgCard: "#ffffff",
  textMain: "#1e293b",
  textSec: "#64748b",
  border: "#e2e8f0",
  inputBg: "#ffffff"
};

export const TabVendas = ({
  pedidos,
  formatarDataExibicao,
  formatarMoeda,
  alternarDevolucao,
  pedidoExpandido,
  setPedidoExpandido,
  LinhaPedido,
  styles,
  itensPorPagina,
  theme = DEFAULT_THEME,
  isModoNoturno = false
}: TabVendasProps) => {

  const [paginaAtual, setPaginaAtual] = useState(1);

  // 🌟 Filtro flexível que valida o status "Concluído" e garante que o pedido seja mapeado com ID correto
  const pedidosConcluidos = useMemo(() => {
    if (!Array.isArray(pedidos)) return [];
    
    return pedidos
      .map(p => ({
        ...p,
        // Normaliza o ID pegando p.id, p.dsPedido ou gerando fallback
        id: p.id || p.dsPedido || p.nrIdpedido || Math.random().toString()
      }))
      .filter(p => {
        const status = String(p.dsStatusPedido || p.statusPedido || "").trim().toLowerCase();
        return status === "concluído" || status === "concluido" || status === "finalizado" || status === "entregue";
      });
  }, [pedidos]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [pedidosConcluidos, itensPorPagina]);

  const totalPaginas = Math.ceil(pedidosConcluidos.length / itensPorPagina);
  const pedidosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return pedidosConcluidos.slice(inicio, inicio + itensPorPagina);
  }, [pedidosConcluidos, paginaAtual, itensPorPagina]);

  return (
    <>
      <table style={{ ...styles.table, color: theme.textMain }}>
        <thead>
          <tr style={{ ...styles.thRow, borderBottomColor: theme.border, backgroundColor: isModoNoturno ? '#1e293b' : theme.primary}}>
            <th style={{ ...styles.th, color: theme.textSec }}>Data</th>
            <th style={{ ...styles.th, color: theme.textSec }}>Pedido</th>
            <th style={{ ...styles.th, color: theme.textSec }}>Cliente</th>
            <th style={{ ...styles.th, color: theme.textSec }}>Total</th>
            <th style={{ ...styles.th, color: theme.textSec }}>Ação</th>
          </tr>
        </thead>
        <tbody>
          {pedidosPaginados.length > 0 ? (
            pedidosPaginados.map(p => {
              // Pega a data priorizando timestamp, depois data, ou string atual
              const dataBruta = p.timestamp || p.data || new Date().toISOString();
              
              return (
                <LinhaPedido
                  key={p.id}
                  pedido={p}
                  dataFormatada={formatarDataExibicao(dataBruta)}
                  expandido={pedidoExpandido === p.id}
                  onExpandir={(id: string) => setPedidoExpandido(pedidoExpandido === id ? null : id)}
                  onDevolver={() => alternarDevolucao(p)}
                  theme={theme}
                  isModoNoturno={isModoNoturno}
                />
              );
            })
          ) : (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: theme.textSec }}>
                Nenhum pedido concluído encontrado.
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
            style={{ ...styles.btnAtalho, backgroundColor: isModoNoturno ? '#334155' : '#f1f5f9', color: isModoNoturno ? '#f1f5f9' : '#475569', opacity: paginaAtual === 1 ? 0.5 : 1 }}
          >
            Anterior
          </button>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: theme.textMain }}>Pág {paginaAtual} de {totalPaginas}</span>
          <button
            disabled={paginaAtual >= totalPaginas}
            onClick={() => setPaginaAtual(prev => prev + 1)}
            style={{ ...styles.btnAtalho, backgroundColor: isModoNoturno ? '#334155' : '#f1f5f9', color: isModoNoturno ? '#f1f5f9' : '#475569', opacity: paginaAtual >= totalPaginas ? 0.5 : 1 }}
          >
            Próxima
          </button>
        </div>
      )}
    </>
  );
};