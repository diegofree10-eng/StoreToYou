"use client";

import React, { useState, useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import { FiSearch, FiChevronLeft, FiChevronRight, FiList, FiBarChart2, FiChevronDown, FiChevronUp, FiUser, FiMapPin, FiPhone, FiMail } from "react-icons/fi";
import { Pedido } from "@/types/pedido"; // 🌟 Certifique-se de importar o tipo Pedido se necessário

export interface TabDevolucoesProps {
  dadosFiltradosBusca: any[];
  formatarDataExibicao: (d: string) => string;
  formatarMoeda: (v: number) => string;
  alternarDevolucao?: (pedido: Pedido | any) => void; // 🌟 Atualizado para aceitar o objeto do pedido
  styles?: any;
}

export const TabDevolucoes = ({
  dadosFiltradosBusca,
  formatarDataExibicao,
  formatarMoeda,
  alternarDevolucao, // 🌟 Adicionado aqui para poder ser usado se necessário nos botões
  styles = {}
}: TabDevolucoesProps) => {

  const { theme, isModoNoturno } = useTheme();

  const [subAbaAtiva, setSubAbaAtiva] = useState<"pedidos" | "ranking">("pedidos");
  const [buscaInterna, setBuscaInterna] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 10;

  // Estado para controlar qual pedido está expandido
  const [pedidoExpandidoId, setPedidoExpandidoId] = useState<string | null>(null);

  const itensDevolvidos = useMemo(() => {
    return dadosFiltradosBusca.filter(p => p.devolvido === true);
  }, [dadosFiltradosBusca]);

  const itensFiltradosBuscaLocal = useMemo(() => {
    if (!buscaInterna.trim()) return itensDevolvidos;

    const termo = buscaInterna.toLowerCase().trim();
    return itensDevolvidos.filter(p => {
      const numeroPed = String(p.numeroPedido || "").toLowerCase();
      const clienteObj = typeof p.cliente === 'object' && p.cliente !== null ? p.cliente : {};
      const nomeCliente = String(clienteObj.nmNomeCliente || clienteObj.nome || (typeof p.cliente === 'string' ? p.cliente : "")).toLowerCase();

      return numeroPed.includes(termo) || nomeCliente.includes(termo);
    });
  }, [itensDevolvidos, buscaInterna]);

  const totalPaginas = Math.ceil(itensFiltradosBuscaLocal.length / ITENS_POR_PAGINA) || 1;

  const itensPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
    return itensFiltradosBuscaLocal.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [itensFiltradosBuscaLocal, paginaAtual]);

  const handleBuscaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBuscaInterna(e.target.value);
    setPaginaAtual(1);
  };

  const rankingMotivos = useMemo(() => {
    const contagem: { [key: string]: { quantidade: number; valorTotal: number } } = {};

    itensDevolvidos.forEach(p => {
      const motivoChave = p.dadosDevolucao?.motivo || "nao_informado";
      const valorPedido = Number(p.financeiro?.vlTotal ?? p.financeiro?.total ?? 0);

      if (!contagem[motivoChave]) {
        contagem[motivoChave] = { quantidade: 0, valorTotal: 0 };
      }
      contagem[motivoChave].quantidade += 1;
      contagem[motivoChave].valorTotal += valorPedido;
    });

    return Object.entries(contagem).sort((a, b) => b[1].quantidade - a[1].quantidade);
  }, [itensDevolvidos]);

  const rankingProdutosDevolvidos = useMemo(() => {
    const contagemProd: { [key: string]: { nome: string; quantidade: number; valorAcumulado: number; foto?: string } } = {};

    itensDevolvidos.forEach(p => {
      const itensLista = p.itens || [];

      itensLista.forEach((item: any) => {
        const idProd = item.idProduto || item.id || item.nome || "prod_desconhecido";
        const qtdItem = Number(item.quantidade || item.qty || 1);
        const nomeProd = item.nome || "Produto Sem Nome";
        const foto = item.foto || item.imagem || item.variacaoSelecionada?.foto || "";

        const precoUnitario = Number(item.preco || item.valor || 0);
        const valorExatoItem = precoUnitario * qtdItem;

        if (!contagemProd[idProd]) {
          contagemProd[idProd] = { nome: nomeProd, quantidade: 0, valorAcumulado: 0, foto };
        }
        contagemProd[idProd].quantidade += qtdItem;
        contagemProd[idProd].valorAcumulado += valorExatoItem;
      });
    });

    return Object.values(contagemProd).sort((a, b) => b.quantidade - a.quantidade);
  }, [itensDevolvidos]);

  const valorTotalAcumuladoDevolucoes = useMemo(() => {
    return itensDevolvidos.reduce((acc, p) => acc + Number(p.financeiro?.vlTotal ?? p.financeiro?.total ?? 0), 0);
  }, [itensDevolvidos]);

  const formatarNomeMotivo = (motivo: string) => {
    const mapaMotivos: { [key: string]: string } = {
      defeito_fabricacao: "Defeito de Fabricação",
      tamanho_incorreto: "Tamanho Incorreto",
      arrependeu: "Arrependimento / Desistência",
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
          <FiList size={14} /> Pedidos Devolvidos ({itensDevolvidos.length})
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ ...stylesTab.searchBox, background: theme.inputBg || theme.bgApp, border: `1px solid ${theme.border}`, flex: 1, minWidth: '260px' }}>
              <FiSearch color={theme.textSec} size={16} />
              <input
                placeholder="Filtrar por nº do pedido ou nome do cliente..."
                style={{ ...stylesTab.inputSearch, color: theme.textMain }}
                value={buscaInterna}
                onChange={handleBuscaChange}
              />
            </div>
            <span style={{ fontSize: '12px', color: theme.textSec, fontWeight: '600' }}>
              Exibindo {itensPaginados.length} de {itensFiltradosBuscaLocal.length} registros
            </span>

          </div>

          <div style={{ width: '100%', overflowX: 'auto', backgroundColor: 'transparent', boxSizing: 'border-box' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', color: theme.textMain, backgroundColor: 'transparent' }}>
              <thead>
                <tr style={{ backgroundColor: 'transparent' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: theme.textSec }}>Data</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: theme.textSec }}>Pedido</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: theme.textSec }}>Cliente</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: theme.textSec }}>Motivo</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: theme.textSec }}>Valor Estornado</th>
                </tr>
              </thead>
              <tbody>
                {itensPaginados.map(p => {
                  const clienteObj = typeof p.cliente === 'object' && p.cliente !== null ? p.cliente : {};
                  const nomeCliente = clienteObj.nmNomeCliente || clienteObj.nome || (typeof p.cliente === 'string' ? p.cliente : "Cliente Sem Nome");
                  const totalPedido = Number(p.financeiro?.vlTotal ?? p.financeiro?.total ?? 0);
                  const isExpandido = pedidoExpandidoId === p.id;

                  return (
                    <React.Fragment key={p.id}>
                      {/* LINHA PRINCIPAL DO PEDIDO */}
                      <tr
                        onClick={() => setPedidoExpandidoId(isExpandido ? null : p.id)}
                        style={{
                          backgroundColor: isModoNoturno ? '#1e293b' : '#ffffff',
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          borderRadius: '12px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <td style={{ padding: '16px', borderRadius: '12px 0 0 12px', fontSize: '13px' }}>{formatarDataExibicao(p.data)}</td>
                        <td style={{ padding: '16px', fontSize: '13px', fontWeight: '700' }}>#{p.numeroPedido || "N/A"}</td>
                        <td style={{ padding: '16px', fontSize: '13px', color: theme.primary, fontWeight: '600' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FiUser size={14} /> {nomeCliente} {isExpandido ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                          </span>
                        </td>
                        <td style={{ padding: '16px', fontSize: '13px' }}>
                          <span style={{ backgroundColor: isModoNoturno ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', color: '#ef4444', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                            {formatarNomeMotivo(p.dadosDevolucao?.motivo || "nao_informado")}
                          </span>
                        </td>
                        <td style={{ padding: '16px', borderRadius: '0 12px 12px 0', fontSize: '13px', fontWeight: 'bold' }}>
                          {formatarMoeda(totalPedido)}
                        </td>
                      </tr>

                      {/* PAINEL EXPANDIDO */}
                      {isExpandido && (
                        <tr>
                          <td colSpan={5} style={{ padding: '0 8px' }}>
                            <div style={{
                              padding: '20px',
                              backgroundColor: isModoNoturno ? '#0f172a' : '#f8fafc',
                              border: `1px solid ${theme.border}`,
                              borderRadius: '0 0 12px 12px',
                              marginTop: '-8px',
                              marginBottom: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '16px'
                            }}>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>

                                {/* Bloco Esquerdo: Itens do Pedido com Variação e Preço Unitário/Total */}
                                <div style={{ backgroundColor: theme.bgCard, padding: '14px', borderRadius: '10px', border: `1px solid ${theme.border}` }}>
                                  <p style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textSec, marginBottom: '10px' }}>ITENS DO PEDIDO:</p>
                                  {(p.itens || []).map((item: any, idx: number) => {
                                    const qtd = Number(item.quantidade || item.qty || 1);
                                    const precoUnitario = Number(item.preco || item.valor || 0);
                                    const valorTotalItem = precoUnitario * qtd;

                                    return (
                                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                          {item.foto ? (
                                            <img src={item.foto} alt="" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
                                          ) : (
                                            <span style={{ fontSize: '16px' }}>📦</span>
                                          )}
                                          <div>
                                            <span style={{ fontSize: '13px', fontWeight: '600', display: 'block', color: theme.textMain }}>
                                              {qtd}x {item.nome || "Produto"}
                                            </span>
                                            {/* 🌟 Exibição da Variação do Item */}
                                            {item.variacao && (
                                              <span style={{ fontSize: '11px', color: '#0284c7', display: 'block', fontWeight: '500' }}>
                                                Variação: {item.variacao}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <div style={{ textAlign: 'right' }}>
                                          <span style={{ fontSize: '12px', fontWeight: '600', color: theme.primary }}>
                                            R$ {precoUnitario.toFixed(2).replace('.', ',')} un {qtd > 1 ? `(Total: R$ ${valorTotalItem.toFixed(2).replace('.', ',')})` : ''}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${theme.border}`, fontSize: '11px', color: theme.textSec }}>
                                    <strong>ID do Pedido:</strong> {p.Idpedido || p.id}
                                  </div>
                                </div>

                                {/* Bloco Direito: Resumo Financeiro */}
                                <div style={{ backgroundColor: theme.bgCard, padding: '14px', borderRadius: '10px', border: `1px solid ${theme.border}` }}>
                                  <p style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textSec, marginBottom: '10px' }}>RESUMO FINANCEIRO:</p>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: theme.textMain }}>
                                    <span>Total dos Produtos:</span>
                                    <span>{formatarMoeda(Number(p.financeiro?.vlSubtotal ?? 0))}</span>
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: '#ef4444' }}>
                                    <span>Cupom de Desconto:</span>
                                    <span>
                                      {p.financeiro?.dsCupom
                                        ? `-${formatarMoeda(Number(p.financeiro?.vlDesconto ?? 0))} (${p.financeiro.dsCupom})`
                                        : 'Não aplicado'}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: theme.textMain }}>
                                    <span>Sub total:</span>
                                    <span>
                                      {formatarMoeda(
                                        Number(p.financeiro?.vlSubtotal ?? 0) -
                                        Number(p.financeiro?.vlDesconto ?? 0)
                                      )}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: theme.textMain }}>
                                    <span>Total de Frete:</span>
                                    <span>
                                      {formatarMoeda(
                                        Number(
                                          p.financeiro?.vlFrete > 0
                                            ? p.financeiro?.vlFrete
                                            : (p.logistica?.vlFrete ?? 0)
                                        )
                                      )}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${theme.border}`, color: '#ef4444' }}>
                                    <span>Valor Estornado:</span>
                                    <span>{formatarMoeda(totalPedido)}</span>
                                  </div>
                                </div>

                              </div>

                              {/* PARTE INFERIOR: DADOS DO CLIENTE E ENDEREÇO */}
                              <div style={{ backgroundColor: theme.bgCard, padding: '14px', borderRadius: '10px', border: `1px solid ${theme.border}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px' }}>
                                <div>
                                  <p style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textSec, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <FiUser size={13} /> DADOS DO CLIENTE
                                  </p>
                                  <p style={{ fontSize: '13px', margin: '2px 0', color: theme.textMain }}><strong>Nome:</strong> {nomeCliente}</p>
                                  <p style={{ fontSize: '13px', margin: '2px 0', color: theme.textSec }}><FiPhone size={11} /> {clienteObj.dsTelefoneCliente || clienteObj.telefone || "Não informado"}</p>
                                  <p style={{ fontSize: '13px', margin: '2px 0', color: theme.textSec }}><FiMail size={11} /> {clienteObj.dsEmailCliente || clienteObj.email || "Não informado"}</p>
                                </div>
                                <div>
                                  <p style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textSec, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <FiMapPin size={13} /> ENDEREÇO DE ENTREGA
                                  </p>
                                  <p style={{ fontSize: '13px', margin: '2px 0', color: theme.textMain }}>
                                    {p.endereco?.dsRuaCliente || "Rua não informada"}, {p.endereco?.dsNumeroCliente || "S/N"}
                                  </p>
                                  <p style={{ fontSize: '13px', margin: '2px 0', color: theme.textSec }}>
                                    {p.endereco?.dsBairroCliente || ""} - {p.endereco?.dsCidadeCliente || ""}/{p.endereco?.dsUfCliente || ""}
                                  </p>
                                  <p style={{ fontSize: '12px', margin: '2px 0', color: theme.textSec }}>
                                    CEP: {p.endereco?.dsCepCliente || "Não informado"}
                                  </p>
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {itensPaginados.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '35px', color: theme.textSec, fontSize: '13px' }}>
                      Nenhum registro encontrado com os critérios informados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div style={stylesTab.paginacaoContainer}>
              <button
                disabled={paginaAtual === 1}
                onClick={() => setPaginaAtual(p => p - 1)}
                style={{ ...stylesTab.paginacaoBtn, opacity: paginaAtual === 1 ? 0.4 : 1, background: isModoNoturno ? theme.bgApp : '#e2e8f0', color: theme.textMain, border: `1px solid ${theme.border}` }}
              >
                <FiChevronLeft size={14} /> Anterior
              </button>
              <span style={{ fontSize: '12px', color: theme.textSec, fontWeight: 'bold' }}>
                Página {paginaAtual} de {totalPaginas}
              </span>
              <button
                disabled={paginaAtual >= totalPaginas}
                onClick={() => setPaginaAtual(p => p + 1)}
                style={{ ...stylesTab.paginacaoBtn, opacity: paginaAtual >= totalPaginas ? 0.4 : 1, background: isModoNoturno ? theme.bgApp : '#e2e8f0', color: theme.textMain, border: `1px solid ${theme.border}` }}
              >
                Próxima <FiChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* SUB-ABA 2: RANKING ANALÍTICO */}
      {subAbaAtiva === "ranking" && (
        <div style={stylesTab.mainCard}>
          <div style={{ ...stylesTab.cardResumoGeral, background: isModoNoturno ? theme.bgApp : '#f8fafc', border: `1px solid ${theme.border}`, marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '800', color: theme.textSec, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                📉 Impacto Financeiro Total (Estornos)
              </span>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#ef4444' }}>
                {formatarMoeda(valorTotalAcumuladoDevolucoes)}
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: theme.textSec, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                📦 Total de Pedidos Afetados
              </span>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: theme.textMain }}>
                {itensDevolvidos.length} ocorrências
              </h3>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>

            <div style={{ padding: '16px', borderRadius: '14px', background: isModoNoturno ? theme.bgApp : '#f8fafc', border: `1px solid ${theme.border}` }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: '700', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '6px' }}>
                📊 Motivos Mais Frequentes & Impacto
              </h4>

              {rankingMotivos.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {rankingMotivos.map(([motivo, dados]) => (
                    <div key={motivo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: theme.inputBg, borderRadius: '10px', border: `1px solid ${theme.border}` }}>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: theme.textMain, display: 'block' }}>
                          {formatarNomeMotivo(motivo)}
                        </span>
                        <span style={{ fontSize: '11px', color: theme.textSec, fontWeight: '600' }}>
                          Prejuízo: {formatarMoeda(dados.valorTotal)}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '800', backgroundColor: '#fee2e2', color: '#ef4444', padding: '4px 10px', borderRadius: '12px' }}>
                        {dados.quantidade}x
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '12px', color: theme.textSec, margin: 0, padding: '20px 0', textAlign: 'center' }}>Nenhum dado estatístico registrado no período.</p>
              )}
            </div>

            <div style={{ padding: '16px', borderRadius: '14px', background: isModoNoturno ? theme.bgApp : '#f8fafc', border: `1px solid ${theme.border}` }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: '700', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⚠️ Produtos com Maior Taxa de Retorno
              </h4>

              {rankingProdutosDevolvidos.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {rankingProdutosDevolvidos.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: theme.inputBg, borderRadius: '10px', border: `1px solid ${theme.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                        {item.foto ? (
                          <img src={item.foto} alt="" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <span style={{ fontSize: '16px', flexShrink: 0 }}>📦</span>
                        )}
                        <div style={{ overflow: 'hidden' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: theme.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{item.nome}</span>
                          <span style={{ fontSize: '11px', color: theme.textSec }}>Retido: {formatarMoeda(item.valorAcumulado)}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#ef4444', backgroundColor: isModoNoturno ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', padding: '4px 10px', borderRadius: '12px', flexShrink: 0 }}>
                        {item.quantidade} un.
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '12px', color: theme.textSec, margin: 0, padding: '20px 0', textAlign: 'center' }}>Nenhum produto estornado no período.</p>
              )}
            </div>

          </div>
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