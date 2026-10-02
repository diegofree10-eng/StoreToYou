// app/admin/configuracoes/_tabs/AssinaturaTab.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { FiShare2, FiCopy, FiCheck, FiUsers, FiAward, FiClock, FiFileText, FiCreditCard } from "react-icons/fi";

// Importando a sub-aba corporativa de Extrato Financeiro
import ExtratoFinanceiro from "../tabsConfig/ExtratoFinanceiro";

export default function AssinaturaTab({
  config,
  planosConfig,
  setShowUpgradeModal
}: any) {
  const { theme, isModoNoturno } = useTheme();

  // 🗂️ Estado para gerenciar as sub-abas internas (Visão Geral vs Centro Financeiro)
  const [subAbaAtiva, setSubAbaAtiva] = useState<"geral" | "extrato">("geral");

  const [copiado, setCopiado] = useState(false);
  const [listaIndicacoes, setListaIndicacoes] = useState<any[]>([]);
  const [carregandoIndicacoes, setCarregandoIndicacoes] = useState(true);

  const planoAtualNome = config?.dadosLoja?.dsPlanoLoja || 'Bronze';
  const planoInfo = planosConfig?.[planoAtualNome] || {};

  const tsVencimento = config?.dadosLoja?.tsVencimentoLoja;
  const dataVencimentoStr = tsVencimento?.seconds
    ? new Date(tsVencimento.seconds * 1000).toLocaleDateString('pt-BR')
    : '---';

  const historico = config?.historicoPagamentos || [];

  // ID e Nome da Loja obtidos com segurança de múltiplas propriedades
  const lojistaId = config?.uid || config?.dadosLoja?.lojaId || config?.id || "";
  const nomeLojaAtual = encodeURIComponent(config?.dadosLoja?.dsNomeLoja || "Loja Parceira");

  const linkIndicacao = typeof window !== "undefined"
    ? `${window.location.origin}/login?ref=${lojistaId}&nome=${nomeLojaAtual}`
    : `https://seudominio.com/login?ref=${lojistaId}&nome=${nomeLojaAtual}`;

  const copiarLink = () => {
    navigator.clipboard.writeText(linkIndicacao);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  // 🚀 BUSCA AS INDICAÇÕES NA SUBCOLEÇÃO DO FIRESTORE E AUTOMATIZA A RECOMPENSA E HISTÓRICO
  useEffect(() => {
    async function buscarIndicacoes() {
      if (!lojistaId) {
        console.error("❌ ERRO CRÍTICO: lojistaId está vazio!", { lojistaId, config });
        setCarregandoIndicacoes(false);
        return;
      }
      try {
        console.log("🔍 Buscando indicações para o lojistaId:", lojistaId);
        const indicacoesRef = collection(db, "lojistas", lojistaId, "indicacoes");
        const snapshot = await getDocs(indicacoesRef);

        console.log("📦 Total de documentos encontrados na subcoleção:", snapshot.docs.length);

        const dados = snapshot.docs.map(docSnap => {
          const docData = docSnap.data() as { status?: string; nomeIndicado?: string; emailIndicado?: string };
          return { id: docSnap.id, ...docData };
        });

        setListaIndicacoes(dados);

        // 🎁 VERIFICAÇÃO AUTOMÁTICA DE META DE INDICAÇÕES (MÚLTIPLOS DE 5)
        const totalAtivos = dados.filter((i: any) => {
          const statusLower = String(i.status || "").toLowerCase();
          return statusLower.includes("ativo") || statusLower.includes("assinante");
        }).length;

        const mesesAtuaisBanco = config?.dadosLoja?.mesesGratisDisponiveis || 0;
        const metasAtingidas = Math.floor(totalAtivos / 5);

        if (metasAtingidas > mesesAtuaisBanco && totalAtivos > 0) {
          const novosMeses = metasAtingidas;
          const novoBonus = {
            id: `bonus-indicacao-${Date.now()}`,
            dsMesReferencia: `Bônus: Meta de Indicações (${novosMeses * 5} amigos)`,
            vlAssinaturaLojista: 0,
            dsStatusPagamentoLojista: "Recompensa",
            tsAssinaturaLojista: { seconds: Math.floor(Date.now() / 1000) }
          };

          const historicoAtual = config?.historicoPagamentos || [];
          const historicoAtualizado = [novoBonus, ...historicoAtual];

          await updateDoc(doc(db, "lojistas", lojistaId), {
            "dadosLoja.mesesGratisDisponiveis": novosMeses,
            "dadosLoja.recompensasMesesGratis": novosMeses,
            "historicoPagamentos": historicoAtualizado
          });

          console.log(`🎉 Meta batida! ${novosMeses} mês(es) grátis creditado(s) e registrado(s) no histórico.`);
        }

      } catch (err) {
        console.error("❌ Erro ao carregar indicações:", err);
      } finally {
        setCarregandoIndicacoes(false);
      }
    }
    buscarIndicacoes();
  }, [lojistaId]);

  // Estatísticas do Programa
  const totalIndicacoes = listaIndicacoes.filter(i => {
    const statusLower = String(i.status || "").toLowerCase();
    return statusLower.includes("ativo") || statusLower.includes("assinante");
  }).length;

  const mesesGratisDisponiveis = config?.dadosLoja?.mesesGratisDisponiveis || 0;
  const progressoMeta = totalIndicacoes % 5;

  return (
    <section style={{ padding: '20px', background: theme.bgCard, borderRadius: '12px', border: `1px solid ${theme.border}`, transition: 'background 0.3s' }}>

      {/* CABEÇALHO DO MÓDULO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h3 style={{ ...styles.h3, margin: 0, color: theme.textMain }}>Gerenciamento de Assinatura</h3>

        {/* NAVEGAÇÃO ENTRE SUB-ABAS (PADRÃO ERP) */}
        <div style={{ display: 'flex', gap: '8px', background: isModoNoturno ? theme.bgApp : '#f1f5f9', padding: '4px', borderRadius: '10px', border: `1px solid ${theme.border}` }}>
          <button
            type="button"
            onClick={() => setSubAbaAtiva("geral")}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '800',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: subAbaAtiva === "geral" ? (theme.primary || '#2563eb') : 'transparent',
              color: subAbaAtiva === "geral" ? '#fff' : theme.textSec,
              transition: 'all 0.2s'
            }}
          >
            <FiCreditCard size={14} /> Plano & Indique e Ganhe
          </button>

          <button
            type="button"
            onClick={() => setSubAbaAtiva("extrato")}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '800',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: subAbaAtiva === "extrato" ? (theme.primary || '#2563eb') : 'transparent',
              color: subAbaAtiva === "extrato" ? '#fff' : theme.textSec,
              transition: 'all 0.2s'
            }}
          >
            <FiFileText size={14} /> Centro Financeiro & Extrato
          </button>
        </div>
      </div>

      {/* RENDERIZAÇÃO CONDICIONAL DAS SUB-ABAS */}
      {subAbaAtiva === "extrato" ? (
        <ExtratoFinanceiro config={config} planosConfig={planosConfig} />
      ) : (
        <>
          {/* AVISO DE RECOMPENSA DE MÊS GRÁTIS */}
          {mesesGratisDisponiveis > 0 && (
            <div style={{ background: '#ecfdf5', border: '1px solid #10b981', padding: '15px', borderRadius: '12px', marginBottom: '20px', color: '#065f46' }}>
              <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: 'bold' }}>🎉 Parabéns pelas indicações!</h4>
              <p style={{ margin: 0, fontSize: '12px' }}>
                Você atingiu a meta de amigos assinantes e acumulou <b>{mesesGratisDisponiveis} mês(es) grátis</b> em sua assinatura. Entre em contato com o suporte ou aplique o bônus no seu próximo ciclo!
              </p>
            </div>
          )}

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

          {/* BLOCO: INDIQUE E GANHE */}
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
                <FiUsers size={14} color="#2563eb" /> Amigos Assinantes: <span style={{ color: theme.textMain, fontWeight: '900' }}>{totalIndicacoes}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: theme.textSec, fontWeight: '700' }}>
                <FiAward size={14} color="#d97706" /> Progresso da Meta: <span style={{ color: theme.textMain, fontWeight: '900' }}>{progressoTime(progressoMeta)}</span>
              </div>
            </div>
          </div>

          {/* 🚀 VITRINE / EXTRATO DE INDICAÇÕES */}
          <h3 style={{ ...styles.h3, marginTop: '25px', color: theme.textMain }}>Amigos Indicados ({listaIndicacoes.length})</h3>
          <div style={styles.msgContainer}>
            {carregandoIndicacoes ? (
              <div style={{ ...styles.noMsg, color: theme.textSec }}>Carregando indicações...</div>
            ) : listaIndicacoes.length > 0 ? (
              listaIndicacoes.map((ind: any) => {
                const statusLower = String(ind.status || "").toLowerCase();
                const isAtivo = statusLower.includes("ativo") || statusLower.includes("assinante");
                return (
                  <div key={ind.id} style={{
                    ...styles.historicoItem,
                    background: isModoNoturno ? theme.bgApp : '#f8fafc',
                    border: `1px solid ${theme.border}`
                  }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: theme.textMain }}>
                        {ind.nomeIndicado || 'Loja Parceira'}
                      </div>
                      <div style={{ fontSize: '11px', color: theme.textSec, marginTop: '2px' }}>
                        {ind.emailIndicado || 'E-mail não visível'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontWeight: '800',
                        display: 'inline-block',
                        background: isAtivo ? (isModoNoturno ? '#064e3b' : '#dcfce7') : (isModoNoturno ? '#78350f' : '#fef3c7'),
                        color: isAtivo ? (isModoNoturno ? '#6ee7b7' : '#166534') : (isModoNoturno ? '#fcd34d' : '#92400e')
                      }}>
                        {isAtivo ? "🟢 Ativo - Contabilizado" : "🟡 Pendente de Assinatura"}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ ...styles.noMsg, color: theme.textSec }}>Você ainda não indicou nenhuma loja. Compartilhe seu link acima!</div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowUpgradeModal(true)}
            style={{ ...styles.btnUpgrade, background: theme.primary }}
          >
            VER COMPARATIVO DE PLANOS E UPGRADE
          </button>
        </>
      )}

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