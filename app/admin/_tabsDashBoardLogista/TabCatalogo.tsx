// app/admin/_tabsDashBoardLogista/TabCatalogo.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { FiChevronDown, FiChevronUp, FiDollarSign, FiTag, FiShoppingCart, FiBox, FiAward, FiLayers, FiTrendingUp } from "react-icons/fi";

export interface TabCatalogoProps {
  uid: string;
  formatarMoeda: (v: number) => string;
  styles?: any;
}

export const TabCatalogo = ({ uid, formatarMoeda, styles = {} }: TabCatalogoProps) => {
  const { theme, isModoNoturno } = useTheme();
  
  const [produtosRanking, setProdutosRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [linhaExpandidaId, setLinhaExpandidaId] = useState<string | null>(null);

  // 🗓️ Identifica o mês e ano atual para buscar o documento correto no Firestore
  const dataHoje = new Date();
  const mesAtualIndex = dataHoje.getMonth();
  const anoAtualStr = dataHoje.getFullYear().toString();
  
  const nomesMesesFirestore = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];
  
  const mesAtualNome = nomesMesesFirestore[mesAtualIndex];

  // 🚀 Busca o array completo de produtos diretamente do documento do mês atual (Custo = 1 Leitura)
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const carregarCatalogoConsolidado = async () => {
      setLoading(true);
      try {
        const chaveDocMes = `${mesAtualNome}_${anoAtualStr}`;
        const docRef = doc(db, "lojistas", uid, "dashboard_stats", chaveDocMes);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const dadosDoMes = snap.data();
          const listaProdutos = dadosDoMes.produtosRanking || [];
          setProdutosRanking(listaProdutos);
        } else {
          setProdutosRanking([]);
        }
      } catch (err) {
        console.error("Erro ao carregar catálogo consolidado:", err);
        setProdutosRanking([]);
      } finally {
        setLoading(false);
      }
    };

    carregarCatalogoConsolidado();
  }, [uid, mesAtualNome, anoAtualStr]);

  const toggleExpandir = (id: string) => {
    setLinhaExpandidaId(linhaExpandidaId === id ? null : id);
  };

  // Ordenação por Lucro Bruto do maior para o menor
  const produtosOrdenados = useMemo(() => {
    return [...produtosRanking].sort((a: any, b: any) => (b.lucroBrutoVendas || b.lucro || 0) - (a.lucroBrutoVendas || a.lucro || 0));
  }, [produtosRanking]);

  // 📊 Indicadores Calculados na Memória
  const indicadores = useMemo(() => {
    if (!produtosRanking.length) return { campeao: null, totalItens: 0, totalQtdVendida: 0 };

    const campeao = produtosOrdenados[0] || null;
    const totalItens = produtosRanking.length;
    const totalQtdVendida = produtosRanking.reduce((acc, curr) => acc + Number(curr.quantidadeVendida || curr.qtd || 0), 0);

    return { campeao, totalItens, totalQtdVendida };
  }, [produtosRanking, produtosOrdenados]);

  return (
    <div style={{ width: '100%', overflowX: 'auto', backgroundColor: theme.bgCard, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px', boxSizing: 'border-box' }}>
      
      {/* TÍTULO */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: theme.textMain }}>
          📦 Catálogo Completo e Margens por Vendas ({mesAtualNome.toUpperCase()} / {anoAtualStr})
        </h4>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: theme.textSec, fontSize: '13px' }}>
          ⏳ Carregando catálogo otimizado do Firestore...
        </div>
      ) : (
        <>
          {/* 🚀 CARDS DE INDICADORES / DESTAQUES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            
            {/* Card 1: Produto Mais Vendido (Campeão) */}
            <div style={{ backgroundColor: theme.inputBg, padding: '12px 16px', borderRadius: '10px', border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: isModoNoturno ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe', color: '#3b82f6' }}>
                <FiAward size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: theme.textSec, fontWeight: 'bold', marginBottom: '2px' }}>CAMPEÃO DE VENDAS</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: theme.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                  {indicadores.campeao ? `${indicadores.campeao.nome} (${indicadores.campeao.variacao || 'Único'})` : 'Nenhum'}
                </div>
                <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>
                  {indicadores.campeao ? `${indicadores.campeao.quantidadeVendida || 0} un. vendidas` : ''}
                </div>
              </div>
            </div>

            {/* Card 2: Total de SKUs/Itens com Saída */}
            <div style={{ backgroundColor: theme.inputBg, padding: '12px 16px', borderRadius: '10px', border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: isModoNoturno ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7', color: '#10b981' }}>
                <FiLayers size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: theme.textSec, fontWeight: 'bold', marginBottom: '2px' }}>ITENS COM SAÍDA NO MÊS</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: theme.textMain }}>
                  {indicadores.totalItens} <span style={{ fontSize: '12px', fontWeight: 'normal', color: theme.textSec }}>produtos</span>
                </div>
              </div>
            </div>

            {/* Card 3: Volume Total de Unidades */}
            <div style={{ backgroundColor: theme.inputBg, padding: '12px 16px', borderRadius: '10px', border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: isModoNoturno ? 'rgba(245, 158, 11, 0.2)' : '#fef9c3', color: '#f59e0b' }}>
                <FiTrendingUp size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: theme.textSec, fontWeight: 'bold', marginBottom: '2px' }}>VOLUME TOTAL VENDIDO</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: theme.textMain }}>
                  {indicadores.totalQtdVendida} <span style={{ fontSize: '12px', fontWeight: 'normal', color: theme.textSec }}>unidades</span>
                </div>
              </div>
            </div>

          </div>

          {/* TABELA */}
          <table style={{ width: '100%', borderCollapse: 'collapse', color: theme.textMain, backgroundColor: 'transparent' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border}`, backgroundColor: theme.inputBg }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: theme.textSec }}>Produto</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: theme.textSec }}>Variação / Modelo</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: theme.textSec }}>Qtd Vendida</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: theme.textSec }}>Lucro Bruto / Líquido</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: theme.textSec }}>Margem Média</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: theme.textSec }}>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {produtosOrdenados.map((d: any, index: number) => {
                const itemId = d.id || `${d.nome || 'prod'}_${index}`;
                const isExpandido = linhaExpandidaId === itemId;
                
                const quantidade = Number(d.quantidadeVendida || d.qtd || 0);
                const lucroBruto = Number(d.lucroBrutoVendas || d.lucro || 0);
                const valorBruto = Number(d.valorBrutoVendas || d.valor || 0);
                const valorLiquido = Number(d.valorLiquidoVendas || valorBruto);
                const custoTotal = Number(d.custoTotalVendas || 0);
                const totalCupom = Number(d.totalCupomAplicado || 0);
                const margemMedia = Number(d.margemLucroMedia || 0);
                
                const nomeProduto = d.nome || d.dsNomeProduto || "Produto";
                const variacaoProduto = d.variacao || d.dsVariacaoProduto || "";
                const custoUnitario = Number(d.vlCustoUnitarioProduto || d.custo || 0);

                const isMargemAlta = margemMedia > 40;

                return (
                  <React.Fragment key={itemId}>
                    {/* LINHA PRINCIPAL */}
                    <tr 
                      onClick={() => toggleExpandir(itemId)}
                      style={{ 
                        borderBottom: isExpandido ? 'none' : `1px solid ${theme.border}`, 
                        cursor: 'pointer', 
                        backgroundColor: isExpandido ? (isModoNoturno ? '#1e293b' : '#f8fafc') : 'transparent',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <td style={{ padding: '14px 12px', fontSize: '13px', fontWeight: "600", color: theme.textMain }}>
                        📦 {nomeProduto}
                      </td>
                      <td style={{ padding: '14px 12px', fontSize: '13px' }}>
                        {variacaoProduto ? (
                          <span style={{ 
                            background: isModoNoturno ? '#334155' : '#f1f5f9', 
                            color: isModoNoturno ? '#f1f5f9' : '#475569', 
                            padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", 
                            border: `1px solid ${theme.border}`, display: "inline-block" 
                          }}>
                            🎨 {variacaoProduto}
                          </span>
                        ) : (
                          <span style={{ color: theme.textSec }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 12px', fontSize: '13px', color: theme.textMain }}>{quantidade} un.</td>
                      <td style={{ padding: '14px 12px', fontSize: '13px' }}>
                        <strong style={{ color: lucroBruto >= 0 ? '#10b981' : '#ef4444' }}>
                          {formatarMoeda(lucroBruto)}
                        </strong>
                      </td>
                      <td style={{ padding: '14px 12px', fontSize: '13px' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold',
                          background: isMargemAlta ? (isModoNoturno ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7') : (isModoNoturno ? 'rgba(245, 158, 11, 0.2)' : '#fef9c3'), 
                          color: isMargemAlta ? (isModoNoturno ? '#34d399' : '#166534') : (isModoNoturno ? '#fbbf24' : '#854d0e') 
                        }}>
                          {margemMedia.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center', color: theme.textSec }}>
                        {isExpandido ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                      </td>
                    </tr>

                    {/* RAIO-X FINANCEIRO DO PRODUTO (EXPANDIDO - LIMPO E ALINHADO) */}
                    {isExpandido && (
                      <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                        <td colSpan={6} style={{ padding: '0 16px 16px 16px', backgroundColor: isModoNoturno ? '#1e293b' : '#f8fafc' }}>
                          <div style={{ 
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                            gap: '12px',
                            paddingTop: '4px'
                          }}>
                            {/* Card 1: Valor Bruto */}
                            <div style={{ background: isModoNoturno ? '#0f172a' : '#ffffff', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: theme.textSec, fontSize: '10px', fontWeight: 'bold' }}>
                                <FiDollarSign size={13} color="#3b82f6" /> VALOR BRUTO DAS VENDAS
                              </div>
                              <div style={{ fontSize: '15px', fontWeight: '800', color: theme.textMain }}>
                                {formatarMoeda(valorBruto)}
                              </div>
                            </div>

                            {/* Card 2: Cupons */}
                            <div style={{ background: isModoNoturno ? '#0f172a' : '#ffffff', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: theme.textSec, fontSize: '10px', fontWeight: 'bold' }}>
                                <FiTag size={13} color="#ef4444" /> CUPONS APLICADOS (-)
                              </div>
                              <div style={{ fontSize: '15px', fontWeight: '800', color: '#ef4444' }}>
                                - {formatarMoeda(totalCupom)}
                              </div>
                            </div>

                            {/* Card 3: Valor Líquido */}
                            <div style={{ background: isModoNoturno ? '#0f172a' : '#ffffff', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: theme.textSec, fontSize: '10px', fontWeight: 'bold' }}>
                                <FiShoppingCart size={13} color="#10b981" /> VALOR LÍQUIDO RECEBIDO
                              </div>
                              <div style={{ fontSize: '15px', fontWeight: '800', color: theme.textMain }}>
                                {formatarMoeda(valorLiquido)}
                              </div>
                            </div>

                            {/* Card 4: Custos */}
                            <div style={{ background: isModoNoturno ? '#0f172a' : '#ffffff', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: theme.textSec, fontSize: '10px', fontWeight: 'bold' }}>
                                <FiBox size={13} color="#f59e0b" /> CUSTOS (UNIT. / TOTAL)
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: '800', color: '#ef4444' }}>
                                {formatarMoeda(custoUnitario)} un <span style={{ fontSize: '11px', fontWeight: 'normal', color: theme.textSec }}>(Tot: {formatarMoeda(custoTotal)})</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              
              {produtosOrdenados.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: theme.textSec, backgroundColor: 'transparent', fontSize: '13px' }}>
                    Nenhum produto registrado no catálogo para o período de {mesAtualNome}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};