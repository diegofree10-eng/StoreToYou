"use client";

import React, { useState, useMemo } from "react";

interface TabPrecificacaoProps {
  formatarMoeda: (valor: number) => string;
}

export function TabPrecificacao({ formatarMoeda }: TabPrecificacaoProps) {
  const [calcCustoInsumo, setCalcCustoInsumo] = useState("10.00");
  const [calcMargemDesejada, setCalcMargemDesejada] = useState("40");
  const [calcImpostos, setCalcImpostos] = useState("6");
  const [calcTaxaMarketplace, setCalcTaxaMarketplace] = useState("0");

  const simuladorPrecoSugerido = useMemo(() => {
    const custo = Number(calcCustoInsumo) || 0;
    const margem = Number(calcMargemDesejada) || 0;
    const imposto = Number(calcImpostos) || 0;
    const taxaMkt = Number(calcTaxaMarketplace) || 0;

    const percentualDeducoes = (margem + imposto + taxaMkt) / 100;
    if (percentualDeducoes >= 1) return 0;

    return custo / (1 - percentualDeducoes);
  }, [calcCustoInsumo, calcMargemDesejada, calcImpostos, calcTaxaMarketplace]);

  return (
    <div style={styles.precificacaoBox}>
      <div style={styles.precificacaoInputsForm}>
        <h4 style={{ margin: "0 0 15px 0", color: "#1e293b" }}>🔧 Componentes do Custo</h4>
        
        <div style={styles.formRowSimulador}>
          <label style={styles.labelSimulador}>Custo de Produção / Insumos (R$):</label>
          <input 
            type="number" 
            value={calcCustoInsumo} 
            onChange={e => setCalcCustoInsumo(e.target.value)} 
            style={styles.inputSimulador} 
          />
        </div>

        <div style={styles.formRowSimulador}>
          <label style={styles.labelSimulador}>Margem de Lucro Desejada (%):</label>
          <input 
            type="number" 
            value={calcMargemDesejada} 
            onChange={e => setCalcMargemDesejada(e.target.value)} 
            style={styles.inputSimulador} 
          />
        </div>

        <div style={styles.formRowSimulador}>
          <label style={styles.labelSimulador}>Impostos Federais/Estaduais (%):</label>
          <input 
            type="number" 
            value={calcImpostos} 
            onChange={e => setCalcImpostos(e.target.value)} 
            style={styles.inputSimulador} 
          />
        </div>

        <div style={styles.formRowSimulador}>
          <label style={styles.labelSimulador}>Comissão do Marketplace (%):</label>
          <input 
            type="number" 
            value={calcTaxaMarketplace} 
            onChange={e => setCalcTaxaMarketplace(e.target.value)} 
            style={styles.inputSimulador} 
          />
        </div>
      </div>

      <div style={styles.precificacaoResultCard}>
        <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4f46e5", textTransform: "uppercase" }}>
          💰 PREÇO DE VENDA RECOMENDADO
        </span>
        <h2 style={styles.precoSugeridoGrande}>
          {simuladorPrecoSugerido > 0 ? formatarMoeda(simuladorPrecoSugerido) : "Ajuste as margens"}
        </h2>
        <div style={{ borderTop: "1px dashed #cbd5e1", marginTop: "15px", paddingTop: "15px", fontSize: "13px", color: "#475569" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span>Sobra Líquida ({calcMargemDesejada}%):</span>
            <strong style={{ color: "#16a34a" }}>
              {formatarMoeda(simuladorPrecoSugerido * (Number(calcMargemDesejada) / 100))}
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span>Reserva para Impostos ({calcImpostos}%):</span>
            <span style={{ color: "#dc2626" }}>
              {formatarMoeda(simuladorPrecoSugerido * (Number(calcImpostos) / 100))}
            </span>
          </div>
          {Number(calcTaxaMarketplace) > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Taxa da Plataforma ({calcTaxaMarketplace}%):</span>
              <span style={{ color: "#e67e22" }}>
                {formatarMoeda(simuladorPrecoSugerido * (Number(calcTaxaMarketplace) / 100))}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  precificacaoBox: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
    gap: '24px', 
    padding: '4px 0' 
  },
  precificacaoInputsForm: { 
    backgroundColor: '#f8fafc', 
    padding: '20px', 
    borderRadius: '12px', 
    border: '1px solid #e2e8f0' 
  },
  formRowSimulador: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '6px', 
    marginBottom: '14px' 
  },
  labelSimulador: { 
    fontSize: '13px', 
    fontWeight: '600', 
    color: '#475569' 
  },
  inputSimulador: { 
    padding: '10px', 
    borderRadius: '8px', 
    border: '1px solid #cbd5e1', 
    fontSize: '14px', 
    fontWeight: '600', 
    color: '#1e293b', 
    outline: 'none', 
    backgroundColor: '#fff',
    boxSizing: 'border-box',
    width: '100%'
  },
  precificacaoResultCard: { 
    backgroundColor: '#fff', 
    padding: '24px', 
    borderRadius: '14px', 
    border: '2px solid #1e293b', 
    display: 'flex', 
    flexDirection: 'column', 
    justifyContent: 'center' 
  },
  precoSugeridoGrande: { 
    fontSize: '38px', 
    margin: '8px 0', 
    fontWeight: '900', 
    color: '#1e293b', 
    letterSpacing: '-1px',
    wordBreak: 'break-word'
  },
};