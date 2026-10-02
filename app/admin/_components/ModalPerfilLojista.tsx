// app/admin/_components/ModalPerfilLojista.tsx
"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy, updateDoc, Timestamp } from "firebase/firestore";
import { FiX, FiCheckCircle, FiUsers, FiGift, FiImage, FiClock, FiCalendar, FiDollarSign } from "react-icons/fi";
import { useTheme } from "@/context/ThemeContext";

// 🌟 Tipagem estrita para os itens do histórico unificado
interface HistoricoItem {
  id: string;
  origem: string;
  tipoRegistro?: string;
  dsPlanoLojista?: string;
  dsMesReferencia?: string;
  vlAssinaturaLojista?: number;
  dsStatusPagamentoLojista?: string;
  createdAt?: {
    seconds?: number;
    nanoseconds?: number;
  };
  dsUrlComprovante?: string;
}

const ModalPerfilLojista = ({ lojaId, onClose }: { lojaId: string, onClose: () => void }) => {
  const { theme, isModoNoturno } = useTheme();

  const [dados, setDados] = useState<any>(null);
  const [historicoTestes, setHistoricoTestes] = useState<any[]>([]);
  const [historicoComprovantes, setHistoricoComprovantes] = useState<HistoricoItem[]>([]);
  const [dadosPadrinho, setDadosPadrinho] = useState<any>(null);
  const [listaIndicacoes, setListaIndicacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aprovando, setAprovando] = useState(false);
  const [processandoBaixaId, setProcessandoBaixaId] = useState<string | null>(null);

  // Estado para Visualização de Comprovante em Modal de Zoom
  const [comprovanteModalUrl, setComprovanteModalUrl] = useState<string | null>(null);

  const carregarFicha = async () => {
    setLoading(true);
    const snap = await getDoc(doc(db, "lojistas", lojaId));
    if (snap.exists()) {
      const lojistaData = snap.data();
      setDados(lojistaData);

      if (lojistaData.indicadoPor) {
        const padrinhoSnap = await getDoc(doc(db, "lojistas", lojistaData.indicadoPor));
        if (padrinhoSnap.exists()) {
          setDadosPadrinho(padrinhoSnap.data());
        }
      }
    }

    const histRef = collection(db, "lojistas", lojaId, "assinaturas", "registro_inicial", "historico_testesOuro");
    const snapHist = await getDocs(query(histRef, orderBy("dataAtivacao", "desc")));
    setHistoricoTestes(snapHist.docs.map(d => ({ id: d.id, ...d.data() })));

    const indicacoesRef = collection(db, "lojistas", lojaId, "indicacoes");
    const snapIndicacoes = await getDocs(indicacoesRef);
    setListaIndicacoes(snapIndicacoes.docs.map(d => ({ id: d.id, ...d.data() })));

    // 📁 BUSCA COMPROVANTES E UPGRADES NO FIRESTORE
    try {
      // 1. Comprovantes normais de Pix
      const compRef = collection(db, "lojistas", lojaId, "assinaturas", "financeiro", "historicoComprovantes");
      const snapComp = await getDocs(query(compRef, orderBy("createdAt", "desc")));
      const listaComprovantes: HistoricoItem[] = snapComp.docs.map(d => ({ 
        id: d.id, 
        origem: "comprovante", 
        ...(d.data() as Omit<HistoricoItem, 'id' | 'origem'>) 
      }));

      // 2. 🚀 Pedidos de Upgrade (Subcoleção de controle do Master)
      const upgradeRef = collection(db, "lojistas", lojaId, "assinaturas", "registro_inicial", "up_upgrade");
      const snapUpgrade = await getDocs(query(upgradeRef, orderBy("tsDataSolicitacao", "desc")));
      const listaUpgrades: HistoricoItem[] = snapUpgrade.docs.map(d => {
        const dataUpg = d.data();
        const statusUpg = dataUpg.dsStatusUpgrade || "pendente"; // "pendente" ou "aprovado"
        
        return {
          id: d.id,
          origem: "upgrade",
          tipoRegistro: "upgrade",
          dsPlanoLojista: dataUpg.dsPlanoDesejado,
          dsMesReferencia: `Upgrade: ${dataUpg.dsPlanoAtual || 'Plano'} ➔ ${dataUpg.dsPlanoDesejado}`,
          vlAssinaturaLojista: dataUpg.vlNovoPlano || 0,
          dsStatusPagamentoLojista: statusUpg === "pendente" ? "Em Análise" : "Aprovado",
          createdAt: dataUpg.tsDataSolicitacao,
          dsUrlComprovante: "" // Upgrade não tem print de comprovante anexado
        };
      });

      // 🌟 Unifica e ordena com tipagem estrita e segura
      const todosUnificados: HistoricoItem[] = [...listaComprovantes, ...listaUpgrades].sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });

      setHistoricoComprovantes(todosUnificados);
    } catch (e) {
      console.warn("Aviso ao buscar comprovantes/upgrades:", e);
    }

    setLoading(false);
  };

  useEffect(() => { carregarFicha(); }, [lojaId]);

  // 🚀 FUNÇÃO 1: EXCLUSIVA PARA APROVAR UPGRADES DE PLANO
  const aprovarUpgrade = async (sol: HistoricoItem) => {
    setAprovando(true);
    try {
      const novoPlanoNome = sol.dsPlanoLojista;

      if (!novoPlanoNome) {
        alert("Erro: Nome do novo plano não identificado.");
        setAprovando(false);
        return;
      }

      // 1. Atualiza o status do upgrade para "aprovado" na subcoleção de controle up_upgrade
      const upgDocRef = doc(db, "lojistas", lojaId, "assinaturas", "registro_inicial", "up_upgrade", sol.id);
      await updateDoc(upgDocRef, {
        dsStatusUpgrade: "aprovado",
        tsAprovacaoMaster: Timestamp.now()
      });

      // 2. 🚀 Atualiza o plano da loja na raiz e marca o status de upgrade como aprovado
      await updateDoc(doc(db, "lojistas", lojaId), {
        "dadosLoja.dsPlanoLoja": novoPlanoNome,
        "sistema.dsStatusUpgrade": "aprovado"
      });

      alert(`✅ Upgrade aprovado com sucesso! O plano foi alterado para ${novoPlanoNome}.`);
      carregarFicha();
    } catch (e) {
      console.error("Erro ao aprovar upgrade:", e);
      alert("Erro ao aprovar o upgrade.");
    } finally {
      setAprovando(false);
    }
  };

  // 💰 FUNÇÃO 2: EXCLUSIVA PARA APROVAR COMPROVANTES DE MENSALIDADE
  const aprovarComprovante = async (comp: HistoricoItem) => {
    setProcessandoBaixaId(comp.id);
    try {
      const dataAtual = new Date();
      const vencimentoAtualSecs = dados?.dadosLoja?.tsVencimentoLoja?.seconds;
      const vencimentoAtual = vencimentoAtualSecs ? new Date(vencimentoAtualSecs * 1000) : null;

      let vencimentoBase = vencimentoAtual && vencimentoAtual > dataAtual ? vencimentoAtual : dataAtual;
      const ciclo = dados?.dadosLoja?.ciclo || "mensal";

      if (ciclo === "anual") {
        vencimentoBase.setFullYear(vencimentoBase.getFullYear() + 1);
      } else {
        vencimentoBase.setMonth(vencimentoBase.getMonth() + 1);
      }

      // 1. Atualiza a data de vencimento e reativa a loja na raiz
      await updateDoc(doc(db, "lojistas", lojaId), {
        "dadosLoja.tsVencimentoLoja": Timestamp.fromDate(vencimentoBase),
        "dadosLoja.dsStatusLoja": "ativo",
        "sistema.temComprovantePendente": false
      });

      // 2. 🚀 Atualiza O MESMO DOCUMENTO do comprovante para "Aprovado"
      const compDocRef = doc(db, "lojistas", lojaId, "assinaturas", "financeiro", "historicoComprovantes", comp.id);
      await updateDoc(compDocRef, {
        dsStatusPagamentoLojista: "Aprovado",
        tsProximoVencimento: Timestamp.fromDate(vencimentoBase),
        tsAprovacaoMaster: Timestamp.now()
      });

      alert("✅ Comprovante aprovado com sucesso! O plano foi estendido e o registro atualizado.");
      carregarFicha();
    } catch (error) {
      console.error("Erro ao aprovar comprovante:", error);
      alert("Erro ao processar aprovação.");
    } finally {
      setProcessandoBaixaId(null);
    }
  };

  if (loading) return (
    <div style={styles.modalOverlay}>
      <div style={{ ...styles.modalContent, background: theme.bgCard, color: theme.textMain, textAlign: 'center' }}>
        Carregando...
      </div>
    </div>
  );

  const { dadosLoja, dadosPessoais } = dados || {};
  const totalIndicacoesAtivas = listaIndicacoes.filter(i => i.status === "ativo_assinante").length;
  const progressoBloco = totalIndicacoesAtivas % 5;

  return (
    <div style={styles.modalOverlay}>
      <div style={{ ...styles.modalContent, background: theme.bgCard, color: theme.textMain, border: `1px solid ${theme.border}` }}>
        
        {/* MODAL DE ZOOM DO COMPROVANTE */}
        {comprovanteModalUrl && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000, padding: '20px' }}>
            <div style={{ background: theme.bgCard, borderRadius: '16px', padding: '20px', maxWidth: '500px', width: '100%', border: `1px solid ${theme.border}`, textAlign: 'center', position: 'relative' }}>
              <button 
                onClick={() => setComprovanteModalUrl(null)}
                style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: theme.textMain, cursor: 'pointer' }}
              >
                <FiX size={22} />
              </button>
              <h4 style={{ margin: '0 0 15px 0', fontSize: '15px', fontWeight: '800', color: theme.textMain }}>Auditoria de Comprovante Pix / Upgrade</h4>
              <div style={{ maxHeight: '70vh', overflowY: 'auto', borderRadius: '8px', border: `1px solid ${theme.border}`, background: '#000' }}>
                <img src={comprovanteModalUrl} alt="Print do Comprovante" style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
              <button 
                onClick={() => setComprovanteModalUrl(null)}
                style={{ marginTop: '15px', width: '100%', padding: '10px', background: theme.primary || '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Fechar Auditoria
              </button>
            </div>
          </div>
        )}

        {/* CABEÇALHO */}
        <div style={{ ...styles.modalHeader, borderBottom: `1px solid ${theme.border}` }}>
          <div>
            <h3 style={{ margin: '0 0 5px 0', color: theme.textMain }}>Lojista: {dadosLoja?.dsNomeLoja || "Loja"}</h3>
            <p style={{ fontSize: '13px', color: theme.primary, marginBottom: '5px' }}>Loja Id: {lojaId}</p>
            <span style={{ fontSize: '12px', fontWeight: '900', color: theme.primary }}>Plano: {dadosLoja?.dsPlanoLoja || "Bronze"}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {dadosLoja?.dsLogoLoja && <img src={dadosLoja.dsLogoLoja} style={{ ...styles.logoTopo, border: `1px solid ${theme.border}` }} alt="Logo" />}
            <button onClick={onClose} style={{ ...styles.btnClose, color: theme.textSec }}><FiX size={24} /></button>
          </div>
        </div>

        {/* 📁 CENTRO DE AUDITORIA DE COMPROVANTES E UPGRADES */}
        <div style={{ ...styles.cardIndicacao, background: isModoNoturno ? '#1e293b' : '#f0fdf4', border: `1px solid ${isModoNoturno ? '#334155' : '#bbf7d0'}`, marginBottom: '20px' }}>
          <h4 style={{ ...styles.subTitle, color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FiDollarSign size={16} /> CENTRO DE AUDITORIA DE COMPROVANTES & UPGRADES
          </h4>
          <p style={{ fontSize: '11px', color: theme.textSec, margin: '0 0 12px 0' }}>
            Gerencie solicitações de upgrade e comprovantes enviados pelo lojista em um único lugar.
          </p>

          {historicoComprovantes.length > 0 ? (
            <div style={{ display: 'grid', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
              {historicoComprovantes.map((comp) => {
                const status = comp.dsStatusPagamentoLojista || "Em Análise";
                const isPendente = status.toLowerCase().includes("análise") || status.toLowerCase().includes("analise") || status.toLowerCase().includes("pendente");
                const isUpgrade = comp.tipoRegistro === "upgrade";
                const dataEnvio = comp.createdAt?.seconds 
                  ? new Date(comp.createdAt.seconds * 1000).toLocaleString('pt-BR') 
                  : '---';

                return (
                  <div key={comp.id} style={{ background: theme.bgCard, padding: '12px', borderRadius: '10px', border: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isUpgrade && <span style={{ background: '#2563eb', color: '#fff', fontSize: '9px', padding: '2px 6px', borderRadius: '4px' }}>UPGRADE</span>}
                        {comp.dsMesReferencia || "Referência do Ciclo"}
                      </div>
                      <div style={{ fontSize: '11px', color: theme.textSec, marginTop: '2px' }}>
                        Enviado em: {dataEnvio} | Valor: <strong style={{ color: '#059669' }}>R$ {Number(comp.vlAssinaturaLojista || 0).toFixed(2)}</strong>
                      </div>
                      <span style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '6px', background: isPendente ? '#fef3c7' : '#dcfce7', color: isPendente ? '#b45309' : '#166534', display: 'inline-block', marginTop: '6px' }}>
                        {status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {comp.dsUrlComprovante && (
                        <button
                          type="button"
                          onClick={() => setComprovanteModalUrl(comp.dsUrlComprovante || null)}
                          style={{ background: isModoNoturno ? '#334155' : '#e2e8f0', color: theme.textMain, border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <FiImage size={14} /> Ver Print
                        </button>
                      )}

                      {isPendente && (
                        <button
                          type="button"
                          onClick={() => {
                            if (comp.origem === "upgrade" || comp.tipoRegistro === "upgrade") {
                              aprovarUpgrade(comp);
                            } else {
                              aprovarComprovante(comp);
                            }
                          }}
                          disabled={aprovando || processandoBaixaId === comp.id}
                          style={{ background: '#059669', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', opacity: (aprovando || processandoBaixaId === comp.id) ? 0.6 : 1 }}
                        >
                          {processandoBaixaId === comp.id || aprovando ? "Processando..." : (comp.origem === "upgrade" ? "✅ Aprovar Upgrade" : "✅ Aprovar Comprovante")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '15px', fontSize: '12px', color: theme.textSec, background: theme.bgCard, borderRadius: '8px' }}>
              Nenhum comprovante ou solicitação pendente no momento.
            </div>
          )}
        </div>

        {/* 🌟 PAINEL DE INDICAÇÕES E PROGRAMA DE RECOMPENSA */}
        <div style={{ ...styles.cardIndicacao, background: theme.bgApp, border: `1px solid ${theme.border}` }}>
          <h4 style={{ ...styles.subTitle, display: 'flex', alignItems: 'center', gap: '6px', color: theme.primary }}>
            <FiUsers size={16} /> PROGRAMA DE INDICAÇÃO & PADRINHO
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div style={{ ...styles.subCard, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
              <span style={{ ...styles.labelMini, color: theme.textSec }}>Quem Indicou (Padrinho)</span>
              <strong style={{ fontSize: '13px', color: dadosPadrinho ? '#059669' : theme.textSec }}>
                {dadosPadrinho ? (dadosPadrinho.dadosLoja?.dsNomeLoja || "Loja Padrinho") : "Cadastro Direto (Sem Padrinho)"}
              </strong>
            </div>
            <div style={{ ...styles.subCard, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
              <span style={{ ...styles.labelMini, color: theme.textSec }}>Recompensas Conquistadas</span>
              <strong style={{ fontSize: '13px', color: '#d97706' }}>
                <FiGift size={12} /> {dados?.recompensasMesesGratis || 0} Mês(es) Grátis ({dados?.mesesGratisDisponiveis || 0} disponíveis)
              </strong>
            </div>
          </div>

          <div style={{ background: theme.bgCard, padding: '10px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', color: theme.textMain }}>
              <span>Total de Indicações Ativas: <strong>{totalIndicacoesAtivas}</strong></span>
              <span>Próxima recompensa em: <strong>{5 - progressoBloco} indicação(ões)</strong></span>
            </div>
            <div style={{ width: '100%', background: theme.border, height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${(progressoBloco / 5) * 100}%`, background: '#10b981', height: '100%', transition: 'width 0.3s' }}></div>
            </div>
          </div>

          {listaIndicacoes.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec }}>Amigos Indicados ({listaIndicacoes.length}):</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                {listaIndicacoes.map((ind, idx) => (
                  <span key={idx} style={{ fontSize: '11px', background: ind.status === 'ativo_assinante' ? '#d1fae5' : '#fef3c7', color: ind.status === 'ativo_assinante' ? '#065f46' : '#b45309', padding: '3px 8px', borderRadius: '6px', fontWeight: '600' }}>
                    {ind.nomeIndicado || ind.emailIndicado} ({ind.status})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* HISTÓRICO DE TESTES OURO */}
        {historicoTestes.length > 0 && (
          <div style={{ marginTop: '20px', borderTop: `1px solid ${theme.border}`, paddingTop: '15px' }}>
            <h4 style={{ ...styles.subTitle, color: theme.primary }}>⭐ HISTÓRICO DE TESTES OURO</h4>
            <div style={{ display: 'grid', gap: '5px' }}>
              {historicoTestes.map((h: any) => (
                <div key={h.id} style={{ fontSize: '11px', background: theme.bgApp, color: theme.textMain, padding: '8px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', border: `1px solid ${theme.border}` }}>
                  <span><strong>Início:</strong> {h.dataAtivacao?.toDate().toLocaleDateString()}</span>
                  <span><strong>Expira:</strong> {h.dataExpiracao?.toDate().toLocaleDateString()}</span>
                  <span><strong>Dias:</strong> {h.diasConcedidos}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DADOS CADASTRAIS (RESPONSÁVEL E LOJA) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '13px', marginTop: '20px', borderTop: `1px solid ${theme.border}`, paddingTop: '15px', color: theme.textMain }}>
          <section>
            <h4 style={{ ...styles.subTitle, color: theme.primary }}>👤 RESPONSÁVEL</h4>
            <p><strong>Nome:</strong> {dadosPessoais?.dsNomeResponsavel || "---"}</p>
            <p><strong>CPF:</strong> {dadosPessoais?.dsCpfResponsavel || "---"}</p>
            <p><strong>E-mail:</strong> {dadosPessoais?.dsEmailResponsavel || dados?.email || "---"}</p>
            <p><strong>Telefone:</strong> {dadosPessoais?.dsTelResponsavel || "---"}</p>
            <p><strong>Rua:</strong> {dadosPessoais?.dsRuaResponsavel || "---"}, {dadosPessoais?.nrNumeroResponsavel || "S/N"}</p>
            <p><strong>Bairro:</strong> {dadosPessoais?.dsBairroResponsavel || "---"}</p>
            <p><strong>Cidade:</strong> {dadosPessoais?.dsCidadeResponsavel || "---"} - {dadosPessoais?.dsUfResponsavel || ""}</p>
            <p><strong>CEP:</strong> {dadosPessoais?.dsCepResponsavel || "---"}</p>
          </section>

          <section>
            <h4 style={{ ...styles.subTitle, color: theme.primary }}>🏪 DADOS DA LOJA</h4>
            <p><strong>Segmento:</strong> {dadosLoja?.dsSeguimentoLoja || "---"}</p>
            <p><strong>WhatsApp:</strong> {dadosLoja?.nrWhatssapLoja || "---"}</p>
            <p><strong>Slug:</strong> {dadosLoja?.dsSlug || "---"}</p>
            <p><strong>Rua:</strong> {dadosLoja?.dsRuaLoja || "---"}, {dadosLoja?.nrNumeroLoja || "S/N"}</p>
            <p><strong>Bairro:</strong> {dadosLoja?.dsBairroLoja || "---"}</p>
            <p><strong>Cidade:</strong> {dadosLoja?.dsCidadeLoja || "---"} - {dadosLoja?.dsUfLoja || ""}</p>
            <p><strong>CEP:</strong> {dadosLoja?.dsCepLoja || "---"}</p>
          </section>
        </div>
      </div>

      <style jsx global>{`
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: ${isModoNoturno ? "#0f172a" : "#f1f5f9"};
        }
        ::-webkit-scrollbar-thumb {
          background: ${isModoNoturno ? "#334155" : "#cbd5e1"};
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${isModoNoturno ? "#475569" : "#94a3b8"};
        }
      `}</style>
    </div>
  );
};

const styles: any = {
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { padding: '25px', borderRadius: '20px', width: '90%', maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '15px' },
  logoTopo: { width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' },
  btnClose: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex' },
  cardIndicacao: { padding: '15px', borderRadius: '14px', marginBottom: '20px' },
  subCard: { padding: '10px', borderRadius: '8px' },
  labelMini: { fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '2px' },
  subTitle: { fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '900' }
};

export default ModalPerfilLojista;
// esse modal exibe as informaçoes do logista, utilizado na aba de assinaturas do Dashboard Master