// app/admin/relatorios/components/TabDevolucoes.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { FiSearch, FiChevronLeft, FiChevronRight, FiList, FiBarChart2, FiChevronDown, FiChevronUp, FiUser } from "react-icons/fi";
import { Pedido } from "@/types/pedido";

export interface TabDevolucoesProps {
  uid: string;
  dadosFiltradosBusca: Pedido[];
  formatarDataExibicao: (d: string) => string;
  formatarMoeda: (v: number) => string;
  alternarDevolucao: (pedido: Pedido) => void;
  styles?: any;
}

export const TabDevolucoes = ({
  uid,
  dadosFiltradosBusca,
  formatarDataExibicao,
  formatarMoeda,
  alternarDevolucao,
  styles = {}
}: TabDevolucoesProps) => {

  const { theme, isModoNoturno } = useTheme();

  const [subAbaAtiva, setSubAbaAtiva] = useState<"pedidos" | "ranking">("pedidos");
  const [buscaInterna, setBuscaInterna] = useState("");
  const [itensPorPagina, setItensPorPagina] = useState<number>(20);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [pedidoExpandidoId, setPedidoExpandidoId] = useState<string | null>(null);

  // Estados dos dados consolidados vindos da Cloud Function (Leitura Única Otimizada)
  const [estatisticasDevolucoes, setEstatisticasDevolucoes] = useState<any>(null);
  const [loadingCloud, setLoadingCloud] = useState(true);

  // 🗓️ Chave do mês atual idêntica à gerada pela Cloud Function (ex: "agosto_2026")
  const dataHoje = new Date();
  const mesesNomes = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];
  const chaveMesAtual = `${mesesNomes[dataHoje.getMonth()]}_${dataHoje.getFullYear()}`;

  // 1. Busca os dados consolidados em uma única chamada de leitura (Custo Zero / Otimizado)
  useEffect(() => {
    if (!uid) return;
    const carregarDadosCloudFunction = async () => {
      setLoadingCloud(true);
      try {
        // Documento único de sumário de devoluções: lojistas/{lojistaId}/dashboard_stats/devolucoes_{chave}
        const docRef = doc(db, "lojistas", uid, "dashboard_stats", `devolucoes_${chaveMesAtual}`);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setEstatisticasDevolucoes(snap.data());
        } else {
          setEstatisticasDevolucoes(null);
        }
      } catch (err) {
        console.error("Erro ao buscar estatísticas de devolução da Cloud Function:", err);
      } finally {
        setLoadingCloud(false);
      }
    };

    carregarDadosCloudFunction();
  }, [uid, chaveMesAtual]);

  // Filtra os pedidos devolvidos do array global recebido do Dashboard
  const pedidosDevolvidos = useMemo(() => {
    return dadosFiltradosBusca.filter((p: any) => {
      const devolvidoFlag = Boolean(p.devolvido || p.dadosDevolucao?.isDevolucaoSolicitado);
      return devolvidoFlag === true;
    });
  }, [dadosFiltradosBusca]);

  const itensFiltradosBuscaLocal = useMemo(() => {
    if (!buscaInterna.trim()) return pedidosDevolvidos;
    const termo = buscaInterna.toLowerCase().trim();
    return pedidosDevolvidos.filter(p => {
      const numeroPed = String(p.numeroPedido || p.numero || p.nrNumeroPedido || "").toLowerCase();
      const clienteObj = p.dsCliente || (typeof p.cliente === 'object' && p.cliente !== null ? p.cliente : {});
      const nomeCliente = String(clienteObj.nmNomeCliente || clienteObj.nome || clienteObj.dsNomeCliente || (typeof p.cliente === 'string' ? p.cliente : "")).toLowerCase();
      return numeroPed.includes(termo) || nomeCliente.includes(termo);
    });
  }, [pedidosDevolvidos, buscaInterna]);

  const totalPaginas = Math.ceil(itensFiltradosBuscaLocal.length / itensPorPagina) || 1;

  const itensPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return itensFiltradosBuscaLocal.slice(inicio, inicio + itensPorPagina);
  }, [itensFiltradosBuscaLocal, paginaAtual, itensPorPagina]);

  // Mapeamento do objeto motivosDevolucao salvo pela Cloud Function
  const rankingMotivosFormatado = useMemo(() => {
    if (!estatisticasDevolucoes?.motivosDevolucao) return [];
    return Object.entries(estatisticasDevolucoes.motivosDevolucao).map(([motivo, qtd]) => ({
      motivo,
      quantidade: Number(qtd),
    })).sort((a, b) => b.quantidade - a.quantidade);
  }, [estatisticasDevolucoes]);

  // Extrai o array de itens devolvidos diretamente do documento central
  const itensRankConsolidado = useMemo(() => {
    if (!estatisticasDevolucoes?.itensDevolvidos || !Array.isArray(estatisticasDevolucoes.itensDevolvidos)) return [];
    // Ordena do maior prejuízo/quantidade para o menor
    return [...estatisticasDevolucoes.itensDevolvidos].sort((a, b) => b.total - a.total);
  }, [estatisticasDevolucoes]);

  const formatarNomeMotivo = (motivo: string) => {
    const mapaMotivos: { [key: string]: string } = {
      defeito_fabricacao: "Defeito de Fabricação",
      tamanho_incorreto: "Tamanho Incorreto",
      arrependeu: "Arrependimento / Desistência",
      arrependimento: "Arrependimento / Desistência",
      atraso_entrega: "Atraso na Entrega",
      produto_danificado_transporte: "Danificado no Transporte",
      produto_diferente: "Produto Diferente do Anunciado",
      nao_informado: "Não Informado"
    };
    return mapaMotivos[motivo] || motivo.replace(/_/g, " ").toUpperCase();
  };

  return (
    <div style={{ ...stylesTab.tabWrapper, background: theme.bgCard, border: `1px solid ${theme.border}` }}>

      {/* SUB-ABAS */}
      <div style={stylesTab.subTabsHeader}>
        <button
          onClick={() => setSubAbaAtiva("pedidos")}
          style={subAbaAtiva === "pedidos"
            ? { ...stylesTab.subTabBtnActive, background: theme.primary, color: '#fff' }
            : { ...stylesTab.subTabBtn, background: isModoNoturno ? theme.bgApp : '#f1f5f9', color: theme.textSec }}
        >
          <FiList size={14} /> Pedidos Devolvidos ({pedidosDevolvidos.length})
        </button>
        <button
          onClick={() => setSubAbaAtiva("ranking")}
          style={subAbaAtiva === "ranking"
            ? { ...stylesTab.subTabBtnActive, background: theme.primary, color: '#fff' }
            : { ...stylesTab.subTabBtn, background: isModoNoturno ? theme.bgApp : '#f1f5f9', color: theme.textSec }}
        >
          <FiBarChart2 size={14} /> Relatório & Ranking Analítico
        </button>
      </div>

      {/* SUB-ABA 1: PEDIDOS DEVOLVIDOS */}
      {subAbaAtiva === "pedidos" && (
        <div style={stylesTab.mainCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ ...stylesTab.searchBox, background: theme.inputBg || theme.bgApp, border: `1px solid ${theme.border}`, flex: 1, minWidth: '280px' }}>
              <FiSearch color={theme.textSec} size={16} />
              <input
                placeholder="Filtrar pedidos devolvidos..."
                style={{ ...stylesTab.inputSearch, color: theme.textMain }}
                value={buscaInterna}
                onChange={(e) => { setBuscaInterna(e.target.value); setPaginaAtual(1); }}
              />
            </div>
          </div>

          {pedidosDevolvidos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: theme.textSec }}>Nenhum pedido devolvido encontrado.</div>
          ) : (
            <div style={{ width: '100%', overflowX: 'auto', backgroundColor: 'transparent', boxSizing: 'border-box' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', color: theme.textMain, backgroundColor: 'transparent' }}>
                <thead>
                  <tr style={{ backgroundColor: 'transparent' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: theme.textSec }}>Data</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: theme.textSec }}>Pedido</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: theme.textSec }}>Cliente</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: theme.textSec }}>Motivo</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: theme.textSec }}>Valor Estornado</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: theme.textSec }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {itensPaginados.map(p => {
                    const clienteObj = p.dsCliente || (typeof p.cliente === 'object' && p.cliente !== null ? p.cliente : {});
                    const nomeCliente = clienteObj.nmNomeCliente || clienteObj.nome || clienteObj.dsNomeCliente || (typeof p.cliente === 'string' ? p.cliente : "Cliente Sem Nome");
                    const totalPedido = Number((p.financeiro as any)?.vlTotal || (p.financeiro as any)?.total || p.total || p.valorTotal || 0)
                    const dadosDev = (p as any).dadosDevolucao || {};
                    const motivoPedido = dadosDev.dsMotivo || dadosDev.motivo || "nao_informado";
                    const isExpandido = pedidoExpandidoId === p.id;

                    let rawData = p.timestamp || p.data;
                    if (rawData && typeof rawData.toDate === "function") {
                      rawData = rawData.toDate();
                    }

                    return (
                      <React.Fragment key={p.id}>
                        <tr
                          onClick={() => setPedidoExpandidoId(isExpandido ? null : p.id)}
                          style={{
                            backgroundColor: isModoNoturno ? '#1e293b' : '#ffffff',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            borderRadius: '12px'
                          }}
                        >
                          <td style={{ padding: '16px', borderRadius: '12px 0 0 12px', fontSize: '13px' }}>
                            {rawData ? formatarDataExibicao(rawData) : "-"}
                          </td>
                          <td style={{ padding: '16px', fontSize: '13px', fontWeight: '700' }}>
                            #{p.numeroPedido || p.numero || p.nrNumeroPedido || p.id.slice(-6)}
                          </td>
                          <td style={{ padding: '16px', fontSize: '13px', color: theme.primary, fontWeight: '600' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FiUser size={14} /> {nomeCliente} {isExpandido ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                            </span>
                          </td>
                          <td style={{ padding: '16px', fontSize: '13px' }}>
                            <span style={{ backgroundColor: isModoNoturno ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', color: '#ef4444', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                              {formatarNomeMotivo(motivoPedido)}
                            </span>
                          </td>
                          <td style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold' }}>{formatarMoeda(totalPedido)}</td>
                          <td style={{ padding: '16px', borderRadius: '0 12px 12px 0', textAlign: 'center' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); alternarDevolucao(p); }}
                              style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer', backgroundColor: '#e0f2fe', color: '#0ea5e9' }}
                            >
                              Restaurar
                            </button>
                          </td>
                        </tr>

                        {isExpandido && (
                          <tr>
                            <td colSpan={6} style={{ padding: '0 8px' }}>
                              <div style={{ padding: '20px', backgroundColor: isModoNoturno ? '#0f172a' : '#f8fafc', border: `1px solid ${theme.border}`, borderRadius: '0 0 12px 12px', marginTop: '-8px', marginBottom: '16px' }}>
                                <p style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textSec, marginBottom: '10px' }}>ITENS DO PEDIDO:</p>
                                {(p.itens || []).map((item: any, idx: number) => {
                                  const nomeItem = item.dsNomeProduto || item.nome || "Produto";
                                  const qtdItem = Number(item.nrQuantidadeProduto || item.quantidade || item.qty || 1);
                                  const precoItem = Number(item.vlPrecoProduto || item.preco || item.valor || 0);
                                  const varItem = item.dsVariacaoProduto || item.variacao;
                                  
                                  return (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                      <span>{qtdItem}x {nomeItem} {varItem && varItem !== "Padrão" ? `(${varItem})` : ""}</span>
                                      <span style={{ fontWeight: '600', color: theme.primary }}>{formatarMoeda(precoItem * qtdItem)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPaginas > 1 && (
            <div style={stylesTab.paginacaoContainer}>
              <button disabled={paginaAtual === 1} onClick={() => setPaginaAtual(prev => prev - 1)} style={{ ...stylesTab.paginacaoBtn, opacity: paginaAtual === 1 ? 0.4 : 1, background: isModoNoturno ? theme.bgApp : '#e2e8f0', color: theme.textMain, border: `1px solid ${theme.border}` }}>
                <FiChevronLeft size={14} /> Anterior
              </button>
              <span style={{ fontSize: '12px', color: theme.textSec, fontWeight: 'bold' }}>Página {paginaAtual} de {totalPaginas}</span>
              <button disabled={paginaAtual >= totalPaginas} onClick={() => setPaginaAtual(prev => prev + 1)} style={{ ...stylesTab.paginacaoBtn, opacity: paginaAtual >= totalPaginas ? 0.4 : 1, background: isModoNoturno ? theme.bgApp : '#e2e8f0', color: theme.textMain, border: `1px solid ${theme.border}` }}>
                Próxima <FiChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* SUB-ABA 2: RANKING ANALÍTICO */}
      {subAbaAtiva === "ranking" && (
        <div style={stylesTab.mainCard}>
          {loadingCloud ? (
            <div style={{ textAlign: 'center', padding: '40px', color: theme.textSec }}>Carregando estatísticas consolidadas...</div>
          ) : (
            <>
              <div style={{ ...stylesTab.cardResumoGeral, background: isModoNoturno ? theme.bgApp : '#f8fafc', border: `1px solid ${theme.border}`, marginBottom: '20px' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: theme.textSec, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    📉 Impacto Financeiro Total (Mês Atual)
                  </span>
                  <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#ef4444' }}>
                    {formatarMoeda(Number(estatisticasDevolucoes?.valorTotalDevolucoes ?? 0))}
                  </h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: theme.textSec, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    📦 Total de Ocorrências
                  </span>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: theme.textMain }}>
                    {Number(estatisticasDevolucoes?.totalDevolucoes ?? 0)} ocorrências
                  </h3>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                
                {/* MOTIVOS */}
                <div style={{ padding: '16px', borderRadius: '14px', background: isModoNoturno ? theme.bgApp : '#f8fafc', border: `1px solid ${theme.border}` }}>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: '700', color: theme.textMain }}>
                    📊 Motivos Mais Frequentes
                  </h4>
                  {rankingMotivosFormatado.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {rankingMotivosFormatado.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: theme.inputBg, borderRadius: '10px', border: `1px solid ${theme.border}` }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: theme.textMain }}>{formatarNomeMotivo(item.motivo)}</span>
                          <span style={{ fontSize: '12px', fontWeight: '800', backgroundColor: '#fee2e2', color: '#ef4444', padding: '4px 10px', borderRadius: '12px' }}>{item.quantidade}x</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '12px', color: theme.textSec, margin: 0, padding: '20px 0', textAlign: 'center' }}>Nenhum motivo registrado no mês.</p>
                  )}
                </div>

                {/* PRODUTOS DEVOLVIDOS VINDO DO ARRAY DO DOCUMENTO */}
                <div style={{ padding: '16px', borderRadius: '14px', background: isModoNoturno ? theme.bgApp : '#f8fafc', border: `1px solid ${theme.border}` }}>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: '700', color: theme.textMain }}>
                    ⚠️ Produtos com Maior Taxa de Retorno
                  </h4>
                  {itensRankConsolidado.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {itensRankConsolidado.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: theme.inputBg, borderRadius: '10px', border: `1px solid ${theme.border}` }}>
                          <div style={{ overflow: 'hidden' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: theme.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                              {item.nome} {item.variacao && item.variacao !== "Padrão" ? `(Var: ${item.variacao})` : ''}
                            </span>
                            <span style={{ fontSize: '11px', color: theme.textSec }}>Retido: {formatarMoeda(item.valorTotalPrejuizo || 0)}</span>
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#ef4444', backgroundColor: isModoNoturno ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', padding: '4px 10px', borderRadius: '12px', flexShrink: 0 }}>
                            {item.total} un.
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '12px', color: theme.textSec, margin: 0, padding: '20px 0', textAlign: 'center' }}>Nenhum produto registrado no mês.</p>
                  )}
                </div>

              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
};

const stylesTab: any = {
  tabWrapper: { padding: '25px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  subTabsHeader: { display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '15px' },
  subTabBtn: { padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' },
  subTabBtnActive: { padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' },
  mainCard: {},
  searchBox: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '12px' },
  inputSearch: { background: 'none', border: 'none', outline: 'none', width: '100%', fontSize: '13px' },
  paginacaoContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '0 4px' },
  paginacaoBtn: { padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' },
  cardResumoGeral: { padding: '20px', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }
};