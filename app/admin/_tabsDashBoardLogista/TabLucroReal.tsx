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
      padding: '20px', 
      borderRadius: '12px', 
      border: `1px solid ${theme.border}`, 
      textAlign: 'center', 
      boxSizing: 'border-box',
      position: 'relative', 
      gridColumn,
      perspective: '1000px',
      minHeight: '110px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      color: theme.textMain
    }}>
      <div style={{ display: flipped ? 'none' : 'block', width: '100%' }}>
        <button 
          onClick={() => setFlipped(true)}
          style={{ 
            position: 'absolute', top: '10px', right: '10px', 
            background: isModoNoturno ? theme.border : '#f1f5f9', 
            border: 'none', borderRadius: '50%', width: '22px', height: '22px', 
            fontSize: '11px', fontWeight: 'bold', color: theme.textSec, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          title="Clique para ver o que significa"
        >?</button>
        <span style={{ ...localStyles.cardLabel, color: theme.textSec }}>{title}</span>
        {isCustomContent ? children : <h3 style={{ margin: "10px 0 0 0", fontSize: "26px", color: color || theme.textMain }}>{value}</h3>}
      </div>

      <div style={{ display: flipped ? 'block' : 'none', width: '100%', position: 'relative' }}>
        <button 
          onClick={() => setFlipped(false)}
          style={{ 
            position: 'absolute', top: '-10px', right: '-5px', 
            background: isModoNoturno ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', 
            border: 'none', borderRadius: '50%', width: '22px', height: '22px', 
            fontSize: '11px', fontWeight: 'bold', color: '#ef4444', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          title="Voltar"
        >✕</button>
        <div style={{ fontSize: '12px', color: theme.textSec, textAlign: 'left', lineHeight: '1.4', paddingRight: '15px' }}>
          <strong style={{ color: theme.textMain }}>O que significa?</strong><br/>
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

  // Estados dos dados consolidados da Cloud Function
  const [estatisticasMes, setEstatisticasMes] = useState<any>(null);
  const [estatisticasDevolucoes, setEstatisticasDevolucoes] = useState<any>(null);
  const [dadosGraficoAno, setDadosGraficoAno] = useState<any[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(true);

  const dataHoje = new Date();
  const mesAtual = dataHoje.getMonth() + 1;

  // 1. Busca os dados do mês atual e o histórico anual direto da Cloud Function no Firestore
  useEffect(() => {
    if (!uid) return;
    const carregarEstatisticasCloud = async () => {
      setLoadingCloud(true);
      try {
        // A. Resumo financeiro do mês atual selecionado
        const docRef = doc(db, "lojistas", uid, "dashboard_stats", `${anoSelecionado}_${mesAtual}`);
        const snap = await getDoc(docRef);
        if (snap.exists()) setEstatisticasMes(snap.data());
        else setEstatisticasMes(null);

        // B. Estatísticas de Devoluções do mês atual
        const devRef = doc(db, "lojistas", uid, "dashboard_stats", `devolucoes_${anoSelecionado}_${mesAtual}`);
        const devSnap = await getDoc(devRef);
        if (devSnap.exists()) setEstatisticasDevolucoes(devSnap.data());
        else setEstatisticasDevolucoes(null);

        // C. Busca os dados dos 12 meses do ano selecionado para montar o Gráfico de Evolução
        const mesesNomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const promessasMeses = mesesNomes.map(async (_, index) => {
          const numMes = index + 1;
          const chaveMesLoop = `${anoSelecionado}_${numMes}`;
          
          try {
            const [statSnap, devLoopSnap] = await Promise.all([
              getDoc(doc(db, "lojistas", uid, "dashboard_stats", chaveMesLoop)),
              getDoc(doc(db, "lojistas", uid, "dashboard_stats", `devolucoes_${chaveMesLoop}`))
            ]);

            const fatMes = statSnap.exists() ? Number(statSnap.data().faturamentoLiquido || 0) : 0;
            const detMes = statSnap.exists() ? statSnap.data().detalhamento || {} : {};
            const devMes = devLoopSnap.exists() ? Number(devLoopSnap.data().valorTotalDevolucoes || 0) : 0;
            const freteReversoMes = devLoopSnap.exists() ? Number(devLoopSnap.data().custoTotalReverso || 0) : 0;

            const fatLiquidoMes = Math.max(0, fatMes - devMes);
            const freteMes = Number(detMes.custoFreteGratisLoja || 0) + Number(detMes.custoEtiquetasLojistaTotal || 0) + Number(detMes.custoFreteEntregaLocal || 0) + freteReversoMes;
            const cuponsMes = Number(detMes.gastoTotalCupons || 0);
            
            const custosVariaveisMes = freteMes + cuponsMes;
            const lucroLiquidoMes = fatLiquidoMes - custosVariaveisMes;

            return {
              mes: mesesNomes[index],
              lucro: lucroLiquidoMes
            };
          } catch {
            return { mes: mesesNomes[index], lucro: 0 };
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

  // 🌟 AUDITORIA E PROCESSAMENTO DOS DADOS REAIS DA CLOUD FUNCTION
  const faturamentoBrutoSistema = Number(estatisticasMes?.faturamentoLiquido ?? 0);
  const qtdPedidos = Number(estatisticasMes?.totalPedidos ?? totalPedidos);
  const detalhamento = estatisticasMes?.detalhamento || {};

  const receitaBrutaProdutos = Number(detalhamento.receitaBrutaProdutos ?? faturamentoBrutoSistema);
  const gastoTotalCupons = Number(detalhamento.gastoTotalCupons ?? 0);
  const custoFreteGratisLoja = Number(detalhamento.custoFreteGratisLoja ?? 0);
  const custoEtiquetasLojistaTotal = Number(detalhamento.custoEtiquetasLojistaTotal ?? 0);
  const custoFreteEntregaLocal = Number(detalhamento.custoFreteEntregaLocal ?? 0);

  // 📉 Tratamento rigoroso das Devoluções e Frete Reverso
  const prejuizoDevolucoes = Number(estatisticasDevolucoes?.valorTotalDevolucoes ?? 0);
  const custoFreteReverso = Number(estatisticasDevolucoes?.custoTotalReverso ?? 0);

  // Faturamento Líquido Real (Receita Bruta - Estornos de Devoluções)
  const faturamentoLiquidoReal = Math.max(0, receitaBrutaProdutos - prejuizoDevolucoes);

  // Composição total das despesas logísticas e de frete (Incluindo frete reverso)
  const despesaFreteLojista = custoFreteGratisLoja + custoEtiquetasLojistaTotal + custoFreteEntregaLocal + custoFreteReverso;
  const despesasVariaveis = gastoTotalCupons; 
  const despesasFixas = 0; 

  const totalCustosVariaveis = despesaFreteLojista + despesasVariaveis;
  const margemContribuicao = faturamentoLiquidoReal - totalCustosVariaveis;
  const margemPercentual = faturamentoLiquidoReal > 0 ? (margemContribuicao / faturamentoLiquidoReal) * 100 : 0;
  
  const lucroReal = margemContribuicao - despesasFixas;
  const rentabilidadeLiquida = faturamentoLiquidoReal > 0 ? (lucroReal / faturamentoLiquidoReal) * 100 : 0;

  const impactoFretePercentual = faturamentoLiquidoReal > 0 ? (despesaFreteLojista / faturamentoLiquidoReal) * 100 : 0;

  const pontoEquilequilibrio = margemPercentual > 0 
    ? despesasFixas / (margemPercentual / 100) 
    : 0;

  const despesasFixasSimuladas = despesasFixas * (1 - reducaoFixasPercent / 100);
  const faturamentoSimulado = faturamentoLiquidoReal * (1 + aumentoTicketPercent / 100);
  const margemContribuicaoSimulada = faturamentoSimulado * (margemPercentual / 100);
  const lucroRealSimulado = margemContribuicaoSimulada - despesasFixasSimuladas;

  // Mapeamento 100% Real e Estrito do Fluxo de Caixa
  const fluxoCaixa = useMemo(() => {
    const porPagamento = estatisticasMes?.porFormaPagamento || {};
    
    const qtdPix = Number(porPagamento['pix'] || porPagamento['dinheiro'] || porPagamento['à vista'] || porPagamento['pix/dinheiro'] || 0);
    const qtdCartao = Number(porPagamento['cartão'] || porPagamento['cartao'] || porPagamento['crédito'] || porPagamento['débito'] || porPagamento['cartao_credito'] || porPagamento['cartao_debitp'] || 0);
    const qtdOutros = Number(porPagamento['outro'] || porPagamento['outros'] || porPagamento['faturado'] || 0);

    const totalContagem = qtdPix + qtdCartao + qtdOutros;

    if (totalContagem > 0) {
      return {
        imediato: faturamentoLiquidoReal * (qtdPix / totalContagem),
        quinzenal: faturamentoLiquidoReal * (qtdCartao / totalContagem),
        mensal: faturamentoLiquidoReal * (qtdOutros / totalContagem)
      };
    }

    return { imediato: 0, quinzenal: 0, mensal: 0 };
  }, [estatisticasMes, faturamentoLiquidoReal]);

  const anosDisponiveis = [anoAtualStr, (Number(anoAtualStr) - 1).toString()];

  if (loadingCloud) {
    return <div style={{ textAlign: 'center', padding: '40px', color: theme.textSec }}>Carregando dados de inteligência financeira do Firestore...</div>;
  }

  return (
    <div style={{ ...localStyles.container, color: theme.textMain, backgroundColor: 'transparent' }} className="tab-lucro-real-container">

      {/* 1. INDICADORES CHAVE DE PERFORMANCE (KPIs) */}
      <div style={localStyles.kpiGrid} className="kpi-grid-mobile">
        <InfoCard 
          title="Lucro Líquido Real" 
          value={formatarMoeda(lucroReal)}
          color={lucroReal >= 0 ? '#10b981' : '#ef4444'}
          explanation="O ganho real do negócio processado pelos gatilhos do sistema após abater custos, cupons, fretes e devoluções."
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: theme.textSec }}>Faturamento para zerar o custo operacional:</span>
            <strong style={{ fontSize: '18px', color: theme.textMain }}>{formatarMoeda(pontoEquilequilibrio)}</strong>
          </div>
        </InfoCard>
      </div>

      {/* 2. SIMULADOR DE CENÁRIOS ("E SE?") */}
      <div style={{ ...localStyles.dreCard, marginTop: '20px', background: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <h4 style={{ ...localStyles.dreTitle, color: theme.textMain, borderBottomColor: theme.border }}>🧮 Simulador de Cenários Estratégicos</h4>
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
        <div style={{ background: theme.inputBg, padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: theme.textMain }}>Lucro Líquido Simulado:</span>
          <span style={{ fontSize: '18px', fontWeight: '800', color: lucroRealSimulado >= lucroReal ? '#10b981' : '#ef4444' }}>
            {formatarMoeda(lucroRealSimulado)} 
            <span style={{ fontSize: '11px', fontWeight: 'normal', marginLeft: '6px', color: theme.textSec }}>
              (Atual: {formatarMoeda(lucroReal)})
            </span>
          </span>
        </div>
      </div>

      {/* 3. GESTÃO DE FLUXO DE CAIXA REAL */}
      <div style={{ ...localStyles.dreCard, marginTop: '20px', background: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <h4 style={{ ...localStyles.dreTitle, color: theme.textMain, borderBottomColor: theme.border }}>⏱️ Previsão de Entrada no Caixa (Baseado nos Pedidos Reais)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', textAlign: 'center' }}>
          <div style={{ background: theme.inputBg, padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
            <span style={{ fontSize: '11px', color: theme.textSec, fontWeight: 'bold' }}>Pix / Dinheiro (Imediato - 0 Dias)</span>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.textMain, marginTop: '4px' }}>{formatarMoeda(fluxoCaixa.imediato)}</div>
          </div>
          <div style={{ background: theme.inputBg, padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
            <span style={{ fontSize: '11px', color: theme.textSec, fontWeight: 'bold' }}>Cartões (Prazo Médio - 14 Dias)</span>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.textMain, marginTop: '4px' }}>{formatarMoeda(fluxoCaixa.quinzenal)}</div>
          </div>
          <div style={{ background: theme.inputBg, padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
            <span style={{ fontSize: '11px', color: theme.textSec, fontWeight: 'bold' }}>Outros / Faturados (30 Dias)</span>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.textMain, marginTop: '4px' }}>{formatarMoeda(fluxoCaixa.mensal)}</div>
          </div>
        </div>
      </div>

      {/* 4. GRÁFICO DE EVOLUÇÃO */}
      <div style={{ ...localStyles.dreCard, marginTop: '20px', background: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
          <h4 style={{ ...localStyles.dreTitle, color: theme.textMain, borderBottom: 'none', margin: 0, paddingBottom: 0 }}>📈 Evolução Mensal do Lucro (Cloud Function)</h4>
          <select 
            value={anoSelecionado} 
            onChange={(e) => setAnoSelecionado(e.target.value)} 
            style={{ padding: '6px', borderRadius: '5px', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }}
          >
            {anosDisponiveis.map(ano => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>
        </div>
        <div style={{ height: '250px', width: '100%' }}>
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

      {/* 5. DRE GERENCIAL DETALHADA */}
      <div style={{ ...localStyles.dreCard, marginTop: '20px', background: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <h4 style={{ ...localStyles.dreTitle, color: theme.textMain, borderBottomColor: theme.border }}>📊 Demonstrativo de Resultados (DRE Gerencial Consolidada)</h4>
        
        <div style={localStyles.row}>
          <span style={{ ...localStyles.rowText, color: theme.textSec }}>(=) Receita Bruta de Produtos</span> 
          <span style={{ ...localStyles.rowVal, color: theme.textMain }}>{formatarMoeda(receitaBrutaProdutos)}</span>
        </div>

        <div style={{ ...localStyles.row, color: '#ef4444' }}>
          <span style={{ ...localStyles.rowText, color: '#ef4444' }}>(-) Estornos / Prejuízo com Devoluções</span>
          <span style={localStyles.rowVal}>- {formatarMoeda(prejuizoDevolucoes)}</span>
        </div>

        <div style={{ ...localStyles.row, background: theme.inputBg, fontWeight: 'bold', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${theme.border}`, marginTop: '4px', marginBottom: '4px' }}>
          <span style={{ ...localStyles.rowText, color: theme.textMain }}>(=) Faturamento Líquido Real</span>
          <span style={{ ...localStyles.rowVal, color: theme.textMain }}>{formatarMoeda(faturamentoLiquidoReal)}</span>
        </div>

        <div style={{ ...localStyles.row, color: '#ef4444' }}>
          <span style={{ ...localStyles.rowText, color: '#ef4444' }}>(-) Descontos e Cupons Concedidos</span>
          <span style={localStyles.rowVal}>- {formatarMoeda(gastoTotalCupons)}</span>
        </div>

        <div style={{ ...localStyles.row, color: '#ef4444' }}>
          <span style={{ ...localStyles.rowText, color: '#ef4444' }}>(-) Custo de Fretes, Etiquetas e Frete Reverso</span>
          <span style={localStyles.rowVal}>- {formatarMoeda(despesaFreteLojista)}</span>
        </div>

        <div style={{ ...localStyles.row, background: theme.inputBg, fontWeight: 'bold', padding: '8px', borderRadius: '6px', border: `1px solid ${theme.border}`, marginTop: '6px' }}>
          <span style={{ ...localStyles.rowText, color: theme.textMain }}>(=) Margem de Contribuição Operacional</span>
          <span style={{ ...localStyles.rowVal, color: theme.textMain }}>{formatarMoeda(margemContribuicao)}</span>
        </div>

        <div style={{ ...localStyles.row, borderTop: `2px solid ${theme.border}`, marginTop: '10px', paddingTop: '10px', fontWeight: 'bold' }}>
          <span style={{ ...localStyles.rowText, color: theme.textMain }}>(=) LUCRO LÍQUIDO FINAL (REAL)</span>
          <span style={{ ...localStyles.rowVal, color: lucroReal >= 0 ? '#10b981' : '#ef4444', fontSize: '15px' }}>{formatarMoeda(lucroReal)}</span>
        </div>
      </div>

      <div style={{ ...localStyles.auditoriaFooter, background: isModoNoturno ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff', color: isModoNoturno ? '#93c5fd' : '#1e40af', border: `1px solid ${theme.border}` }}>
        💡 <strong style={{ color: isModoNoturno ? '#bfdbfe' : '#1e3a8a' }}>Auditoria Automática do Sistema:</strong> 
        {margemPercentual >= 30 
          ? " Excelente! Sua margem de contribuição está em patamar seguro acima de 30%." 
          : " Alerta: Sua margem de contribuição está comprimida. Valide os custos de frete e o impacto de devoluções."}
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
  container: { padding: "10px 0", fontFamily: "sans-serif" },
  kpiGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "25px" },
  dreCard: { padding: "24px", borderRadius: '12px', boxSizing: 'border-box' },
  dreTitle: { margin: "0 0 15px 0", borderBottom: "1px solid", paddingBottom: "10px" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", fontSize: "13px", gap: "12px" },
  rowText: { flex: 1 },
  rowVal: { whiteSpace: 'nowrap', fontWeight: '600', flexShrink: 0 },
  cardLabel: { fontSize: "11px", fontWeight: "800", textTransform: "uppercase" },
  auditoriaFooter: { padding: "15px", borderRadius: '8px', marginTop: "20px", fontSize: "13px" }
};