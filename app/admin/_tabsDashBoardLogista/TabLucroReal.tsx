// app/admin/_tabsDashBoardLogista/TabLucroReal.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from "@/context/ThemeContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export interface TabLucroRealProps {
  uid: string;
  formatarMoeda: (valor: number) => string;
  evolucaoMensal?: Record<string, any>;
  totalPedidos?: number;
}

const InfoCard = ({
  title,
  value,
  explanation,
  color,
  gridColumn,
  isCustomContent = false,
  children
}: {
  title: string,
  value?: string,
  explanation: string,
  color?: string,
  gridColumn?: string,
  isCustomContent?: boolean,
  children?: React.ReactNode
}) => {
  const [flipped, setFlipped] = useState(false);
  const { theme, isModoNoturno } = useTheme();

  return (
    <div style={{
      background: theme.bgCard,
      padding: '14px 16px',
      borderRadius: '12px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: theme.border,
      textAlign: 'center',
      boxSizing: 'border-box',
      position: 'relative',
      gridColumn,
      height: '110px',
      minHeight: '110px',
      maxHeight: '110px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: theme.textMain,
      overflow: 'hidden'
    }}>
      {/* FRENTE DO CARD */}
      <div style={{ 
        display: flipped ? 'none' : 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        width: '100%',
        height: '100%' 
      }}>
        <button
          onClick={() => setFlipped(true)}
          style={{
            position: 'absolute', top: '8px', right: '8px',
            background: isModoNoturno ? theme.border : '#f1f5f9',
            borderWidth: '0px', borderRadius: '50%', width: '22px', height: '22px',
            fontSize: '11px', fontWeight: 'bold', color: theme.textSec, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2
          }}
          title="Clique para ver o que significa"
        >?</button>
        <span style={{ ...localStyles.cardLabel, color: theme.textSec, marginBottom: '4px' }}>{title}</span>
        {isCustomContent ? children : <h3 style={{ margin: "0", fontSize: "20px", fontWeight: "bold", color: color || theme.textMain }}>{value}</h3>}
      </div>

      {/* VERSO DO CARD (EXPLICAÇÃO) */}
      <div style={{ 
        display: flipped ? 'flex' : 'none', 
        flexDirection: 'column', 
        justifyContent: 'center',
        width: '100%', 
        height: '100%',
        position: 'relative',
        paddingRight: '12px'
      }}>
        <button
          onClick={() => setFlipped(false)}
          style={{
            position: 'absolute', top: '-2px', right: '-2px',
            background: isModoNoturno ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
            borderWidth: '0px', borderRadius: '50%', width: '22px', height: '22px',
            fontSize: '11px', fontWeight: 'bold', color: '#ef4444', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2
          }}
          title="Voltar"
        >✕</button>
        <div style={{ fontSize: '11px', color: theme.textSec, textAlign: 'left', lineHeight: '1.35', overflowY: 'auto', maxHeight: '78px' }}>
          <strong style={{ color: theme.textMain }}>O que significa?</strong><br />
          {explanation}
        </div>
      </div>
    </div>
  );
};

