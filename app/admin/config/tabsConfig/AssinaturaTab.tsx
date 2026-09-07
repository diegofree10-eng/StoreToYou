// app/admin/configuracoes/_tabs/AssinaturaTab.tsx
"use client";

import React, { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { FiShare2, FiCopy, FiCheck, FiUsers, FiAward } from "react-icons/fi";

export default function AssinaturaTab({
  config,
  planosConfig,
  setShowUpgradeModal
}: any) {
  const { theme, isModoNoturno } = useTheme();
  const [copiado, setCopiado] = useState(false);

  const planoAtualNome = config.dadosLoja?.dsPlanoLoja || 'Bronze';
  const planoInfo = planosConfig?.[planoAtualNome] || {};

  const tsVencimento = config.dadosLoja?.tsVencimentoLoja;
  const dataVencimentoStr = tsVencimento?.seconds
    ? new Date(tsVencimento.seconds * 1000).toLocaleDateString('pt-BR')
    : '---';

  const historico = config.historicoPagamentos || [];

  // 🚀 ID e Nome da Loja obtidos diretamente do objeto carregado (Custo de leitura zero no Firebase!)
  const lojistaId = config.uid || config.dadosLoja?.lojaId || "";
  const nomeLojaAtual = encodeURIComponent(config.dadosLoja?.dsNomeLoja || "Loja Parceira");

  const linkIndicacao = typeof window !== "undefined" 
    ? `${window.location.origin}/login?ref=${lojistaId}&nome=${nomeLojaAtual}` 
    : `https://seudominio.com/login?ref=${lojistaId}&nome=${nomeLojaAtual}`;
  const copiarLink = () => {
    navigator.clipboard.writeText(linkIndicacao);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  // Dados de indicação vindos do objeto de configuração ou padrão 0
  const totalIndicacoes = config.dadosLoja?.totalIndicacoes || 0;
  const mesesGratisDisponiveis = config.dadosLoja?.mesesGratisDisponiveis || 0;
  const progressoMeta = totalIndicacoes % 5; // Quantos faltam para o próximo bloco de 5

  return (
    <section style={{ padding: '20px', background: theme.bgCard, borderRadius: '12px', border: `1px solid ${theme.border}`, transition: 'background 0.3s' }}>
      <h3 style={{ ...styles.h3, margin: '0 0 15px 0', color: theme.textMain }}>Gerenciamento de Assinatura</h3>

      {/* Cabeçalho do Plano */}
      <div style={{ ...styles.planoCard, background: isModoNoturno ? theme.bgApp : '#f8fafc', border: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '12px', color: theme.textSec, textTransform: 'uppercase', fontWeight: '700' }}>Plano Atual</div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: theme.textMain, marginTop: '2px' }}>
              {planoAtualNome}
            </div>

            <div style={{ fontSize: '14px', color: '#059669', fontWeight: '800', marginTop: '6px' }}>
              R$ {planoInfo.preco || '0'},00 / mês
            </div>

            <div style={{ fontSize: '12px', color: theme.textSec, marginTop: '12px', lineHeight: '1.6' }}>
              ✅ {planoInfo.produtos || 0} produtos permitidos
              <br />
              ✅ {planoInfo.categorias || 0} categorias permitidas
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: theme.textSec, textTransform: 'uppercase', fontWeight: '700' }}>Vencimento</div>
            <div style={{ fontWeight: '800', color: '#ef4444', fontSize: '15px', marginTop: '2px' }}>
              {dataVencimentoStr}
            </div>
            {mesesGratisDisponiveis > 0 && (
              <div style={{ marginTop: '8px', background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                🎁 {mesesGratisDisponiveis} mês(es) grátis acumulado(s)!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🚀 BLOCO: INDIQUE E GANHE */}
      <div style={{ ...styles.indiqueCard, background: isModoNoturno ? '#1e293b' : '#eff6ff', border: `1px solid ${isModoNoturno ? '#334155' : '#bfdbfe'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{ background: '#2563eb', color: '#fff', padding: '8px', borderRadius: '8px', display: 'flex' }}>
            <FiShare2 size={18} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: theme.textMain }}>Indique e Ganhe 1 Mês Grátis!</h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: theme.textSec }}>
              A cada <b>5 amigos assinantes</b> indicados pelo seu link, você ganha <b>1 mês grátis</b> na sua assinatura.
            </p>
          </div>
        </div>

        {/* Link de Compartilhamento */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            readOnly 
            value={linkIndicacao} 
            style={{ 
              flex: 1, 
              minWidth: '220px', 
              padding: '10px 12px', 
              borderRadius: '8px', 
              border: `1px solid ${theme.border}`, 
              background: theme.inputBg || theme.bgApp, 
              color: theme.textMain,
              fontSize: '12px',
              outline: 'none'
            }} 
          />
          <button 
            type="button" 
            onClick={copiarLink}
            style={{ 
              background: copiado ? '#16a34a' : '#2563eb', 
              color: '#fff', 
              border: 'none', 
              padding: '10px 16px', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              fontSize: '12px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              transition: 'background 0.2s'
            }}
          >
            {copiado ? <FiCheck size={14} /> : <FiCopy size={14} />}
            {copiado ? "Copiado!" : "Copiar Link"}
          </button>
        </div>

        {/* Estatísticas do Programa */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: `1px solid ${isModoNoturno ? '#334155' : '#dbeafe'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: theme.textSec, fontWeight: '700' }}>
            <FiUsers size={14} color="#2563eb" /> Amigos Assinantes Indicados: <span style={{ color: theme.textMain, fontWeight: '900' }}>{totalIndicacoes}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: theme.textSec, fontWeight: '700' }}>
            <FiAward size={14} color="#d97706" /> Progresso da Meta: <span style={{ color: theme.textMain, fontWeight: '900' }}>{progressoTime(progressoMeta)}</span>
          </div>
        </div>
      </div>

      <h3 style={{ ...styles.h3, marginTop: '25px', color: theme.textMain }}>Histórico de Pagamentos</h3>

      <div style={styles.msgContainer}>
        {historico.length > 0 ? (
          historico.map((pag: any) => {
            const dataPagamento = pag.tsAssinaturaLojista?.seconds
              ? new Date(pag.tsAssinaturaLojista.seconds * 1000).toLocaleDateString('pt-BR')
              : '---';

            const status = pag.dsStatusPagamentoLojista || 'Pendente';
            const isAtivacao = status === 'Ativação' || status === 'Pago';

            return (
              <div key={pag.id} style={{ 
                ...styles.historicoItem, 
                background: isModoNoturno ? theme.bgApp : '#f8fafc', 
                border: `1px solid ${theme.border}` 
              }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: theme.textMain }}>
                    {pag.dsMesReferencia || 'Referência não informada'}
                  </div>
                  <div style={{ fontSize: '11px', color: theme.textSec, marginTop: '2px' }}>
                    {dataPagamento}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: theme.textMain }}>
                    R$ {Number(pag.vlAssinaturaLojista || 0).toFixed(2)}
                  </div>
                  <span style={{
                    fontSize: '9px',
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontWeight: '800',
                    display: 'inline-block',
                    marginTop: '4px',
                    background: isAtivacao ? (isModoNoturno ? '#064e3b' : '#dcfce7') : (isModoNoturno ? '#7f1d1d' : '#fee2e2'),
                    color: isAtivacao ? (isModoNoturno ? '#6ee7b7' : '#166534') : (isModoNoturno ? '#f87171' : '#991b1b')
                  }}>
                    {status}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ ...styles.noMsg, color: theme.textSec }}>Nenhum histórico encontrado.</div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowUpgradeModal(true)}
        style={{ ...styles.btnUpgrade, background: theme.primary }}
      >
        VER COMPARATIVO DE PLANOS E UPGRADE
      </button>
    </section>
  );
}

function progressoTime(atual: number) {
  return `${atual} / 5 amigos`;
}

const styles: any = {
  h3: { fontSize: "11px", fontWeight: "800", marginBottom: "12px", textTransform: 'uppercase', marginTop: '10px' },
  planoCard: { padding: '20px', borderRadius: '14px' },
  indiqueCard: { padding: '16px 20px', borderRadius: '14px', marginTop: '20px' },
  msgContainer: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', maxHeight: '250px', overflowY: 'auto' },
  historicoItem: { display: 'flex', justifyContent: 'space-between', padding: '12px 15px', borderRadius: '10px', alignItems: 'center' },
  noMsg: { textAlign: 'center', padding: '20px', fontSize: '12px' },
  btnUpgrade: {
    marginTop: '25px',
    width: '100%',
    color: '#fff',
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    fontWeight: 'bold',
    fontSize: '12px',
    cursor: 'pointer'
  }
};