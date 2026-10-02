// app/admin/_tabsDashBoardLogista/TabSazonalidade.tsx
"use client";

import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { useTheme } from "@/context/ThemeContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface TabSazonalidadeProps {
  uid: string;
  formatarMoeda: (v: number) => string;
}

export const TabSazonalidade = ({ uid, formatarMoeda }: TabSazonalidadeProps) => {
  const { theme, isModoNoturno } = useTheme();

  const anoAtualStr = new Date().getFullYear().toString();
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtualStr);
  const [dadosGrafico, setDadosGrafico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarExplicacao, setMostrarExplicacao] = useState(false);

  const nomesMesesExibicao = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const nomesMesesFirestore = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];

  const anosDisponiveis = [anoAtualStr, (Number(anoAtualStr) - 1).toString()];

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const carregarSazonalidadeAnual = async () => {
      setLoading(true);
      try {
        const promessas = nomesMesesFirestore.map(async (nomeMes, index) => {
          const chaveDoc = `${nomeMes}_${anoSelecionado}`;
          try {
            const snap = await getDoc(doc(db, "lojistas", uid, "dashboard_stats", chaveDoc));
            if (snap.exists()) {
              const dados = snap.data();
              return {
                mes: nomesMesesExibicao[index],
                receita: Number(dados.receitaLiquida ?? dados.faturamentoLiquido ?? 0),
                lucro: Number(dados.lucroLiquidoReal ?? 0)
              };
            }
            return { mes: nomesMesesExibicao[index], receita: 0, lucro: 0 };
          } catch (e) {
            return { mes: nomesMesesExibicao[index], receita: 0, lucro: 0 };
          }
        });

        const resultados = await Promise.all(promessas);
        setDadosGrafico(resultados);
      } catch (err) {
        console.error("Erro ao carregar dados de sazonalidade:", err);
      } finally {
        setLoading(false);
      }
    };

    carregarSazonalidadeAnual();
  }, [uid, anoSelecionado]);

  if (loading) {
    return (
      <div style={{ background: theme.bgCard, padding: '40px', borderRadius: '12px', border: `1px solid ${theme.border}`, textAlign: 'center', color: theme.textSec }}>
        ⏳ Carregando comparativo de sazonalidade...
      </div>
    );
  }

  return (
    <div style={{ background: theme.bgCard, padding: '24px', borderRadius: '12px', border: `1px solid ${theme.border}`, color: theme.textMain, boxSizing: 'border-box' }}>
      
      {/* CABEÇALHO E CONTROLES */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: theme.textMain }}>
            📊 Comparativo Mensal: Receita Líquida vs. Lucro Real ({anoSelecionado})
          </h4>
          <button 
            onClick={() => setMostrarExplicacao(!mostrarExplicacao)}
            style={{ 
              background: isModoNoturno ? theme.border : '#f1f5f9', 
              border: 'none', borderRadius: '50%', width: '22px', height: '22px', 
              fontSize: '11px', fontWeight: 'bold', color: theme.textSec, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="O que significa este gráfico?"
          >?</button>
        </div>

        <select 
          value={anoSelecionado} 
          onChange={(e) => setAnoSelecionado(e.target.value)} 
          style={{ padding: '6px 8px', borderRadius: '6px', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}`, outline: 'none' }}
        >
          {anosDisponiveis.map(ano => (
            <option key={ano} value={ano}>{ano}</option>
          ))}
        </select>
      </div>

      {/* CARD EXPLICATIVO */}
      {mostrarExplicacao && (
        <div style={{ background: isModoNoturno ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff', padding: '14px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '12px', color: isModoNoturno ? '#93c5fd' : '#1e40af', border: `1px solid ${theme.border}`, lineHeight: '1.5' }}>
          <strong>💡 Como ler este comparativo:</strong><br/>
          • <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>Barra Azul (Receita Líquida):</span> Total de vendas líquidas realizadas no mês.<br/>
          • <span style={{ color: '#10b981', fontWeight: 'bold' }}>Barra Verde (Lucro Positivo):</span> Fica acima da linha de zero, indicando lucro real obtido.<br/>
          • <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Barra Vermelha (Prejuízo):</span> Fica abaixo da linha de zero, indicando que o mês fechou no vermelho.
        </div>
      )}

      {/* LEGENDA DE CORES */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', fontSize: '12px', color: theme.textSec, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#3b82f6', borderRadius: '3px' }}></div>
          <span>Receita Líquida</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '3px' }}></div>
          <span>Lucro Líquido (Positivo)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '3px' }}></div>
          <span>Prejuízo / Negativo (Abaixo do Eixo)</span>
        </div>
      </div>

      {/* GRÁFICO PROFISSIONAL COM RECHARTS */}
      <div style={{ width: '100%', height: '320px', minHeight: '320px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dadosGrafico} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
            <XAxis dataKey="mes" fontSize={12} stroke={theme.textSec} />
            <YAxis fontSize={12} stroke={theme.textSec} tickFormatter={(v) => `R$ ${v}`} />
            <Tooltip 
              formatter={(value: any) => formatarMoeda(Number(value) || 0)} 
              contentStyle={{ backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.textMain, borderRadius: '8px' }}
            />
            <ReferenceLine y={0} stroke={theme.border} strokeWidth={2} />
            
            {/* Barra de Receita Líquida */}
            <Bar dataKey="receita" name="Receita Líquida" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            
            {/* Barra de Lucro Real (Com cores dinâmicas para positivo/negativo) */}
            <Bar dataKey="lucro" name="Lucro Real" radius={[4, 4, 4, 4]}>
              {dadosGrafico.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.lucro >= 0 ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};