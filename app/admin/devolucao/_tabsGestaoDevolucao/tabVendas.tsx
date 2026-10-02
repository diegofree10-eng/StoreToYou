// app/admin/devolucao/_tabsGestaoDevolucao/tabVendas.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Pedido } from "@/types/pedido";
import { FiUser, FiChevronDown, FiChevronUp } from "react-icons/fi";

export interface TabVendasProps {
  uid?: string;
  pedidos: any[];
  formatarDataExibicao: (data: any) => string;
  formatarMoeda: (valor: any) => string;
  alternarDevolucao: (pedido: Pedido) => void;
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
  inputBg: "#ffffff",
  primary: "#3b82f6"
};

const extrairFotoDoItem = (item: any): string => {
  if (item.dsFotoCapaProduto && typeof item.dsFotoCapaProduto === 'string' && item.dsFotoCapaProduto.startsWith('http')) return item.dsFotoCapaProduto;
  const chavesPossiveis = ['foto', 'imagem', 'image', 'url', 'urlOriginal', 'thumb'];
  for (const chave of chavesPossiveis) {
    if (item[chave] && typeof item[chave] === 'string' && item[chave].startsWith('http')) return item[chave];
  }
  if (item.variacaoSelecionada?.foto) return item.variacaoSelecionada.foto;
  return "";
};

