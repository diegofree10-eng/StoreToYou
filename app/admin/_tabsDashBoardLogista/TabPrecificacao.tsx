// app/admin/_tabsDashBoardLogista/TabPrecificacao.tsx
"use client";

import React, { useState, useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";

interface TabPrecificacaoProps {
  formatarMoeda: (valor: number) => string;
}

export function TabPrecificacao({ formatarMoeda }: TabPrecificacaoProps) {
  const { theme } = useTheme();

  // 1. Custos Diretos ajustados com o seu exemplo real (R$ 1,74 de adesivos + R$ 0,32 de embalagem)
  const [calcCustoInsumo, setCalcCustoInsumo] = useState("1.74");
  const [calcCustoEmbalagem, setCalcCustoEmbalagem] = useState("0.32"); 

  // 2. Metas e Impostos
  const [calcMargemDesejada, setCalcMargemDesejada] = useState("35");
  const [calcImpostos, setCalcImpostos] = useState("6");

  // 3. Taxas e Custos de Marketplace (Calibrados com base nas taxas reais da Shopee)
  const [calcComissaoMkt, setCalcComissaoMkt] = useState("18");     // Comissão padrão / comissão líquida
  const [calcTaxaFixaMkt, setCalcTaxaFixaMkt] = useState("4.00");   // Taxa fixa por item vendido (R$ 4,00)
  const [calcTaxaServico, setCalcTaxaServico] = useState("5.50");   // Taxa de serviço / transação / cupons (%)
  const [calcAfiliados, setCalcAfiliados] = useState("1.00");       // Comissão de afiliados (%)
  const [calcReservaDevolucao, setCalcReservaDevolucao] = useState("2.00"); // % de segurança p/ devoluções

  const simuladorPrecoSugerido = useMemo(() => {
    const custoInsumo = Number(calcCustoInsumo) || 0;
    const custoEmbalagem = Number(calcCustoEmbalagem) || 0;
    const custoTotalBase = custoInsumo + custoEmbalagem;
    const taxaFixa = Number(calcTaxaFixaMkt) || 0;

    const margem = Number(calcMargemDesejada) || 0;
    const imposto = Number(calcImpostos) || 0;
    const comissao = Number(calcComissaoMkt) || 0;
    const servico = Number(calcTaxaServico) || 0;
    const afiliados = Number(calcAfiliados) || 0;
    const devolucao = Number(calcReservaDevolucao) || 0;

    // Soma percentual de todas as deduções sobre o preço de venda
    const percentualDeducoes = (margem + imposto + comissao + servico + afiliados + devolucao) / 100;
    if (percentualDeducoes >= 1) return 0;

    // Fórmula de Formação de Preço Markup Divisor com Taxa Fixa embutida
    return (custoTotalBase + taxaFixa) / (1 - percentualDeducoes);
  }, [
    calcCustoInsumo, calcCustoEmbalagem, calcMargemDesejada, 
    calcImpostos, calcComissaoMkt, calcTaxaFixaMkt, 
    calcTaxaServico, calcAfiliados, calcReservaDevolucao
  ]);

  const custoBaseTotal = (Number(calcCustoInsumo) || 0) + (Number(calcCustoEmbalagem) || 0);
  const valorTaxaFixa = Number(calcTaxaFixaMkt) || 0;

  // Detalhamento dos valores em reais retidos no preço final sugerido
  const valorMargem = simuladorPrecoSugerido * ((Number(calcMargemDesejada) || 0) / 100);
  const valorImpostos = simuladorPrecoSugerido * ((Number(calcImpostos) || 0) / 100);
  const valorComissao = simuladorPrecoSugerido * ((Number(calcComissaoMkt) || 0) / 100);
  const valorServico = simuladorPrecoSugerido * ((Number(calcTaxaServico) || 0) / 100);
  const valorAfiliados = simuladorPrecoSugerido * ((Number(calcAfiliados) || 0) / 100);
  const valorDevolucao = simuladorPrecoSugerido * ((Number(calcReservaDevolucao) || 0) / 100);

  return (
    <div style={{ padding: '10px 0', color: theme.textMain }}>
      <h2 style={{ color: theme.textMain, fontSize: '18px', marginBottom: '16px' }}>🛡️ Simulador de Precificação Blindada (Anti-Prejuízo)</h2>

      <div style={styles.precificacaoBox}>
        
        {/* COLUNA 1: INPUTS DE CUSTOS E TAXAS */}
        <div style={{ ...styles.precificacaoInputsForm, backgroundColor: theme.bgCard, borderColor: theme.border }}>
          <h4 style={{ margin: "0 0 14px 0", color: theme.textMain, fontSize: '14px' }}>📦 1. Custos Internos de Produção</h4>
          
          <div style={styles.formRowSimulador}>
            <label style={{ ...styles.labelSimulador, color: theme.textSec }}>Custo de Matéria-Prima / Insumos (R$):</label>
            <input type="number" step="0.01" value={calcCustoInsumo} onChange={e => setCalcCustoInsumo(e.target.value)} style={{ ...styles.inputSimulador, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }} />
            <span style={{ fontSize: '10px', color: theme.textSec }}>Ex: 6 folhas a R$ 0,29 = R$ 1,74</span>
          </div>

          <div style={styles.formRowSimulador}>
            <label style={{ ...styles.labelSimulador, color: theme.textSec }}>Custo de Embalagem (R$):</label>
            <input type="number" step="0.01" value={calcCustoEmbalagem} onChange={e => setCalcCustoEmbalagem(e.target.value)} style={{ ...styles.inputSimulador, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }} />
            <span style={{ fontSize: '10px', color: theme.textSec }}>Ex: Envelope + Etiqueta = R$ 0,32</span>
          </div>

          <h4 style={{ margin: "16px 0 14px 0", color: theme.textMain, fontSize: '14px' }}>🎯 2. Margens e Impostos</h4>

          <div style={styles.formRowSimulador}>
            <label style={{ ...styles.labelSimulador, color: theme.textSec }}>Margem de Lucro Líquido Desejada (%):</label>
            <input type="number" value={calcMargemDesejada} onChange={e => setCalcMargemDesejada(e.target.value)} style={{ ...styles.inputSimulador, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }} />
          </div>

          <div style={styles.formRowSimulador}>
            <label style={{ ...styles.labelSimulador, color: theme.textSec }}>Impostos Federais / Estaduais (%):</label>
            <input type="number" value={calcImpostos} onChange={e => setCalcImpostos(e.target.value)} style={{ ...styles.inputSimulador, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }} />
          </div>
        </div>

        {/* COLUNA 2: TAXAS OCULTAS DE MARKETPLACE */}
        <div style={{ ...styles.precificacaoInputsForm, backgroundColor: theme.bgCard, borderColor: theme.border }}>
          <h4 style={{ margin: "0 0 14px 0", color: theme.textMain, fontSize: '14px' }}>🛒 3. Taxas e Retenções de Marketplace</h4>
          
          <div style={styles.formRowSimulador}>
            <label style={{ ...styles.labelSimulador, color: theme.textSec }}>Comissão Percentual do Canal (%):</label>
            <input type="number" value={calcComissaoMkt} onChange={e => setCalcComissaoMkt(e.target.value)} style={{ ...styles.inputSimulador, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }} />
          </div>

          <div style={styles.formRowSimulador}>
            <label style={{ ...styles.labelSimulador, color: theme.textSec }}>Taxa Fixa por Pedido (R$) <span style={{ fontSize: '10px', color: '#e67e22' }}>[Itens de baixo ticket]</span>:</label>
            <input type="number" value={calcTaxaFixaMkt} onChange={e => setCalcTaxaFixaMkt(e.target.value)} style={{ ...styles.inputSimulador, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }} />
          </div>

          <div style={styles.formRowSimulador}>
            <label style={{ ...styles.labelSimulador, color: theme.textSec }}>Taxa de Serviço / Transação (%):</label>
            <input type="number" value={calcTaxaServico} onChange={e => setCalcTaxaServico(e.target.value)} style={{ ...styles.inputSimulador, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }} />
          </div>

          <div style={styles.formRowSimulador}>
            <label style={{ ...styles.labelSimulador, color: theme.textSec }}>Comissão de Afiliados (%) <span style={{ fontSize: '10px', color: '#e67e22' }}>[Opcional]</span>:</label>
            <input type="number" value={calcAfiliados} onChange={e => setCalcAfiliados(e.target.value)} style={{ ...styles.inputSimulador, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }} />
          </div>

          <div style={styles.formRowSimulador}>
            <label style={{ ...styles.labelSimulador, color: theme.textSec }}>Reserva de Segurança p/ Devoluções e Reversos (%):</label>
            <input type="number" value={calcReservaDevolucao} onChange={e => setCalcReservaDevolucao(e.target.value)} style={{ ...styles.inputSimulador, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }} />
          </div>
        </div>

        {/* COLUNA 3: CARD DE RESULTADO E RADIOGRAFIA */}
        <div style={{ ...styles.precificacaoResultCard, backgroundColor: theme.bgCard, borderColor: theme.border }}>
          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4f46e5", textTransform: "uppercase" }}>
            💰 PREÇO DE VENDA RECOMENDADO
          </span>
          <h2 style={{ ...styles.precoSugeridoGrande, color: theme.textMain }}>
            {simuladorPrecoSugerido > 0 ? formatarMoeda(simuladorPrecoSugerido) : "⚠️ Ajuste as margens"}
          </h2>
          
          <div style={{ borderTop: `1px dashed ${theme.border}`, marginTop: "12px", paddingTop: "12px", fontSize: "12px", color: theme.textSec, display: 'flex', flexDirection: 'column', gap: '5px' }}>
            
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Custo de Produção + Embalagem:</span>
              <strong style={{ color: theme.textMain }}>{formatarMoeda(custoBaseTotal)}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Lucro Líquido Real ({calcMargemDesejada}%):</span>
              <strong style={{ color: "#16a34a" }}>{formatarMoeda(valorMargem)}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Reserva p/ Impostos ({calcImpostos}%):</span>
              <span style={{ color: "#dc2626" }}>{formatarMoeda(valorImpostos)}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Comissão & Taxa Fixa Mkt:</span>
              <span style={{ color: "#e67e22" }}>{formatarMoeda(valorComissao + valorTaxaFixa)}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Serviços & Afiliados:</span>
              <span style={{ color: "#e67e22" }}>{formatarMoeda(valorServico + valorAfiliados)}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Fundo de Risco p/ Devoluções:</span>
              <span style={{ color: "#dc2626" }}>{formatarMoeda(valorDevolucao)}</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  precificacaoBox: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
    gap: '20px', 
    padding: '4px 0' 
  },
  precificacaoInputsForm: { 
    padding: '16px', 
    borderRadius: '12px', 
    border: '1px solid' 
  },
  formRowSimulador: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '4px', 
    marginBottom: '10px' 
  },
  labelSimulador: { 
    fontSize: '11px', 
    fontWeight: '600' 
  },
  inputSimulador: { 
    padding: '8px 10px', 
    borderRadius: '8px', 
    border: '1px solid', 
    fontSize: '13px', 
    fontWeight: '600', 
    outline: 'none', 
    width: '100%', 
    boxSizing: 'border-box' 
  },
  precificacaoResultCard: { 
    padding: '20px', 
    borderRadius: '14px', 
    border: '2px solid', 
    display: 'flex', 
    flexDirection: 'column', 
    justifyContent: 'center' 
  },
  precoSugeridoGrande: { 
    fontSize: '30px', 
    margin: '6px 0', 
    fontWeight: '900', 
    letterSpacing: '-1px' 
  },
};