"use client";
import React, { useMemo } from "react";
import {
  FiUsers, FiActivity, FiDollarSign, FiPieChart, FiTarget, FiTrendingDown, FiGitCommit
} from "react-icons/fi";
import { useTheme } from "@/context/ThemeContext";

interface TabPanoramaProps {
  lojistas: any[];
  denuncias: any[];
  planos: any;
  versaoSistemaGlobal?: string; // 🌟 Recebe a versão atual do sistema (Custo 0 de leitura)
}

export default function TabPanorama({ lojistas, denuncias, planos, versaoSistemaGlobal = "" }: TabPanoramaProps) {
  const { theme, isModoNoturno } = useTheme();

  // 1. Lógica Dinâmica: Busca o preço ou usa 0
  const getPreco = (planoKey: string) => Number(planos[planoKey]?.preco || 0);

  const totalLojistas = lojistas.length;

  // 2. Filtro de Pagantes (Apenas quem NÃO é teste)
  const lojistasPagantes = lojistas.filter(l => !l.isTeste);
  const lojistasEmTeste = lojistas.filter(l => l.isTeste);

  // 3. Cálculos de Quantidade por Plano (Apenas Pagantes para o Financeiro)
  const dados = {
    Bronze: {
      qtdTotal: lojistas.filter(l => l.plano === "Bronze").length,
      qtdPagante: lojistasPagantes.filter(l => l.plano === "Bronze").length,
      cor: planos.Bronze?.cor || "#c2410c",
      preco: getPreco("Bronze")
    },
    Prata: {
      qtdTotal: lojistas.filter(l => l.plano === "Prata").length,
      qtdPagante: lojistasPagantes.filter(l => l.plano === "Prata").length,
      cor: planos.Prata?.cor || "#475569",
      preco: getPreco("Prata")
    },
    Ouro: {
      qtdTotal: lojistas.filter(l => l.plano === "Ouro").length,
      qtdPagante: lojistasPagantes.filter(l => l.plano === "Ouro").length,
      cor: planos.Ouro?.cor || "#a16207",
      preco: getPreco("Ouro")
    }
  };

  // Faturamento REAL (Apenas de quem já converteu/pagou)
  const faturamentoReal = {
    Bronze: dados.Bronze.qtdPagante * dados.Bronze.preco,
    Prata: dados.Prata.qtdPagante * dados.Prata.preco,
    Ouro: dados.Ouro.qtdPagante * dados.Ouro.preco,
  };

  const totalGeralReal = faturamentoReal.Bronze + faturamentoReal.Prata + faturamentoReal.Ouro;

  // 4. Métricas de Conversão
  const taxaConversao = totalLojistas > 0 ? ((lojistasPagantes.length / totalLojistas) * 100).toFixed(1) : 0;

  const hoje = new Date();
  const churnTeste = lojistasEmTeste.filter(l => {
    const venc = new Date(l.dataVencimento);
    return venc < hoje;
  }).length;

  // Proporções para o Gráfico de Volume (Total de Lojas)
  const totalQtd = totalLojistas || 1;
  const pOuro = (dados.Ouro.qtdTotal / totalQtd) * 100;
  const pPrata = (dados.Prata.qtdTotal / totalQtd) * 100;

  // 🌟 MONITOR DE VERSÕES COM CUSTO ZERO (Usa apenas o array que já veio na prop lojistas)
  const lojistasDesatualizados = useMemo(() => {
    if (!versaoSistemaGlobal) return [];
    return lojistas.filter(l => {
      const versoesLidasPeloLojista = l.atualizacao?.versoesLidas || [];
      return !versoesLidasPeloLojista.includes(versaoSistemaGlobal);
    });
  }, [lojistas, versaoSistemaGlobal]);

  return (
    <div style={styles.panoramaContainer}>
      {/* 1ª LINHA: CARDS DE RESUMO */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <div style={{ ...styles.iconBox, color: '#3b82f6', backgroundColor: '#3b82f615' }}><FiUsers /></div>
          <div><p style={{ ...styles.statLabel, color: theme.textSec }}>Base de Lojistas</p><h3 style={{ ...styles.statValue, color: theme.textMain }}>{totalLojistas}</h3></div>
        </div>
        <div style={{ ...styles.statCard, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <div style={{ ...styles.iconBox, color: '#10b981', backgroundColor: '#10b98115' }}><FiDollarSign /></div>
          <div>
            <p style={{ ...styles.statLabel, color: theme.textSec }}>Receita Real (Pagantes)</p>
            <h3 style={{ ...styles.statValue, color: '#10b981' }}>
              {totalGeralReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
          </div>
        </div>
        <div style={{ ...styles.statCard, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <div style={{ ...styles.iconBox, color: '#f59e0b', backgroundColor: '#f59e0b15' }}><FiActivity /></div>
          <div><p style={{ ...styles.statLabel, color: theme.textSec }}>Em Período de Teste</p><h3 style={{ ...styles.statValue, color: theme.textMain }}>{lojistasEmTeste.length}</h3></div>
        </div>
      </div>

      {/* 🌟 1.5 LINHA: MONITOR DE VERSÕES DOS LOJISTAS (COM SCROLL INTERNO E DADOS COMPLETOS) */}
      {versaoSistemaGlobal && (
        <div style={{ ...styles.chartCard, background: theme.bgCard, border: `1px solid ${theme.border}`, minHeight: 'auto' }}>
          <div style={{ ...styles.cardHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h4 style={{ ...styles.cardTitle, color: theme.textMain, margin: 0 }}>
              <FiGitCommit color="#6366f1" /> Monitor de Versão do Sistema
              <span style={{ fontSize: '11px', fontWeight: 'normal', color: theme.textSec, marginLeft: '8px' }}>(Atual Global: v{versaoSistemaGlobal})</span>
            </h4>
            <span style={{
              fontSize: '11px',
              fontWeight: '800',
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: lojistasDesatualizados.length > 0 ? '#fef2f2' : '#f0fdf4',
              color: lojistasDesatualizados.length > 0 ? '#dc2626' : '#16a34a'
            }}>
              {lojistasDesatualizados.length === 0 ? "Todos atualizados" : `${lojistasDesatualizados.length} pendentes`}
            </span>
          </div>

          {lojistasDesatualizados.length === 0 ? (
            <p style={{ fontSize: '13px', color: theme.textSec, margin: 0 }}>
              ✨ Todos os lojistas já confirmaram a leitura da versão mais recente do sistema!
            </p>
          ) : (
            <div>
              <p style={{ fontSize: '12px', color: theme.textSec, marginBottom: '12px' }}>
                Os lojistas abaixo ainda não confirmaram a leitura da última atualização:
              </p>

              {/* ÁREA COM SCROLL INTERNO PARA NÃO ESTOURAR A TELA */}
              <div style={styles.scrollListContainer}>
                {lojistasDesatualizados.map((lojista, idx) => {
                  // 🔍 Capturando do objeto aninhado 'dadosLoja' do Firebase
                  const dados = lojista.dadosLoja || {};

                  const nomeLoja = dados.dsNomeLoja || dados.nomeLoja || lojista.nome || "Loja sem nome";
                  const slugLoja = dados.dsSlug || dados.slug || dados.subdominio || "sem-slug";
                  const idLoja = lojista.id;
                  const planoLoja = dados.dsPlanoLoja || lojista.plano || "Bronze";

                  return (
                    <div key={idx} style={{
                      ...styles.lojistaItemRow,
                      backgroundColor: isModoNoturno ? theme.bgApp : '#f8fafc',
                      borderColor: theme.border
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0 }}></span>
                        <div>
                          <strong style={{ color: theme.textMain, fontSize: '13px', display: 'block' }}>{nomeLoja}</strong>
                          <span style={{ color: theme.textSec, fontSize: '11px' }}>Slug: <code style={{ color: theme.primary }}>{slugLoja}</code> | ID: <span style={{ fontFamily: 'monospace' }}>{idLoja}</span></span>
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', backgroundColor: theme.border, color: theme.textMain }}>
                        {planoLoja}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2ª LINHA: GRÁFICOS E MÉTRICAS DE CONVERSÃO */}
      <div style={styles.row}>

        {/* VOLUME DE LOJAS */}
        <div style={{ ...styles.chartCard, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <div style={styles.cardHeader}>
            <h4 style={{ ...styles.cardTitle, color: theme.textMain }}><FiPieChart /> Distribuição de Planos</h4>
          </div>
          <div style={styles.donutContainer}>
            <svg width="140" height="140" viewBox="0 0 42 42" style={styles.donut}>
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={isModoNoturno ? "#334155" : "#f1f5f9"} strokeWidth="4"></circle>
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={dados.Ouro.cor} strokeWidth="4" strokeDasharray={`${pOuro} ${100 - pOuro}`} strokeDashoffset="25"></circle>
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={dados.Prata.cor} strokeWidth="4" strokeDasharray={`${pPrata} ${100 - pPrata}`} strokeDashoffset={25 - pOuro}></circle>
            </svg>
            <div style={styles.donutText}>
              <strong style={{ fontSize: '20px', color: theme.textMain }}>{totalLojistas}</strong>
              <span style={{ fontSize: '9px', color: theme.textSec, textTransform: 'uppercase', fontWeight: 'bold' }}>Lojas</span>
            </div>
          </div>
          <div style={{ ...styles.legendVertical, borderTop: `1px solid ${theme.border}` }}>
            <div style={{ ...styles.legendRow, color: theme.textSec }}><span>Ouro (Total)</span> <strong style={{ color: theme.textMain }}>{dados.Ouro.qtdTotal}</strong></div>
            <div style={{ ...styles.legendRow, color: theme.textSec }}><span>Prata (Total)</span> <strong style={{ color: theme.textMain }}>{dados.Prata.qtdTotal}</strong></div>
            <div style={{ ...styles.legendRow, color: theme.textSec }}><span>Bronze (Total)</span> <strong style={{ color: theme.textMain }}>{dados.Bronze.qtdTotal}</strong></div>
          </div>
        </div>

        {/* FUNIL DE CONVERSÃO */}
        <div style={{ ...styles.chartCard, background: isModoNoturno ? theme.bgCard : '#1e293b', border: `1px solid ${theme.border}` }}>
          <div style={styles.cardHeader}>
            <h4 style={{ ...styles.cardTitle, color: isModoNoturno ? theme.textMain : '#f8fafc' }}><FiTarget /> Funil de Conversão</h4>
          </div>

          <div style={styles.funnelItem}>
            <div style={styles.funnelHeader}>
              <span style={{ color: isModoNoturno ? theme.textSec : '#94a3b8' }}>Taxa de Conversão</span>
              <span style={{ color: '#3b82f6', fontWeight: '900' }}>{taxaConversao}%</span>
            </div>
            <div style={{ ...styles.progressBase, background: isModoNoturno ? theme.border : 'rgba(255,255,255,0.1)' }}>
              <div style={{ ...styles.progressFill, width: `${taxaConversao}%`, backgroundColor: '#3b82f6' }} />
            </div>
          </div>

          <div style={styles.metricGridMini}>
            <div style={{ ...styles.miniMetric, background: isModoNoturno ? theme.bgApp : 'rgba(255,255,255,0.05)', border: `1px solid ${theme.border}` }}>
              <FiTarget color="#3b82f6" />
              <div><small style={{ color: theme.textSec }}>Pagantes</small><strong style={{ color: isModoNoturno ? theme.textMain : '#f8fafc' }}>{lojistasPagantes.length}</strong></div>
            </div>
            <div style={{ ...styles.miniMetric, background: isModoNoturno ? theme.bgApp : 'rgba(255,255,255,0.05)', border: `1px solid ${theme.border}` }}>
              <FiTrendingDown color="#ef4444" />
              <div><small style={{ color: theme.textSec }}>Perdas Teste</small><strong style={{ color: isModoNoturno ? theme.textMain : '#f8fafc' }}>{churnTeste}</strong></div>
            </div>
          </div>

          <div style={{ ...styles.infoBoxDark, background: isModoNoturno ? theme.bgApp : 'rgba(59, 130, 246, 0.1)', border: `1px solid ${isModoNoturno ? theme.border : 'rgba(59, 130, 246, 0.2)'}`, color: isModoNoturno ? theme.textSec : '#94a3b8' }}>
            <p>O Faturamento Real ignora os <strong style={{ color: isModoNoturno ? theme.textMain : '#f8fafc' }}>{lojistasEmTeste.length} lojistas</strong> que ainda estão testando a plataforma.</p>
          </div>
        </div>

        {/* RECEITA POR PLANO */}
        <div style={{ ...styles.chartCard, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <div style={styles.cardHeader}>
            <h4 style={{ ...styles.cardTitle, color: theme.textMain }}><FiDollarSign /> Receita Real</h4>
          </div>
          <div style={styles.financeList}>
            {(['Ouro', 'Prata', 'Bronze'] as const).map((plano) => (
              <div key={plano} style={styles.financeItem}>
                <div style={{ ...styles.financeLabel, color: theme.textSec }}>
                  <span style={{ color: theme.textMain }}>{plano} <small style={{ fontWeight: 'normal', color: theme.textSec }}>(Pagantes: {dados[plano].qtdPagante})</small></span>
                  <strong style={{ color: theme.textMain }}>{faturamentoReal[plano].toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                </div>
                <div style={{ ...styles.barContainer, background: isModoNoturno ? theme.bgApp : '#f1f5f9' }}>
                  <div
                    style={{
                      ...styles.barFill,
                      backgroundColor: dados[plano].cor,
                      width: totalGeralReal > 0 ? `${(faturamentoReal[plano] / totalGeralReal) * 100}%` : '0%'
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ ...styles.totalFooter, borderTop: `2px dashed ${theme.border}` }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: theme.textSec }}>RECEITA LÍQUIDA ATUAL:</span>
            <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#10b981' }}>
              {totalGeralReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
          </div>
        </div>

      </div>
    </div>
  );
}

const styles: any = {
  panoramaContainer: { display: 'flex', flexDirection: 'column', gap: '25px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' },
  statCard: { padding: '25px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)' },
  iconBox: { width: '54px', height: '54px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' },
  statLabel: { fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' },
  statValue: { fontSize: '26px', fontWeight: '900', marginTop: '2px' },

  // Estilo para o Scroll Interno da Lista de Desatualizados
  scrollListContainer: {
    maxHeight: '180px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingRight: '4px'
  },
  lojistaItemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid'
  },

  row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' },
  chartCard: { padding: '30px', borderRadius: '28px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', minHeight: '350px' },
  cardHeader: { marginBottom: '25px' },
  cardTitle: { fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' },

  donutContainer: { position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: '25px' },
  donut: { transform: 'rotate(-90deg)' },
  donutText: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', display: 'flex', flexDirection: 'column' },
  legendVertical: { display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '20px' },
  legendRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px' },

  funnelItem: { marginBottom: '25px' },
  funnelHeader: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' },
  progressBase: { height: '8px', borderRadius: '10px', overflow: 'hidden' },
  progressFill: { height: '100%', transition: 'width 1s ease' },

  metricGridMini: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' },
  miniMetric: { padding: '15px', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '12px' },
  infoBoxDark: { padding: '15px', borderRadius: '15px', fontSize: '12px', lineHeight: '1.5' },

  financeList: { display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 },
  financeItem: { display: 'flex', flexDirection: 'column', gap: '8px' },
  financeLabel: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700' },
  barContainer: { height: '10px', borderRadius: '10px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '10px', transition: 'width 1s ease-out' },

  totalFooter: { marginTop: 'auto', paddingTop: '20px', textAlign: 'right' },
};