const LinhaPedidoInterna = React.memo(({ pedido, expandido, onExpandir, onDevolver, dataFormatada, formatarMoeda, theme, isModoNoturno }: any) => {
  const clienteObj = pedido.dsCliente || (typeof pedido.cliente === 'object' && pedido.cliente !== null ? pedido.cliente : {});
  const nomeExibicao = clienteObj.nmNomeCliente || clienteObj.nome || (typeof pedido.cliente === 'string' ? pedido.cliente : "Cliente Sem Nome");

  const fin = pedido.financeiro || {};
  const log = pedido.logistica || {};

  const subtotalVal = Number(fin.vlSubtotal ?? fin.subtotal ?? fin.valorSubtotal ?? 0);
  const descontoVal = Number(fin.vlDesconto ?? fin.discount ?? fin.descontos ?? 0);
  const freteVal = Number(log.vlFrete ?? fin.frete ?? 0);
  const freteGratisFlag = Boolean(log.isFreteGratis || fin.freteGratis || log.dsTransportadoraId === "frete_gratis_ativado");

  const totalCalculadoManual = subtotalVal + (freteGratisFlag ? 0 : freteVal) - descontoVal;
  const totalFinal = Number(fin.vlTotal ?? fin.total ?? fin.valorTotal ?? (totalCalculadoManual > 0 ? totalCalculadoManual : 0));
  const numeroPedidoExibir = pedido.nrNumeroPedido || pedido.numeroPedido || pedido.id?.slice(0, 6) || "000";

  return (
    <React.Fragment>
      <tr
        onClick={() => onExpandir(pedido.id)}
        style={{
          backgroundColor: isModoNoturno ? '#1e293b' : '#ffffff',
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          transition: 'all 0.2s ease',
          borderBottom: `8px solid ${isModoNoturno ? '#0f172a' : '#f8fafc'}`
        }}
      >
        <td style={{ padding: '14px 16px', width: '15%', boxSizing: 'border-box', fontSize: '13px', color: theme.textMain, textAlign: 'left' }}>{dataFormatada}</td>
        <td style={{ padding: '14px 16px', width: '15%', boxSizing: 'border-box', fontSize: '13px', fontWeight: '700', textAlign: 'left' }}>
          <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: theme.inputBg, color: theme.textMain }}>
            #{numeroPedidoExibir}
          </span>
        </td>
        <td style={{ padding: '14px 16px', width: '40%', boxSizing: 'border-box', fontSize: '13px', color: theme.primary || '#3b82f6', fontWeight: '600', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FiUser size={14} /> {nomeExibicao} {expandido ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </span>
        </td>
        <td style={{ padding: '14px 16px', width: '15%', boxSizing: 'border-box', fontSize: '13px', fontWeight: 'bold', color: theme.textMain, textAlign: 'left' }}>{formatarMoeda(totalFinal)}</td>
        <td style={{ padding: '14px 16px', width: '15%', boxSizing: 'border-box', fontSize: '13px', textAlign: 'left' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onDevolver(pedido); }}
            style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer', backgroundColor: pedido.devolvido ? '#e0f2fe' : '#fee2e2', color: pedido.devolvido ? '#0ea5e9' : '#ef4444' }}
          >
            {pedido.devolvido ? 'Restaurar' : 'Devolver'}
          </button>
        </td>
      </tr>

      {expandido && (
        <tr>
          <td colSpan={5} style={{ padding: '0 8px', backgroundColor: isModoNoturno ? '#0f172a' : '#f8fafc' }}>
            <div style={{
              padding: '20px',
              border: `1px solid ${theme.border}`,
              borderRadius: '0 0 12px 12px',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                
                <div style={{ backgroundColor: theme.bgCard, padding: '14px', borderRadius: '10px', border: `1px solid ${theme.border}` }}>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textSec, marginBottom: '10px' }}>ITENS DO PEDIDO:</p>
                  {(pedido.itens || []).map((item: any, idx: number) => {
                    const qtd = Number(item.nrQuantidadeProduto || item.quantidade || item.qty || 1);
                    const precoUnitario = Number(item.vlPrecoProduto || item.preco || item.valor || item.valorUnitario || 0);
                    const valorTotalItem = precoUnitario * qtd;
                    const fotoUrl = extrairFotoDoItem(item);
                    const nomeProd = item.dsNomeProduto || item.nome || "Produto";
                    const varProd = item.dsVariacaoProduto || item.variacao || "";

                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={fotoUrl || "https://placehold.co/32x32?text=Prod"}
                            alt=""
                            style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }}
                          />
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: '600', display: 'block', color: theme.textMain }}>
                              {qtd}x {nomeProd}
                            </span>
                            {varProd && (
                              <span style={{ fontSize: '11px', color: '#0284c7', display: 'block' }}>
                                Variação: {varProd}
                              </span>
                            )}
                          </div>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: theme.primary }}>
                          R$ {precoUnitario.toFixed(2).replace('.', ',')} un {qtd > 1 ? `(Total: R$ ${valorTotalItem.toFixed(2).replace('.', ',')})` : ''}
                        </span>
                      </div>
                    );
                  })}
                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${theme.border}`, fontSize: '11px', color: theme.textSec }}>
                    <strong>ID do Pedido:</strong> <span style={{ fontFamily: 'monospace' }}>{pedido.id}</span>
                  </div>
                </div>

                <div style={{ backgroundColor: theme.bgCard, padding: '14px', borderRadius: '10px', border: `1px solid ${theme.border}` }}>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textSec, marginBottom: '10px' }}>RESUMO FINANCEIRO:</p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: theme.textSec }}>
                    <span>Total dos Produtos:</span>
                    <span style={{ color: theme.textMain }}>{formatarMoeda(subtotalVal)}</span>
                  </div>

                  {descontoVal > 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: '#16a34a' }}>
                      <span>Cupom de Desconto:</span>
                      <span>- {formatarMoeda(descontoVal)}</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: theme.textSec, fontStyle: 'italic' }}>
                      <span>Cupom de Desconto:</span>
                      <span>Não aplicado</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: theme.textSec }}>
                    <span>Subtotal com Desconto:</span>
                    <span style={{ color: theme.textMain }}>{formatarMoeda(subtotalVal - descontoVal)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: theme.textSec }}>
                    <span>Frete:</span>
                    <strong style={{ color: theme.textMain }}>{freteGratisFlag ? "Grátis" : formatarMoeda(freteVal)}</strong>
                  </div>

                  <hr style={{ border: '0', borderTop: `1px solid ${theme.border}`, margin: '8px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', color: theme.textMain }}>
                    <span>Pagamento Total:</span> 
                    <span style={{ color: theme.primary }}>{formatarMoeda(totalFinal)}</span>
                  </div>
                </div>

              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
});

LinhaPedidoInterna.displayName = "LinhaPedidoInterna";

export const TabVendas = ({
  pedidos,
  formatarDataExibicao,
  formatarMoeda,
  alternarDevolucao,
  itensPorPagina,
  theme = DEFAULT_THEME,
  isModoNoturno = false
}: TabVendasProps) => {

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [pedidoExpandido, setPedidoExpandido] = useState<string | null>(null);

  const pedidosConcluidos = useMemo(() => {
    if (!Array.isArray(pedidos)) return [];

    return pedidos
      .map(p => ({
        ...p,
        id: p.id || p.dsPedido || p.nrIdpedido || Math.random().toString()
      }))
      .filter(p => {
        if (p.devolvido) return false;

        const statusTexto = String(
          p.dsStatusPedido || 
          p.statusPedido || 
          p.StatusProducao?.dsStatusPedido || 
          ""
        ).trim().toLowerCase();

        return p.isStatusPedidoConcluido === true || 
          statusTexto === "concluído" || 
          statusTexto === "concluido" || 
          statusTexto === "finalizado" || 
          statusTexto === "entregue" ||
          statusTexto === "concluida" ||
          statusTexto === "aprovado" ||
          statusTexto === "producao";
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: theme.textSec, fontWeight: '500' }}>
          Exibindo {pedidosConcluidos.length} pedidos concluídos
        </span>
      </div>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${theme.border}`, backgroundColor: isModoNoturno ? '#1e293b' : '#f8fafc' }}>
              <th style={{ padding: '14px 16px', width: '15%', boxSizing: 'border-box', fontSize: '13px', fontWeight: '700', color: theme.textSec, textAlign: 'left' }}>Data</th>
              <th style={{ padding: '14px 16px', width: '15%', boxSizing: 'border-box', fontSize: '13px', fontWeight: '700', color: theme.textSec, textAlign: 'left' }}>Pedido</th>
              <th style={{ padding: '14px 16px', width: '40%', boxSizing: 'border-box', fontSize: '13px', fontWeight: '700', color: theme.textSec, textAlign: 'left' }}>Cliente</th>
              <th style={{ padding: '14px 16px', width: '15%', boxSizing: 'border-box', fontSize: '13px', fontWeight: '700', color: theme.textSec, textAlign: 'left' }}>Total</th>
              <th style={{ padding: '14px 16px', width: '15%', boxSizing: 'border-box', fontSize: '13px', fontWeight: '700', color: theme.textSec, textAlign: 'left' }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {pedidosPaginados.length > 0 ? (
              pedidosPaginados.map(p => {
                const dataBruta = p.timestamp || p.data || new Date().toISOString();
                
                return (
                  <LinhaPedidoInterna
                    key={p.id}
                    pedido={p}
                    dataFormatada={formatarDataExibicao(dataBruta)}
                    expandido={pedidoExpandido === p.id}
                    onExpandir={(id: string) => setPedidoExpandido(pedidoExpandido === id ? null : id)}
                    onDevolver={(pedidoObj: Pedido) => {
                      if (typeof alternarDevolucao === 'function') {
                        alternarDevolucao(pedidoObj); // Repassa direto para a página principal gerenciar o modal global
                      }
                    }}
                    formatarMoeda={formatarMoeda}
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
      </div>

      {totalPaginas > 1 && (
        <div style={{ marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
          <button
            disabled={paginaAtual === 1}
            onClick={() => setPaginaAtual(prev => prev - 1)}
            style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500', backgroundColor: isModoNoturno ? '#334155' : '#f1f5f9', color: isModoNoturno ? '#f1f5f9' : '#475569', opacity: paginaAtual === 1 ? 0.5 : 1 }}
          >
            Anterior
          </button>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: theme.textMain }}>Pág {paginaAtual} de {totalPaginas}</span>
          <button
            disabled={paginaAtual >= totalPaginas}
            onClick={() => setPaginaAtual(prev => prev + 1)}
            style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500', backgroundColor: isModoNoturno ? '#334155' : '#f1f5f9', color: isModoNoturno ? '#f1f5f9' : '#475569', opacity: paginaAtual >= totalPaginas ? 0.5 : 1 }}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
};