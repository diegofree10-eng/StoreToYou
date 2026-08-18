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
        {isCustomContent ? children : <h3 style={{ margin: "10px 0 0 0", fontSize: "28px", color: color || theme.textMain }}>{value}</h3>}
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
  evolucaoMensal
}: TabLucroRealProps) => {

  const { theme, isModoNoturno } = useTheme();

  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear().toString());
  const [reducaoFixasPercent, setReducaoFixasPercent] = useState<number>(0);
  const [aumentoTicketPercent, setAumentoTicketPercent] = useState<number>(0);

  const totalCustosVariaveis = custoTotal + despesaFreteLojista + despesasVariaveis;
  const margemContribuicao = faturamento - totalCustosVariaveis;
  const margemPercentual = faturamento > 0 ? (margemContribuicao / faturamento) * 100 : 0;

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

      {/* 1. INDICADORES ATUAIS & PONTO DE EQUILÍBRIO COM FLIP INFO */}
      <div style={localStyles.kpiGrid} className="kpi-grid-mobile">
        <InfoCard 
          title="Margem de Contribuição" 
          value={`${margemPercentual.toFixed(1)}%`}
          color={margemPercentual > 30 ? '#10b981' : '#f59e0b'}
          explanation="Representa o percentual do faturamento que sobra após pagar todos os custos diretos e variáveis (insumos, fretes, comissões). É o dinheiro disponível para pagar as contas fixas e gerar lucro."
        />

        <InfoCard 
          title="Lucro Líquido Real" 
          value={formatarMoeda(lucroReal)}
          color={lucroReal >= 0 ? '#10b981' : '#ef4444'}
          explanation="O ganho real do negócio após subtrair todas as despesas fixas, variáveis e custos operacionais do faturamento total."
        />

        <InfoCard 
          title="🎯 Ponto de Equilíbrio (Break-Even)" 
          gridColumn="1 / -1"
          isCustomContent={true}
          explanation="É o valor exato que a empresa precisa faturar no mês para cobrir todas as despesas (fixas e variáveis), resultando em lucro zero. Vender acima disso significa gerar lucro líquido."
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: theme.textSec }}>Faturamento mínimo para cobrir fixas e variáveis:</span>
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
              Aumentar Ticket Médio: {aumentoTicketPercent}%
            </label>
            <input 
              type="range" min="0" max="50" step="5" 
              value={aumentoTicketPercent} 
              onChange={(e) => setAumentoTicketPercent(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>
        </div>
        <div style={{ background: theme.inputBg, padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

      {/* 5. DRE GERENCIAL */}
      <div style={{ ...localStyles.dreCard, marginTop: '20px', background: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <h4 style={{ ...localStyles.dreTitle, color: theme.textMain, borderBottomColor: theme.border }}>📊 Demonstrativo de Resultados (DRE)</h4>
        <div style={localStyles.row}>
          <span style={{ ...localStyles.rowText, color: theme.textSec }}>Receita Bruta Total</span> 
          <span style={{ ...localStyles.rowVal, color: theme.textMain }}>{formatarMoeda(faturamento)}</span>
        </div>
        <div style={{ ...localStyles.row, color: '#ef4444' }}>
          <span style={{ ...localStyles.rowText, color: '#ef4444' }}>(-) Custos Variáveis (Insumos + Fretes + Despesas Var.)</span>
          <span style={localStyles.rowVal}>- {formatarMoeda(totalCustosVariaveis)}</span>
        </div>
        <div style={{ ...localStyles.row, background: theme.inputBg, fontWeight: 'bold', padding: '8px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
          <span style={{ ...localStyles.rowText, color: theme.textMain }}>(=) Margem de Contribuição</span>
          <span style={{ ...localStyles.rowVal, color: theme.textMain }}>{formatarMoeda(margemContribuicao)}</span>
        </div>
        <div style={{ ...localStyles.row, color: '#ef4444', marginTop: '10px' }}>
          <span style={{ ...localStyles.rowText, color: '#ef4444' }}>(-) Despesas Fixas (Aba Despesas)</span>
          <span style={localStyles.rowVal}>- {formatarMoeda(despesasFixas)}</span>
        </div>
        <div style={{ ...localStyles.row, borderTop: `2px solid ${theme.border}`, marginTop: '10px', paddingTop: '10px', fontWeight: 'bold' }}>
          <span style={{ ...localStyles.rowText, color: theme.textMain }}>(=) LUCRO LÍQUIDO FINAL</span>
          <span style={{ ...localStyles.rowVal, color: theme.textMain }}>{formatarMoeda(lucroReal)}</span>
        </div>
      </div>

      <div style={{ ...localStyles.auditoriaFooter, background: isModoNoturno ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff', color: isModoNoturno ? '#93c5fd' : '#1e40af', border: `1px solid ${theme.border}` }}>
        💡 <strong style={{ color: isModoNoturno ? '#bfdbfe' : '#1e3a8a' }}>Dica de Gestão:</strong> Sua Margem de Contribuição ideal deve estar acima de 30%.
        {margemPercentual < 30 && " Sua margem está baixa. Revise seu preço de venda ou o custo dos insumos."}
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
  dreCard: { padding: "24px", borderRadius: "12px", boxSizing: 'border-box' },
  dreTitle: { margin: "0 0 15px 0", borderBottom: "1px solid", paddingBottom: "10px" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", fontSize: "13px", gap: "12px" },
  rowText: { flex: 1 },
  rowVal: { whiteSpace: 'nowrap', fontWeight: '600', flexShrink: 0 },
  cardLabel: { fontSize: "11px", fontWeight: "800", textTransform: "uppercase" },
  auditoriaFooter: { padding: "15px", borderRadius: "8px", marginTop: "20px", fontSize: "13px" }
};