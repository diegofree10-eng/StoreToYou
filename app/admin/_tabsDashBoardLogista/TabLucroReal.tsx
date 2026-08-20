// app/admin/_tabsDashBoardLogista/TabLucroReal.tsx
"use client";

import React, { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from "@/context/ThemeContext";

export interface TabLucroRealProps {
  faturamento: number;
  custoTotal: number;
  lucroReal: number;
  despesaFreteLojista: number;
  despesasFixas: number;
  despesasVariaveis: number;
  formatarMoeda: (valor: number) => string;
  evolucaoMensal: Record<string, any>;
  totalPedidos?: number; // Adicionado para calcular métricas de pedidos
}

// Componente auxiliar de Card com Efeito Flip para Explicação/Dica
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
      {/* Lado da Frente */}
      <div style={{ display: flipped ? 'none' : 'block', width: '100%' }}>
        <button 
          onClick={() => setFlipped(true)}
          style={{ 
            position: 'absolute', 
            top: '10px', 
            right: '10px', 
            background: isModoNoturno ? theme.border : '#f1f5f9', 
            border: 'none', 
            borderRadius: '50%', 
            width: '22px', 
            height: '22px', 
            fontSize: '11px', 
            fontWeight: 'bold',
            color: theme.textSec,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Clique para ver o que significa"
        >?</button>
        <span style={{ ...localStyles.cardLabel, color: theme.textSec }}>{title}</span>
        {isCustomContent ? children : <h3 style={{ margin: "10px 0 0 0", fontSize: "26px", color: color || theme.textMain }}>{value}</h3>}
      </div>

      {/* Lado de Trás (Explicação / Flip) */}
      <div style={{ display: flipped ? 'block' : 'none', width: '100%', position: 'relative' }}>
        <button 
          onClick={() => setFlipped(false)}
          style={{ 
            position: 'absolute', 
            top: '-10px', 
            right: '-5px', 
            background: isModoNoturno ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', 
            border: 'none', 
            borderRadius: '50%', 
            width: '22px', 
            height: '22px', 
            fontSize: '11px', 
            fontWeight: 'bold',
            color: '#ef4444',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
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
  faturamento,
  custoTotal,
  lucroReal,
  despesaFreteLojista,
  despesasFixas,
  despesasVariaveis,
  formatarMoeda,
  evolucaoMensal,
  totalPedidos = 0
}: TabLucroRealProps) => {

  const { theme, isModoNoturno } = useTheme();

  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear().toString());
  const [reducaoFixasPercent, setReducaoFixasPercent] = useState<number>(0);
  const [aumentoTicketPercent, setAumentoTicketPercent] = useState<number>(0);

  // Cálculos Avançados de Eficiência
  const totalCustosVariaveis = custoTotal + despesaFreteLojista + despesasVariaveis;
  const margemContribuicao = faturamento - totalCustosVariaveis;
  const margemPercentual = faturamento > 0 ? (margemContribuicao / faturamento) * 100 : 0;
  const rentabilidadeLiquida = faturamento > 0 ? (lucroReal / faturamento) * 100 : 0;

  const ticketMedioReal = totalPedidos > 0 ? faturamento / totalPedidos : 0;
  const impactoFretePercentual = faturamento > 0 ? (despesaFreteLojista / faturamento) * 100 : 0;

  const pontoEquilequilibrio = margemPercentual > 0 
    ? despesasFixas / (margemPercentual / 100) 
    : 0;

  const despesasFixasSimuladas = despesasFixas * (1 - reducaoFixasPercent / 100);
  const faturamentoSimulado = faturamento * (1 + aumentoTicketPercent / 100);
  const margemContribuicaoSimulada = faturamentoSimulado * (margemPercentual / 100);
  const lucroRealSimulado = margemContribuicaoSimulada - despesasFixasSimuladas;

  const fluxoCaixa = useMemo(() => {
    return {
      imediato: faturamento * 0.30,
      quinzenal: faturamento * 0.40,
      mensal: faturamento * 0.30
    };
  }, [faturamento]);

  const anosDisponiveis = evolucaoMensal && Object.keys(evolucaoMensal).length > 0 
    ? Object.keys(evolucaoMensal) 
    : [new Date().getFullYear().toString()];

  return (
    <div style={{ ...localStyles.container, color: theme.textMain, backgroundColor: 'transparent' }} className="tab-lucro-real-container">

      {/* 1. INDICADORES CHAVE DE PERFORMANCE (KPIs) */}
      <div style={localStyles.kpiGrid} className="kpi-grid-mobile">
        <InfoCard 
          title="Lucro Líquido Real" 
          value={formatarMoeda(lucroReal)}
          color={lucroReal >= 0 ? '#10b981' : '#ef4444'}
          explanation="O ganho real do negócio após subtrair todas as despesas fixas, variáveis, insumos e fretes arcados pelo lojista."
        />

        <InfoCard 
          title="Margem de Contribuição" 
          value={`${margemPercentual.toFixed(1)}%`}
          color={margemPercentual > 30 ? '#10b981' : '#f59e0b'}
          explanation="Percentual do faturamento que sobra após pagar os custos diretos. Mostra se a precificação dos produtos cobre a operação."
        />

        <InfoCard 
          title="Rentabilidade Líquida" 
          value={`${rentabilidadeLiquida.toFixed(1)}%`}
          color={rentabilidadeLiquida > 15 ? '#10b981' : '#3b82f6'}
          explanation="Quanto cada R$ 1,00 vendido se traduz efetivamente em lucro no bolso do lojista após todas as deduções."
        />

        <InfoCard 
          title="Impacto do Frete (Subsídio)" 
          value={`${impactoFretePercentual.toFixed(1)}%`}
          color={impactoFretePercentual > 10 ? '#ef4444' : '#10b981'}
          explanation="Percentual do faturamento comprometido com o frete pago pelo lojista (etiquetas/envios subsidiados)."
        />

        <InfoCard 
          title="🎯 Ponto de Equilíbrio (Break-Even)" 
          gridColumn="1 / -1"
          isCustomContent={true}
          explanation="Faturamento mínimo mensal necessário para zerar o prejuízo. Vender acima disso gera lucro líquido real."
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: theme.textSec }}>Faturamento para cobrir custos fixos e variáveis:</span>
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
              Reduzir Despesas Fixas: {reducaoFixasPercent}%
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

      {/* 3. GESTÃO DE FLUXO DE CAIXA (PREVISÃO DE RECEBIMENTO) */}
      <div style={{ ...localStyles.dreCard, marginTop: '20px', background: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <h4 style={{ ...localStyles.dreTitle, color: theme.textMain, borderBottomColor: theme.border }}>⏱️ Previsão de Entrada no Caixa (Prazos)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', textAlign: 'center' }}>
          <div style={{ background: theme.inputBg, padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
            <span style={{ fontSize: '11px', color: theme.textSec, fontWeight: 'bold' }}>PIX / À Vista (0 Dias)</span>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.textMain, marginTop: '4px' }}>{formatarMoeda(fluxoCaixa.imediato)}</div>
          </div>
          <div style={{ background: theme.inputBg, padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
            <span style={{ fontSize: '11px', color: theme.textSec, fontWeight: 'bold' }}>Cartão / Venda Direta (14 Dias)</span>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.textMain, marginTop: '4px' }}>{formatarMoeda(fluxoCaixa.quinzenal)}</div>
          </div>
          <div style={{ background: theme.inputBg, padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
            <span style={{ fontSize: '11px', color: theme.textSec, fontWeight: 'bold' }}>Marketplaces (30 Dias)</span>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.textMain, marginTop: '4px' }}>{formatarMoeda(fluxoCaixa.mensal)}</div>
          </div>
        </div>
      </div>

      {/* 4. GRÁFICO DE EVOLUÇÃO */}
      <div style={{ ...localStyles.dreCard, marginTop: '20px', background: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
          <h4 style={{ ...localStyles.dreTitle, color: theme.textMain, borderBottom: 'none', margin: 0, paddingBottom: 0 }}>📈 Evolução Mensal do Lucro</h4>
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
            <LineChart data={(evolucaoMensal && evolucaoMensal[anoSelecionado]) || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
              <XAxis dataKey="mes" fontSize={12} stroke={theme.textSec} />
              <YAxis fontSize={12} stroke={theme.textSec} />
              <Tooltip 
                formatter={(value: any) => formatarMoeda(Number(value) || 0)} 
                contentStyle={{ backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.textMain }}
              />
              <Line type="monotone" dataKey="lucro" stroke={theme.primary} strokeWidth={3} dot={{ r: 4 }} name="Lucro" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. DRE GERENCIAL DETALHADA */}
      <div style={{ ...localStyles.dreCard, marginTop: '20px', background: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <h4 style={{ ...localStyles.dreTitle, color: theme.textMain, borderBottomColor: theme.border }}>📊 Demonstrativo de Resultados (DRE Gerencial)</h4>
        <div style={localStyles.row}>
          <span style={{ ...localStyles.rowText, color: theme.textSec }}>(=) Receita Bruta Total (Faturamento)</span> 
          <span style={{ ...localStyles.rowVal, color: theme.textMain }}>{formatarMoeda(faturamento)}</span>
        </div>
        <div style={{ ...localStyles.row, color: '#ef4444' }}>
          <span style={{ ...localStyles.rowText, color: '#ef4444' }}>(-) Custos de Insumos / Produtos Vendidos</span>
          <span style={localStyles.rowVal}>- {formatarMoeda(custoTotal)}</span>
        </div>
        <div style={{ ...localStyles.row, color: '#ef4444' }}>
          <span style={{ ...localStyles.rowText, color: '#ef4444' }}>(-) Fretes Pagos pelo Lojista (Subsídios / Etiquetas)</span>
          <span style={localStyles.rowVal}>- {formatarMoeda(despesaFreteLojista)}</span>
        </div>
        <div style={{ ...localStyles.row, color: '#ef4444' }}>
          <span style={{ ...localStyles.rowText, color: '#ef4444' }}>(-) Despesas Variáveis (Taxas de Cartão / Gateway)</span>
          <span style={localStyles.rowVal}>- {formatarMoeda(despesasVariaveis)}</span>
        </div>
        <div style={{ ...localStyles.row, background: theme.inputBg, fontWeight: 'bold', padding: '8px', borderRadius: '6px', border: `1px solid ${theme.border}`, marginTop: '4px' }}>
          <span style={{ ...localStyles.rowText, color: theme.textMain }}>(=) Margem de Contribuição Total</span>
          <span style={{ ...localStyles.rowVal, color: theme.textMain }}>{formatarMoeda(margemContribuicao)}</span>
        </div>
        <div style={{ ...localStyles.row, color: '#ef4444', marginTop: '10px' }}>
          <span style={{ ...localStyles.rowText, color: '#ef4444' }}>(-) Despesas Fixas Operacionais (Aluguel, Salários, etc.)</span>
          <span style={localStyles.rowVal}>- {formatarMoeda(despesasFixas)}</span>
        </div>
        <div style={{ ...localStyles.row, borderTop: `2px solid ${theme.border}`, marginTop: '10px', paddingTop: '10px', fontWeight: 'bold' }}>
          <span style={{ ...localStyles.rowText, color: theme.textMain }}>(=) LUCRO LÍQUIDO FINAL (REAL)</span>
          <span style={{ ...localStyles.rowVal, color: lucroReal >= 0 ? '#10b981' : '#ef4444', fontSize: '15px' }}>{formatarMoeda(lucroReal)}</span>
        </div>
      </div>

      <div style={{ ...localStyles.auditoriaFooter, background: isModoNoturno ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff', color: isModoNoturno ? '#93c5fd' : '#1e40af', border: `1px solid ${theme.border}` }}>
        💡 <strong style={{ color: isModoNoturno ? '#bfdbfe' : '#1e3a8a' }}>Análise de Saúde Financeira:</strong> 
        {margemPercentual >= 30 
          ? " Excelente! Sua margem de contribuição está saudável acima de 30%." 
          : " Atenção: Sua margem está abaixo de 30%. Considere reajustar preços ou negociar custos de fornecedores."}
        {impactoFretePercentual > 10 && " O peso dos fretes pagos pelo lojista está consumindo uma fatia alta da receita."}
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