export const TabLucroReal = ({
  uid,
  formatarMoeda,
  totalPedidos = 0
}: TabLucroRealProps) => {

  const { theme, isModoNoturno } = useTheme();

  const anoAtualStr = new Date().getFullYear().toString();
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtualStr);
  const [reducaoFixasPercent, setReducaoFixasPercent] = useState<number>(0);
  const [aumentoTicketPercent, setAumentoTicketPercent] = useState<number>(0);
  const [flippedSimulador, setFlippedSimulador] = useState(false);

  // Estado da Sub-Aba interna
  const [subAbaAtiva, setSubAbaAtiva] = useState<"geral" | "inteligencia">("geral");

  const [estatisticasMes, setEstatisticasMes] = useState<any>(null);
  const [estatisticasDevolucoes, setEstatisticasDevolucoes] = useState<any>(null);
  const [dadosGraficoAno, setDadosGraficoAno] = useState<any[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(true);

  const dataHoje = new Date();
  const mesAtual = dataHoje.getMonth() + 1;

  const mesesNomes = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];

  useEffect(() => {
    if (!uid) return;
    const carregarEstatisticasCloud = async () => {
      setLoadingCloud(true);
      try {
        const chaveMesAtual = `${mesesNomes[mesAtual - 1]}_${anoSelecionado}`;

        const docRef = doc(db, "lojistas", uid, "dashboard_stats", chaveMesAtual);
        const snap = await getDoc(docRef);
        if (snap.exists()) setEstatisticasMes(snap.data());
        else setEstatisticasMes(null);

        const devRef = doc(db, "lojistas", uid, "dashboard_stats", `devolucoes_${chaveMesAtual}`);
        const devSnap = await getDoc(devRef);
        if (devSnap.exists()) setEstatisticasDevolucoes(devSnap.data());
        else setEstatisticasDevolucoes(null);

        const mesesExibicao = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const promessasMeses = mesesNomes.map(async (nomeMes, index) => {
          const chaveMesLoop = `${nomeMes}_${anoSelecionado}`;
          try {
            const statSnap = await getDoc(doc(db, "lojistas", uid, "dashboard_stats", chaveMesLoop));
            const lucroLoop = statSnap.exists() ? Number(statSnap.data().lucroLiquidoReal || 0) : 0;
            return { mes: mesesExibicao[index], lucro: lucroLoop };
          } catch {
            return { mes: mesesExibicao[index], lucro: 0 };
          }
        });

        const resultadoGrafico = await Promise.all(promessasMeses);
        setDadosGraficoAno(resultadoGrafico);
      } catch (err) {
        console.error("Erro ao buscar dados da Cloud Function no Lucro Real:", err);
      } finally {
        setLoadingCloud(false);
      }
    };

    carregarEstatisticasCloud();
  }, [uid, anoSelecionado, mesAtual]);

  const receitaBrutaProdutos = Number(estatisticasMes?.receitaBrutaProdutos ?? 0);
  const deducoesVendas = Number(estatisticasMes?.deducoesVendas ?? 0);
  const receitaLiquida = Number(estatisticasMes?.receitaLiquida ?? 0);
  const cmv = Number(estatisticasMes?.cmv ?? 0);
  const lucroBruto = Number(estatisticasMes?.lucroBruto ?? 0);
  const custoTotalEmbalagens = Number(estatisticasMes?.custoTotalEmbalagens ?? 0);
  const despesasLogistica = Number(estatisticasMes?.despesasLogistica ?? 0);
  const resultadoOperacional = Number(estatisticasMes?.resultadoOperacional ?? 0);
  const totalDespesasFixas = Number(estatisticasMes?.totalDespesasFixas ?? 0);
  const totalDespesasVariaveis = Number(estatisticasMes?.totalDespesasVariaveis ?? 0);
  const lucroLiquidoReal = Number(estatisticasMes?.lucroLiquidoReal ?? 0);

  const gastoTotalCupons = Number(estatisticasMes?.detalhamento?.gastoTotalCupons ?? deducoesVendas ?? 0);
  const custoEtiquetasLojistaTotal = Number(estatisticasMes?.detalhamento?.custoEtiquetasLojistaTotal ?? 0);
  const custoFreteReversoTotal = Number(estatisticasMes?.detalhamento?.custoFreteReversoTotal ?? estatisticasDevolucoes?.custoFreteReversoAcumulado ?? 0);
  const prejuizoDevolucoes = Number(estatisticasDevolucoes?.valorTotalDevolucoes ?? 0);

  const margemContribuicao = lucroBruto;
  const margemPercentual = receitaLiquida > 0 ? (margemContribuicao / receitaLiquida) * 100 : 0;

  const rentabilidadeLiquida = receitaLiquida > 0 ? (lucroLiquidoReal / receitaLiquida) * 100 : 0;
  const totalCustosLogEtiquetaEmbalagem = despesasLogistica + custoTotalEmbalagens;
  const impactoFretePercentual = receitaLiquida > 0 ? (totalCustosLogEtiquetaEmbalagem / receitaLiquida) * 100 : 0;

  const pontoEquilequilibrio = margemPercentual > 0
    ? totalDespesasFixas / (margemPercentual / 100)
    : 0;

  // 🧮 CÁLCULOS DO SIMULADOR
  const despesasFixasSimuladas = totalDespesasFixas * (1 - reducaoFixasPercent / 100);
  const faturamentoSimulado = receitaLiquida * (1 + aumentoTicketPercent / 100);

  const proporcaoCMV = receitaLiquida > 0 ? cmv / receitaLiquida : 0;
  const proporcaoEmbalagens = receitaLiquida > 0 ? custoTotalEmbalagens / receitaLiquida : 0;
  const proporcaoLogistica = receitaLiquida > 0 ? despesasLogistica / receitaLiquida : 0;
  const proporcaoVar = receitaLiquida > 0 ? totalDespesasVariaveis / receitaLiquida : 0;

  const cmvSimulado = faturamentoSimulado * proporcaoCMV;
  const embalagensSimuladas = faturamentoSimulado * proporcaoEmbalagens;
  const logisticaSimulada = faturamentoSimulado * proporcaoLogistica;
  const despesasVariaveisSimuladas = faturamentoSimulado * proporcaoVar;

  const lucroRealSimulado = faturamentoSimulado
    - cmvSimulado
    - embalagensSimuladas
    - logisticaSimulada
    - despesasFixasSimuladas
    - despesasVariaveisSimuladas;

  const fluxoCaixa = useMemo(() => {
    const porPagamento = estatisticasMes?.porFormaPagamento || {};
    const qtdPix = Number(porPagamento['pix'] || porPagamento['dinheiro'] || porPagamento['à vista'] || 0);
    const qtdCartao = Number(porPagamento['cartão'] || porPagamento['cartao'] || porPagamento['crédito'] || porPagamento['débito'] || 0);
    const qtdOutros = Number(porPagamento['outro'] || porPagamento['outros'] || porPagamento['faturado'] || 0);
    const totalContagem = qtdPix + qtdCartao + qtdOutros;

    if (totalContagem > 0) {
      return {
        imediato: lucroLiquidoReal * (qtdPix / totalContagem),
        quinzenal: lucroLiquidoReal * (qtdCartao / totalContagem),
        mensal: lucroLiquidoReal * (qtdOutros / totalContagem)
      };
    }
    return { imediato: lucroLiquidoReal, quinzenal: 0, mensal: 0 };
  }, [estatisticasMes, lucroLiquidoReal]);

  const anosDisponiveis = [anoAtualStr, (Number(anoAtualStr) - 1).toString()];

  if (loadingCloud) {
    return <div style={{ textAlign: 'center', padding: '40px 20px', color: theme.textSec }}>Carregando dados de inteligência financeira do Firestore...</div>;
  }

  return (
    <div style={{ ...localStyles.container, color: theme.textMain, backgroundColor: 'transparent' }} className="tab-lucro-real-container">

      {/* 🌟 SUB-ABAS INTERNAS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '12px' }}>
        <button
          onClick={() => setSubAbaAtiva("geral")}
          style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
            backgroundColor: subAbaAtiva === "geral" ? theme.primary : theme.inputBg,
            color: subAbaAtiva === "geral" ? '#ffffff' : theme.textSec,
            transition: 'all 0.2s'
          }}
        >
          📊 Visão Executiva & DRE
        </button>
        <button
          onClick={() => setSubAbaAtiva("inteligencia")}
          style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
            backgroundColor: subAbaAtiva === "inteligencia" ? theme.primary : theme.inputBg,
            color: subAbaAtiva === "inteligencia" ? '#ffffff' : theme.textSec,
            transition: 'all 0.2s'
          }}
        >
          🧠 Raio-X & Detalhamento Operacional
        </button>
      </div>

      {/* SUB-ABA 1: VISÃO EXECUTIVA E DRE */}
      {subAbaAtiva === "geral" && (
        <>
          <div style={localStyles.kpiGrid} className="kpi-grid-mobile">
            <InfoCard
              title="Lucro Líquido Real"
              value={formatarMoeda(lucroLiquidoReal)}
              color={lucroLiquidoReal >= 0 ? '#10b981' : '#ef4444'}
              explanation="O ganho real do negócio processado pelos gatilhos do sistema após abater custos, cupons, fretes, despesas fixas e variáveis."
            />
            <InfoCard
              title="Margem de Contribuição"
              value={`${margemPercentual.toFixed(1)}%`}
              color={margemPercentual > 30 ? '#10b981' : '#f59e0b'}
              explanation="Percentual do faturamento líquido que sobra após pagar os custos diretos e logísticos controlados pelas functions."
            />
            <InfoCard
              title="Rentabilidade Líquida"
              value={`${rentabilidadeLiquida.toFixed(1)}%`}
              color={rentabilidadeLiquida > 15 ? '#10b981' : '#3b82f6'}
              explanation="Quanto cada R$ 1,00 faturado se traduz efetivamente em lucro no caixa da empresa."
            />
            <InfoCard
              title="Impacto do Frete & Envios"
              value={`${impactoFretePercentual.toFixed(1)}%`}
              color={impactoFretePercentual > 10 ? '#ef4444' : '#10b981'}
              explanation="Percentual da receita consumido por fretes grátis, etiquetas subsidiadas e logísticas locais."
            />
            <InfoCard
              title="🎯 Ponto de Equilíbrio (Break-Even)"
              gridColumn="1 / -1"
              isCustomContent={true}
              explanation="Faturamento mínimo mensal necessário para cobrir todos os custos operacionais calculados."
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: theme.textSec }}>Faturamento para zerar o custo:</span>
                <strong style={{ fontSize: '16px', color: theme.textMain }}>{formatarMoeda(pontoEquilequilibrio)}</strong>
              </div>
            </InfoCard>
          </div>

          {/* SIMULADOR DE CENÁRIOS COM FLIP INTEGRADO */}
          <div style={{ ...localStyles.dreCard, marginTop: '20px', background: theme.bgCard, borderWidth: '1px', borderStyle: 'solid', borderColor: theme.border, position: 'relative' }}>
            <button
              onClick={() => setFlippedSimulador(!flippedSimulador)}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: isModoNoturno ? theme.border : '#f1f5f9',
                borderWidth: '0px', borderRadius: '50%', width: '24px', height: '24px',
                fontSize: '11px', fontWeight: 'bold', color: theme.textSec, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 2
              }}
              title={flippedSimulador ? "Voltar ao Simulador" : "O que significa?"}
            >
              {flippedSimulador ? "✕" : "?"}
            </button>

            {!flippedSimulador ? (
              <>
                <h4 style={{ ...localStyles.dreTitle, color: theme.textMain, borderBottomColor: theme.border, paddingRight: '30px' }}>🧮 Simulador de Cenários Estratégicos</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textSec, display: 'block', marginBottom: '5px' }}>
                      Reduzir Custos Fixos: {reducaoFixasPercent}%
                    </label>
                    <input
                      type="range" min="0" max="50" step="5"
                      value={reducaoFixasPercent}
                      onChange={(e) => setReducaoFixasPercent(Number(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textSec, display: 'block', marginBottom: '5px' }}>
                      Aumentar Faturamento / Ticket: {aumentoTicketPercent}%
                    </label>
                    <input
                      type="range" min="0" max="50" step="5"
                      value={aumentoTicketPercent}
                      onChange={(e) => setAumentoTicketPercent(Number(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                  </div>
                </div>
                <div style={{ background: theme.inputBg, padding: '12px', borderRadius: '8px', borderWidth: '1px', borderStyle: 'solid', borderColor: theme.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: theme.textMain }}>Lucro Líquido Simulado:</span>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: lucroRealSimulado >= lucroLiquidoReal ? '#10b981' : '#ef4444' }}>
                    {formatarMoeda(lucroRealSimulado)}
                    <span style={{ fontSize: '11px', fontWeight: 'normal', marginLeft: '6px', color: theme.textSec }}>
                      (Atual: {formatarMoeda(lucroLiquidoReal)})
                    </span>
                  </span>
                </div>
              </>
            ) : (
              <div style={{ paddingRight: '20px' }}>
                <h4 style={{ ...localStyles.dreTitle, color: theme.textMain, borderBottomColor: theme.border }}>💡 O que é o Simulador de Cenários?</h4>
                <p style={{ fontSize: '13px', color: theme.textSec, lineHeight: '1.5', margin: 0 }}>
                  Esta ferramenta permite antecipar resultados financeiros projetando reduções nas despesas fixas ou expansões no faturamento bruto. 
                  O motor do sistema recalcula automaticamente de forma proporcional todos os custos variáveis atrelados à operação.
                </p>
              </div>
            )}
          </div>

          {/* GRÁFICO */}
          <div style={{ ...localStyles.dreCard, marginTop: '20px', background: theme.bgCard, borderWidth: '1px', borderStyle: 'solid', borderColor: theme.border }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <h4 style={{ ...localStyles.dreTitle, color: theme.textMain, borderBottomWidth: '0px', margin: 0, paddingBottom: 0 }}>📈 Evolução Mensal do Lucro (Cloud Function)</h4>
              <select
                value={anoSelecionado}
                onChange={(e) => setAnoSelecionado(e.target.value)}
                style={{ padding: '6px', borderRadius: '5px', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.textMain, borderWidth: '1px', borderStyle: 'solid', borderColor: theme.border }}
              >
                {anosDisponiveis.map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>
            <div style={{ width: '100%', height: '250px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosGraficoAno}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
                  <XAxis dataKey="mes" fontSize={12} stroke={theme.textSec} />
                  <YAxis fontSize={12} stroke={theme.textSec} />
                  <Tooltip
                    formatter={(value: any) => formatarMoeda(Number(value) || 0)}
                    contentStyle={{ backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.textMain }}
                  />
                  <Line type="monotone" dataKey="lucro" stroke={theme.primary} strokeWidth={3} dot={{ r: 4 }} name="Lucro Real" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* DRE CORPÓRATIVA ABERTA EM LINHAS DETALHADAS */}
          <div style={{ ...localStyles.dreCard, marginTop: '20px', background: theme.bgCard, borderWidth: '1px', borderStyle: 'solid', borderColor: theme.border }}>
            <h4 style={{ ...localStyles.dreTitle, color: theme.textMain, borderBottomColor: theme.border }}>📊 Demonstrativo de Resultados (DRE Corporativa Detalhada)</h4>

            <div style={localStyles.row}><span style={{ color: theme.textSec }}>(=) Receita Bruta de Produtos</span> <span style={{ color: theme.textMain }}>{formatarMoeda(receitaBrutaProdutos)}</span></div>
            
            <div style={{ ...localStyles.row, color: '#ef4444', paddingLeft: '12px' }}><span style={{ color: '#ef4444' }}>↳ (-) Gasto Total com Cupons Promocionais</span> <span>- {formatarMoeda(gastoTotalCupons)}</span></div>
            {deducoesVendas - gastoTotalCupons > 0 && (
              <div style={{ ...localStyles.row, color: '#ef4444', paddingLeft: '12px' }}><span style={{ color: '#ef4444' }}>↳ (-) Outras Deduções / Descontos</span> <span>- {formatarMoeda(deducoesVendas - gastoTotalCupons)}</span></div>
            )}

            <div style={{ ...localStyles.row, background: theme.inputBg, fontWeight: 'bold', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${theme.border}`, margin: '4px 0' }}><span style={{ color: theme.textMain }}>(=) Receita Líquida</span> <span style={{ color: theme.textMain }}>{formatarMoeda(receitaLiquida)}</span></div>
            
            <div style={{ ...localStyles.row, color: '#ef4444' }}><span style={{ color: '#ef4444' }}>(-) CMV (Custo das Mercadorias Vendidas)</span> <span>- {formatarMoeda(cmv)}</span></div>
            
            <div style={{ ...localStyles.row, background: theme.inputBg, fontWeight: 'bold', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${theme.border}`, margin: '4px 0' }}><span style={{ color: theme.textMain }}>(=) Lucro Bruto (Margem de Contribuição)</span> <span style={{ color: theme.textMain }}>{formatarMoeda(lucroBruto)}</span></div>
            
            <div style={{ ...localStyles.row, color: '#ef4444', paddingLeft: '12px' }}><span style={{ color: '#ef4444' }}>↳ (-) Custo de Etiquetas de Envio (Frete Grátis)</span> <span>- {formatarMoeda(custoEtiquetasLojistaTotal)}</span></div>
            <div style={{ ...localStyles.row, color: '#ef4444', paddingLeft: '12px' }}><span style={{ color: '#ef4444' }}>↳ (-) Custo de Frete Reverso (Devoluções)</span> <span>- {formatarMoeda(custoFreteReversoTotal)}</span></div>
            {despesasLogistica - (custoEtiquetasLojistaTotal + custoFreteReversoTotal) !== 0 && (
              <div style={{ ...localStyles.row, color: '#ef4444', paddingLeft: '12px' }}><span style={{ color: '#ef4444' }}>↳ (-) Outras Despesas Logísticas</span> <span>- {formatarMoeda(Math.abs(despesasLogistica - (custoEtiquetasLojistaTotal + custoFreteReversoTotal)))}</span></div>
            )}

            <div style={{ ...localStyles.row, color: '#ef4444' }}><span style={{ color: '#ef4444' }}>(-) Custo Total de Embalagens</span> <span>- {formatarMoeda(custoTotalEmbalagens)}</span></div>
            
            <div style={{ ...localStyles.row, background: theme.inputBg, fontWeight: 'bold', padding: '8px', borderRadius: '6px', border: `1px solid ${theme.border}`, margin: '6px 0' }}><span style={{ color: theme.textMain }}>(=) Resultado Operacional</span> <span style={{ color: theme.textMain }}>{formatarMoeda(resultadoOperacional)}</span></div>
            
            <div style={{ ...localStyles.row, color: '#ef4444' }}><span style={{ color: '#ef4444' }}>(-) Total de Despesas Fixas</span> <span>- {formatarMoeda(totalDespesasFixas)}</span></div>
            <div style={{ ...localStyles.row, color: '#ef4444' }}><span style={{ color: '#ef4444' }}>(-) Total de Despesas Variáveis</span> <span>- {formatarMoeda(totalDespesasVariaveis)}</span></div>
            
            {prejuizoDevolucoes > 0 && (
              <div style={{ ...localStyles.row, color: '#ef4444', marginTop: '6px' }}><span>(-) Prejuízo Bruto com Pedidos Devolvidos</span> <span>- {formatarMoeda(prejuizoDevolucoes)}</span></div>
            )}
            
            <div style={{ ...localStyles.row, borderTop: `2px solid ${theme.border}`, marginTop: '10px', paddingTop: '10px', fontWeight: 'bold' }}>
              <span style={{ color: theme.textMain }}>(=) LUCRO LÍQUIDO REAL</span>
              <span style={{ color: lucroLiquidoReal >= 0 ? '#10b981' : '#ef4444', fontSize: '15px' }}>{formatarMoeda(lucroLiquidoReal)}</span>
            </div>
          </div>
        </>
      )}

      {/* SUB-ABA 2: RAIO-X & DETALHAMENTO OPERACIONAL ORGANIZADO POR GRUPOS */}
      {subAbaAtiva === "inteligencia" && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* 🚚 GRUPO 1: RECEITAS & ENTRADAS DE FRETE */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: theme.textMain, marginBottom: '12px' }}>🚚 Receitas de Frete & Taxas Operacionais</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
              <InfoCard 
                title="Frete (Entrega Local)" 
                value={formatarMoeda(Number(estatisticasMes?.detalhamento?.receitaFreteEntregaLocal || 0))}
                color="#10b981"
                explanation="Receita total obtida com taxas de entrega local cobradas dos clientes (motoboy)."
              />
              <InfoCard 
                title="Frete (Transportadoras)" 
                value={formatarMoeda(Number(estatisticasMes?.detalhamento?.receitaFreteTransportadora || 0))}
                color="#10b981"
                explanation="Receita total gerada com fretes de transportadoras embutidos nos pedidos."
              />
              <InfoCard 
                title="Taxas de Gateway de Cartão" 
                value={formatarMoeda(Number(estatisticasMes?.detalhamento?.taxasGatewayCartao || 0))}
                color="#ef4444"
                explanation="Montante total retido pelas operadoras de cartão de crédito/débito referente às taxas de transação."
              />
              <InfoCard 
                title="Comissões de Vendas" 
                value={formatarMoeda(Number(estatisticasMes?.detalhamento?.comissoesVendas || 0))}
                color="#ef4444"
                explanation="Total pago em comissões sobre as vendas realizadas pelos operadores ou parceiros."
              />
            </div>
          </div>

          {/* 📦 GRUPO 2: LOGÍSTICA PADRÃO, EMBALAGENS & DIVERGÊNCIAS */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: theme.textMain, marginBottom: '12px' }}>📦 Logística Padrão, Embalagens & Divergências</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
              <InfoCard 
                title="Custo Total de Etiquetas" 
                value={formatarMoeda(custoEtiquetasLojistaTotal)}
                color={theme.textMain}
                explanation="Valor total gasto acumulado com etiquetas de envio e postagens logísticas no mês."
              />
              <InfoCard 
                title="Custo de Embalagens" 
                value={formatarMoeda(custoTotalEmbalagens)}
                color={theme.textMain}
                explanation="Custo acumulado com insumos e embalagens físicas utilizadas para despachar os produtos."
              />
              <InfoCard 
                title="Divergência de Frete" 
                value={formatarMoeda(Number(estatisticasMes?.detalhamento?.saldoDivergenciaFrete || 0))}
                color={Number(estatisticasMes?.detalhamento?.saldoDivergenciaFrete || 0) < 0 ? "#ef4444" : "#10b981"}
                explanation="Saldo financeiro resultante da diferença entre o frete cobrado do cliente e o preço real cobrado na etiqueta."
              />
              <InfoCard 
                title="Desvios de Embalagem" 
                value={`${Number(estatisticasMes?.detalhamento?.totalDesviosEmbalagemRecomendada || 0)} un`}
                color="#f59e0b"
                explanation="Quantidade de vezes em que a embalagem escolhida pelo operador divergiu da recomendada pelo sistema."
              />
            </div>
          </div>

          {/* 🔄 GRUPO 3: LOGÍSTICA REVERSA / DEVOLUÇÕES */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: theme.textMain, marginBottom: '12px' }}>🔄 Logística Reversa & Devoluções</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
              <InfoCard 
                title="Custo de Frete Reverso" 
                value={formatarMoeda(custoFreteReversoTotal)}
                color="#ef4444"
                explanation="Montante total acumulado gasto com fretes e taxas de logística reversa decorrentes de devoluções."
              />
            </div>
          </div>

          {/* ⏱️ BLOCO: PREVISÃO DE ENTRADA NO CAIXA */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: theme.textMain, marginBottom: '12px' }}>⏱️ Previsão de Entrada no Caixa</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
              <InfoCard 
                title="Pix / Dinheiro" 
                value={formatarMoeda(fluxoCaixa.imediato)}
                color={theme.textMain}
                explanation="Disponibilidade financeira imediata gerada por transações à vista."
              />
              <InfoCard 
                title="Cartões (14 Dias)" 
                value={formatarMoeda(fluxoCaixa.quinzenal)}
                color={theme.textMain}
                explanation="Valor previsto a cair no caixa considerando o prazo médio de repasse dos recebíveis de cartão."
              />
              <InfoCard 
                title="Outros / Faturados" 
                value={formatarMoeda(fluxoCaixa.mensal)}
                color={theme.textMain}
                explanation="Valores referentes a vendas faturadas ou crediários com recebimento programado para até 30 dias."
              />
            </div>
          </div>

          {/* 📦 BLOCO: RANKING E CONSUMO DE EMBALAGENS */}
          <div style={{ ...localStyles.dreCard, background: theme.bgCard, borderWidth: '1px', borderStyle: 'solid', borderColor: theme.border }}>
            <h4 style={{ ...localStyles.dreTitle, color: theme.textMain, borderBottomColor: theme.border }}>
              📦 Consumo e Custos por Tipo de Embalagem
            </h4>
            
            {estatisticasMes?.embalagemRanking && estatisticasMes.embalagemRanking.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.border}`, textAlign: 'left', color: theme.textSec }}>
                      <th style={{ padding: '8px' }}>Embalagem</th>
                      <th style={{ padding: '8px' }}>Qtd Usada</th>
                      <th style={{ padding: '8px' }}>Custo Unitário</th>
                      <th style={{ padding: '8px' }}>Total Gasto</th>
                      <th style={{ padding: '8px' }}>Desvios do Sistema</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estatisticasMes.embalagemRanking.map((emb: any, idx: number) => (
                      <tr key={emb.embalagemId || idx} style={{ borderBottom: `1px solid ${theme.border}` }}>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{emb.nomeEmbalagem}</td>
                        <td style={{ padding: '8px' }}>{emb.quantidadeUtilizada} un</td>
                        <td style={{ padding: '8px' }}>{formatarMoeda(Number(emb.custoUnitarioPadrao || 0))}</td>
                        <td style={{ padding: '8px', color: '#ef4444', fontWeight: 'bold' }}>{formatarMoeda(Number(emb.custoTotalGasto || 0))}</td>
                        <td style={{ padding: '8px', color: Number(emb.vezesDiferenteRecomendada || 0) > 0 ? '#f59e0b' : theme.textMain }}>
                          {emb.vezesDiferenteRecomendada || 0} vez(es)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: theme.textSec, margin: 0 }}>Nenhum dado de embalagem registrado para este mês.</p>
            )}
          </div>

          {/* 📦 BLOCO: VOLUMETRIA DE ITENS */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: theme.textMain, marginBottom: '12px' }}>📦 Desempenho de Volume</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
              <InfoCard 
                title="Total de Itens Vendidos" 
                value={`${Number(estatisticasMes?.detalhamento?.numeroItensVendidos || 0)} un`}
                color={theme.textMain}
                explanation="Quantidade total somada de produtos despachados ou vendidos no período."
              />
              <InfoCard 
                title="Total de Cupons Aplicados" 
                value={`${Number(estatisticasMes?.detalhamento?.numeroCuponsUtilizado || 0)} un`}
                color={theme.textMain}
                explanation="Número total de vezes em que cupons promocionais foram resgatados com sucesso nos carrinhos."
              />
            </div>
          </div>

          {/* 🎟️ BLOCO: CUPONS E DESCONTOS */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: theme.textMain, marginBottom: '12px' }}>🎟️ Campanhas de Cupons Utilizadas</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
              <InfoCard 
                title="Total Gasto em Cupons" 
                value={formatarMoeda(gastoTotalCupons)}
                color="#ef4444"
                explanation="Montante total de descontos concedidos aos clientes através de cupons promocionais no período."
              />
              <InfoCard 
                title="Detalhamento por Cupom" 
                isCustomContent={true}
                explanation="Indica os códigos dos cupons resgatados, o tipo de desconto e a quantidade de vezes que cada um foi aplicado."
              >
                <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', width: '100%', maxHeight: '72px', overflowY: 'auto' }}>
                  {estatisticasMes?.porCupom && Object.keys(estatisticasMes.porCupom).length > 0 ? (
                    Object.entries(estatisticasMes.porCupom).map(([cupomNome, cupomDados]: [string, any]) => (
                      <div key={cupomNome} style={{ fontFamily: 'monospace', borderBottom: `1px dashed ${theme.border}`, paddingBottom: '2px' }}>
                        🎟️ <strong>{cupomNome}</strong>: {cupomDados.quantidadeUtilizada || 1}x <span style={{ color: theme.textSec }}>({cupomDados.tipo || 'geral'})</span>
                      </div>
                    ))
                  ) : (
                    <span>Nenhum cupom detalhado</span>
                  )}
                </div>
              </InfoCard>
            </div>
          </div>

          {/* 🌐 BLOCO: CANAIS, ENTREGAS E PAGAMENTOS */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: theme.textMain, marginBottom: '12px' }}>🌐 Canais, Formas de Entrega & Pagamento</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
              
              <InfoCard 
                title="Formas de Entrega" 
                isCustomContent={true}
                explanation="Volume de pedidos segmentado pelo método logístico escolhido pelos clientes."
              >
                <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left', width: '100%', maxHeight: '72px', overflowY: 'auto' }}>
                  {estatisticasMes?.porFormaEntrega && Object.keys(estatisticasMes.porFormaEntrega).length > 0 ? (
                    Object.entries(estatisticasMes.porFormaEntrega).map(([entrega, qtd]: [string, any]) => (
                      <div key={entrega} style={{ textTransform: 'capitalize' }}>
                        📦 {entrega.replace('_', ' ')}: <strong>{qtd} pedido(s)</strong>
                      </div>
                    ))
                  ) : (
                    <span>Nenhuma entrega registrada</span>
                  )}
                </div>
              </InfoCard>

              <InfoCard 
                title="Canais de Origem (Site / PDV)" 
                isCustomContent={true}
                explanation="Indica quais canais de venda geraram mais volumetria de pedidos no mês."
              >
                <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left', width: '100%', maxHeight: '72px', overflowY: 'auto' }}>
                  {estatisticasMes?.porOrigem && Object.keys(estatisticasMes.porOrigem).length > 0 ? (
                    Object.entries(estatisticasMes.porOrigem).map(([origemKey, qtd]: [string, any]) => (
                      <div key={origemKey} style={{ textTransform: 'uppercase' }}>
                        🌐 {origemKey}: <strong>{qtd} pedido(s)</strong>
                      </div>
                    ))
                  ) : (
                    <span>Nenhuma origem registrada</span>
                  )}
                </div>
              </InfoCard>

              <InfoCard 
                title="Formas de Pagamento" 
                isCustomContent={true}
                explanation="Preferência dos clientes em relação aos métodos de pagamento utilizados."
              >
                <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left', width: '100%', maxHeight: '72px', overflowY: 'auto' }}>
                  {estatisticasMes?.porFormaPagamento && Object.keys(estatisticasMes.porFormaPagamento).length > 0 ? (
                    Object.entries(estatisticasMes.porFormaPagamento).map(([pag, qtd]: [string, any]) => (
                      <div key={pag} style={{ textTransform: 'capitalize' }}>
                        💳 {pag}: <strong>{qtd} pedido(s)</strong>
                      </div>
                    ))
                  ) : (
                    <span>Nenhum pagamento registrado</span>
                  )}
                </div>
              </InfoCard>

            </div>
          </div>

        </div>
      )}

      {/* RODAPÉ DE AUDITORIA */}
      <div style={{ ...localStyles.auditoriaFooter, background: isModoNoturno ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff', color: isModoNoturno ? '#93c5fd' : '#1e40af', borderWidth: '1px', borderStyle: 'solid', borderColor: theme.border }}>
        💡 <strong style={{ color: isModoNoturno ? '#bfdbfe' : '#1e3a8a' }}>Auditoria Automática do Sistema:</strong>
        {margemPercentual >= 30
          ? " Excelente! Sua margem de contribuição e lucro bruto estão em patamar seguro acima de 30%."
          : " Alerta: Sua margem está comprimida. Valide os custos de CMV, embalagens e o impacto de cupons e fretes."}
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .kpi-grid-mobile {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

const localStyles: Record<string, React.CSSProperties> = {
  container: { padding: "10px 0px", fontFamily: "sans-serif" }, // 🌟 CORRIGIDO: Removido conflito de shorthand vs non-shorthand (paddingTop/Bottom/Left/Right)
  kpiGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "25px" },
  dreCard: { padding: "24px", borderRadius: '12px', boxSizing: 'border-box' }, // 🌟 CORRIGIDO
  dreTitle: { margin: "0 0 15px 0", borderBottomWidth: '1px', borderBottomStyle: 'solid', paddingBottom: "10px" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0px", fontSize: "13px", gap: "12px" }, // 🌟 CORRIGIDO
  rowText: { flex: 1 },
  rowVal: { whiteSpace: 'nowrap', fontWeight: '600', flexShrink: 0 },
  cardLabel: { fontSize: "10px", fontWeight: "800", textTransform: "uppercase" },
  auditoriaFooter: { padding: "15px", borderRadius: '8px', marginTop: "20px", fontSize: "13px" } // 🌟 CORRIGIDO
};