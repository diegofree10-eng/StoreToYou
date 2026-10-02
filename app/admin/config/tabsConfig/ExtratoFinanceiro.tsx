// app/admin/config/tabsConfig/ExtratoFinanceiro.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "@/context/ThemeContext";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { 
  FiFileText, 
  FiCheckCircle, 
  FiGift, 
  FiClock, 
  FiSearch, 
  FiUploadCloud,
  FiShield,
  FiImage,
  FiX,
  FiTrendingUp
} from "react-icons/fi";

// Importando o Cropper dedicado para comprovantes
import ComprovanteCropperModal from "@/utils/ComprovanteCropperModal";

export default function ExtratoFinanceiro({ config, planosConfig }: any) {
  const { theme, isModoNoturno } = useTheme();
  
  const [historico, setHistorico] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Estados para o Envio de Comprovante
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado para Visualização de Comprovante em Modal
  const [comprovanteModalUrl, setComprovanteModalUrl] = useState<string | null>(null);

  // Estados para filtros corporativos (Padrão ERP)
  const [filtroTipo, setFiltroTipo] = useState("todos"); // 'todos', 'pagamento', 'recompensa', 'analise', 'upgrade'
  const [buscaTermo, setBuscaTermo] = useState("");

  // ID do lojista obtido de forma segura
  const lojistaId = config?.uid || config?.dadosLoja?.lojaId || config?.id || "";
  const planoAtualNome = config?.dadosLoja?.dsPlanoLoja || 'Bronze';

  // 💰 FUNÇÃO ROBUSTA PARA OBTER O PREÇO EXATO DO PLANO ATUAL
  const obterPrecoMensal = () => {
    if (!planosConfig) return Number(config?.dadosLoja?.precoPlano || 99.90);

    const chavePlano = Object.keys(planosConfig).find(
      k => k.toLowerCase() === planoAtualNome.toLowerCase()
    );

    const dadosDoPlano = chavePlano ? planosConfig[chavePlano] : {};

    return Number(
      dadosDoPlano?.preco ?? 
      dadosDoPlano?.vlPreco ?? 
      dadosDoPlano?.valor ?? 
      config?.dadosLoja?.precoPlano ?? 
      99.90
    );
  };

  // 🚀 BUSCA O HISTÓRICO UNIFICADO NO FIRESTORE
  const carregarHistoricoFinanceiro = async () => {
    if (!lojistaId) {
      setCarregando(false);
      return;
    }

    try {
      setCarregando(true);

      // 1. Busca Comprovantes / Faturas unificadas
      const comprovantesRef = collection(
        db, 
        "lojistas", 
        lojistaId, 
        "assinaturas", 
        "financeiro", 
        "historicoComprovantes"
      );
      const snapComprovantes = await getDocs(comprovantesRef);
      const listaComprovantes = snapComprovantes.docs.map(docSnap => ({
        idDoc: docSnap.id,
        origem: "historicoComprovantes",
        ...docSnap.data()
      }));

      // 2. Busca registros legados de historicoPagamentos (para não perder dados antigos)
      let listaPagamentosAntigos: any[] = [];
      try {
        const pagamentosRef = collection(
          db, 
          "lojistas", 
          lojistaId, 
          "assinaturas", 
          "financeiro", 
          "historicoPagamentos"
        );
        const snapPagamentos = await getDocs(pagamentosRef);
        listaPagamentosAntigos = snapPagamentos.docs.map(docSnap => ({
          idDoc: docSnap.id,
          origem: "historicoPagamentos",
          ...docSnap.data()
        }));
      } catch (err) {
        // Ignora caso a coleção não exista
      }

      // 3. Busca Solicitações de Upgrade do Lojista
      const upgradesRef = collection(
        db,
        "lojistas",
        lojistaId,
        "assinaturas",
        "registro_inicial",
        "up_upgrade"
      );
      const snapUpgrades = await getDocs(upgradesRef);
      const listaUpgrades = snapUpgrades.docs.map(docSnap => {
        const dataUpgrade = docSnap.data();
        const statusUpgrade = dataUpgrade.dsStatusUpgrade || "pendente";
        
        return {
          idDoc: docSnap.id,
          origem: "up_upgrade",
          id: dataUpgrade.id || docSnap.id,
          dsPlanoLojista: dataUpgrade.dsPlanoDesejado,
          dsMesReferencia: `Upgrade: ${dataUpgrade.dsPlanoAtual || 'Plano'} ➔ ${dataUpgrade.dsPlanoDesejado}`,
          vlAssinaturaLojista: dataUpgrade.vlNovoPlano || 0,
          dsStatusPagamentoLojista: statusUpgrade === "aprovado" ? "Aprovado" : "Em Análise",
          tipoRegistro: "upgrade",
          createdAt: dataUpgrade.tsDataSolicitacao || dataUpgrade.createdAt
        };
      });

      // Unifica os registros evitando duplicidade por ID
      const mapaTodos = new Map();
      [...listaComprovantes, ...listaPagamentosAntigos, ...listaUpgrades].forEach(item => {
        const chave = item.id || item.idDoc;
        mapaTodos.set(chave, item);
      });

      const todosUnificados = Array.from(mapaTodos.values()).sort((a, b) => {
        const tA = a.createdAt?.seconds || a.tsAssinaturaLojista?.seconds || a.tsDataSolicitacao?.seconds || 0;
        const tB = b.createdAt?.seconds || b.tsAssinaturaLojista?.seconds || b.tsDataSolicitacao?.seconds || 0;
        return tB - tA; // Mais recentes primeiro
      });

      setHistorico(todosUnificados);
    } catch (err) {
      console.error("❌ Erro ao buscar histórico financeiro:", err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarHistoricoFinanceiro();
  }, [lojistaId]);

  // KPIs mantidos (Apenas Bônus Acumulados)
  const totalMesesResgatados = historico
    .filter((p: any) => p.dsStatusPagamentoLojista === "Recompensa").length;

  // 📸 SELEÇÃO DE ARQUIVO E PROCESSAMENTO
  const handleArquivoEscolhido = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArquivoSelecionado(e.target.files[0]);
    }
    if (e.target) e.target.value = "";
  };

  const handleCropFinalizado = async (croppedBlob: Blob) => {
    if (!lojistaId) {
      alert("Erro crítico: ID do lojista não encontrado.");
      setArquivoSelecionado(null);
      return;
    }

    setEnviando(true);
    setArquivoSelecionado(null);

    try {
      const idTransacaoUnico = `COMP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
      
      const storageRef = ref(storage, `lojistas/${lojistaId}/comprovantes/${idTransacaoUnico}.jpg`);
      await uploadBytes(storageRef, croppedBlob);
      const urlComprovante = await getDownloadURL(storageRef);

      const mesCompetenciaStr = `Ciclo ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`.toLowerCase();
      const competenciaFormatada = mesCompetenciaStr.charAt(0).toUpperCase() + mesCompetenciaStr.slice(1);

      const valorCorretoPlano = obterPrecoMensal();

      const novoComprovanteRef = doc(
        db,
        "lojistas",
        lojistaId,
        "assinaturas",
        "financeiro",
        "historicoComprovantes",
        idTransacaoUnico
      );

      const dadosComprovante = {
        id: idTransacaoUnico,
        dsPlanoLojista: planoAtualNome,
        dsMesReferencia: competenciaFormatada,
        vlAssinaturaLojista: valorCorretoPlano,
        dsStatusPagamentoLojista: "Em Análise",
        dsUrlComprovante: urlComprovante,
        tsAssinaturaLojista: Timestamp.now(),
        createdAt: Timestamp.now()
      };

      await setDoc(novoComprovanteRef, dadosComprovante);

      alert("Comprovante enviado com sucesso! O registro foi adicionado à tabela em análise.");
      carregarHistoricoFinanceiro();
    } catch (error) {
      console.error("Erro ao enviar comprovante:", error);
      alert("Erro ao enviar comprovante.");
    } finally {
      setEnviando(false);
    }
  };

  // Filtragem dos lançamentos
  const historicoFiltrado = historico.filter((pag: any) => {
    const status = (pag.dsStatusPagamentoLojista || "").toLowerCase();
    const referencia = (pag.dsMesReferencia || "").toLowerCase();
    const idTransacao = (pag.id || pag.idDoc || "").toLowerCase();
    const planoLoja = (pag.dsPlanoLojista || "").toLowerCase();
    const isUpgradeItem = pag.tipoRegistro === "upgrade" || pag.origem === "up_upgrade";

    const matchTipo = 
      filtroTipo === "todos" ? true :
      filtroTipo === "recompensa" ? status.includes("recompensa") :
      filtroTipo === "analise" ? status.includes("análise") || status.includes("analise") :
      filtroTipo === "upgrade" ? isUpgradeItem :
      !status.includes("recompensa") && !status.includes("análise") && !isUpgradeItem;

    const matchBusca = 
      referencia.includes(buscaTermo.toLowerCase()) || 
      idTransacao.includes(buscaTermo.toLowerCase()) ||
      status.includes(buscaTermo.toLowerCase()) ||
      planoLoja.includes(buscaTermo.toLowerCase());

    return matchTipo && matchBusca;
  });

  return (
    <section style={{ padding: '24px', background: theme.bgCard, borderRadius: '16px', border: `1px solid ${theme.border}`, transition: 'background 0.3s' }}>
      
      {/* CROPPER DE COMPROVANTE */}
      {arquivoSelecionado && (
        <ComprovanteCropperModal
          file={arquivoSelecionado}
          onCropComplete={handleCropFinalizado}
          onCancel={() => setArquivoSelecionado(null)}
        />
      )}

      {/* MODAL DE VISUALIZAÇÃO DO COMPROVANTE */}
      {comprovanteModalUrl && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ background: theme.bgCard, borderRadius: '16px', padding: '20px', maxWidth: '500px', width: '100%', border: `1px solid ${theme.border}`, textAlign: 'center', position: 'relative' }}>
            <button 
              onClick={() => setComprovanteModalUrl(null)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: theme.textMain, cursor: 'pointer' }}
            >
              <FiX size={22} />
            </button>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '15px', fontWeight: '800', color: theme.textMain }}>Comprovante de Pagamento</h4>
            <div style={{ maxHeight: '70vh', overflowY: 'auto', borderRadius: '8px', border: `1px solid ${theme.border}`, background: '#000' }}>
              <img src={comprovanteModalUrl} alt="Comprovante Pix" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
            <button 
              onClick={() => setComprovanteModalUrl(null)}
              style={{ marginTop: '15px', width: '100%', padding: '10px', background: theme.primary || '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Fechar Visualização
            </button>
          </div>
        </div>
      )}

      {/* HEADER EXECUTIVO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: theme.primary || '#2563eb', color: '#fff', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <FiFileText size={18} />
            </span>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: theme.textMain }}>Centro Financeiro & Extrato</h3>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: theme.textSec }}>
            Auditoria completa de faturas, liquidações, upgrades de plano e comprovantes enviados.
          </p>
        </div>

        {/* ÁREA DE AÇÕES E INDICADORES */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleArquivoEscolhido} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={enviando}
            style={{
              background: '#059669',
              color: '#fff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '10px',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              opacity: enviando ? 0.6 : 1
            }}
          >
            <FiUploadCloud size={16} />
            {enviando ? "Processando..." : "Enviar Comprovante"}
          </button>

          <div style={{ background: isModoNoturno ? theme.bgApp : '#f8fafc', padding: '8px 14px', borderRadius: '10px', border: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: theme.textSec, fontWeight: '700' }}>Bônus Acumulados</div>
            <div style={{ fontSize: '14px', fontWeight: '900', color: '#d97706', marginTop: '1px' }}>
              🎁 {totalMesesResgatados} Mês(es)
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DE FERRAMENTAS ERP (BUSCA E FILTROS) */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '240px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <FiSearch size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: theme.textSec }} />
            <input 
              type="text" 
              placeholder="Pesquisar por referência, ID ou plano..."
              value={buscaTermo}
              onChange={(e) => setBuscaTermo(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 34px',
                borderRadius: '10px',
                border: `1px solid ${theme.border}`,
                background: theme.inputBg || theme.bgApp,
                color: theme.textMain,
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* FILTROS DE TIPO */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button 
            type="button"
            onClick={() => setFiltroTipo("todos")}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: `1px solid ${filtroTipo === 'todos' ? '#2563eb' : theme.border}`,
              background: filtroTipo === 'todos' ? '#2563eb' : (isModoNoturno ? theme.bgApp : '#f8fafc'),
              color: filtroTipo === 'todos' ? '#fff' : theme.textSec,
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Todos ({historico.length})
          </button>
          <button 
            type="button"
            onClick={() => setFiltroTipo("pagamento")}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: `1px solid ${filtroTipo === 'pagamento' ? '#2563eb' : theme.border}`,
              background: filtroTipo === 'pagamento' ? '#2563eb' : (isModoNoturno ? theme.bgApp : '#f8fafc'),
              color: filtroTipo === 'pagamento' ? '#fff' : theme.textSec,
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Confirmados
          </button>
          <button 
            type="button"
            onClick={() => setFiltroTipo("analise")}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: `1px solid ${filtroTipo === 'analise' ? '#d97706' : theme.border}`,
              background: filtroTipo === 'analise' ? '#d97706' : (isModoNoturno ? theme.bgApp : '#f8fafc'),
              color: filtroTipo === 'analise' ? '#fff' : theme.textSec,
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Em Análise
          </button>
          <button 
            type="button"
            onClick={() => setFiltroTipo("upgrade")}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: `1px solid ${filtroTipo === 'upgrade' ? '#3b82f6' : theme.border}`,
              background: filtroTipo === 'upgrade' ? '#3b82f6' : (isModoNoturno ? theme.bgApp : '#f8fafc'),
              color: filtroTipo === 'upgrade' ? '#fff' : theme.textSec,
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Upgrades 🚀
          </button>
          <button 
            type="button"
            onClick={() => setFiltroTipo("recompensa")}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: `1px solid ${filtroTipo === 'recompensa' ? '#10b981' : theme.border}`,
              background: filtroTipo === 'recompensa' ? '#10b981' : (isModoNoturno ? theme.bgApp : '#f8fafc'),
              color: filtroTipo === 'recompensa' ? '#fff' : theme.textSec,
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Recompensas 🎁
          </button>
        </div>
      </div>

      {/* TABELA DE EXTRATO CORPORATIVO */}
      <div style={{ overflowX: 'auto', borderRadius: '12px', border: `1px solid ${theme.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: isModoNoturno ? '#1e293b' : '#f1f5f9', borderBottom: `2px solid ${theme.border}`, color: theme.textSec, fontSize: '11px', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 16px' }}>NSU / ID Transação</th>
              <th style={{ padding: '12px 16px' }}>Competência / Plano</th>
              <th style={{ padding: '12px 16px' }}>Data da Operação</th>
              <th style={{ padding: '12px 16px' }}>Valor</th>
              <th style={{ padding: '12px 16px' }}>Comprovante</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Status Oficial</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: theme.textSec, fontSize: '13px' }}>
                  Carregando extrato financeiro...
                </td>
              </tr>
            ) : historicoFiltrado.length > 0 ? (
              historicoFiltrado.map((pag: any, index: number) => {
                const tsData = pag.createdAt?.seconds || pag.tsAssinaturaLojista?.seconds || pag.tsDataSolicitacao?.seconds;
                const dataPagamento = tsData
                  ? new Date(tsData * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '---';

                const status = pag.dsStatusPagamentoLojista || 'Pendente';
                const isRecompensa = status === 'Recompensa';
                const isAnalise = status.toLowerCase().includes('análise') || status.toLowerCase().includes('analise');
                const isAprovado = status === 'Aprovado' || status === 'Pago' || status === 'Ativação' || isRecompensa;
                const isUpgradeItem = pag.tipoRegistro === "upgrade" || pag.origem === "up_upgrade";
                const transacaoId = pag.id || pag.idDoc || `TX-${index}`;

                return (
                  <tr key={transacaoId} style={{ borderBottom: `1px solid ${theme.border}`, transition: 'background 0.2s' }}>
                    {/* ID / NSU Corporativo */}
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '12px', color: theme.textSec, fontWeight: '700' }}>
                      #{transacaoId.slice(-12).toUpperCase()}
                    </td>

                    {/* Competência e Plano */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '800', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isUpgradeItem && <FiTrendingUp size={14} color="#3b82f6" />}
                        {pag.dsMesReferencia || 'Ciclo de Assinatura'}
                      </div>
                      {pag.dsPlanoLojista && (
                        <div style={{ fontSize: '11px', color: theme.textSec, fontWeight: '700', marginTop: '2px' }}>
                          Plano: <span style={{ color: '#2563eb' }}>{pag.dsPlanoLojista}</span>
                        </div>
                      )}
                    </td>

                    {/* Data e Hora */}
                    <td style={{ padding: '14px 16px', color: theme.textSec, fontSize: '12px' }}>
                      {dataPagamento}
                    </td>

                    {/* Valor */}
                    <td style={{ padding: '14px 16px', fontWeight: '900', color: isRecompensa ? '#10b981' : theme.textMain }}>
                      {isRecompensa ? "🎁 1 Mês Bônus" : `R$ ${Number(pag.vlAssinaturaLojista || 0).toFixed(2)}`}
                    </td>

                    {/* Botão Ver Comprovante */}
                    <td style={{ padding: '14px 16px' }}>
                      {pag.dsUrlComprovante ? (
                        <button
                          type="button"
                          onClick={() => setComprovanteModalUrl(pag.dsUrlComprovante)}
                          style={{
                            background: isModoNoturno ? '#334155' : '#e2e8f0',
                            color: theme.textMain,
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <FiImage size={12} /> Ver Anexo
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: theme.textSec }}>---</span>
                      )}
                    </td>

                    {/* Badge de Status Estilo ERP */}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <span style={{
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        padding: '5px 12px',
                        borderRadius: '8px',
                        fontWeight: '900',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: isRecompensa ? (isModoNoturno ? '#064e3b' : '#ecfdf5') : (isAprovado ? (isModoNoturno ? '#064e3b' : '#dcfce7') : (isAnalise ? (isModoNoturno ? '#78350f' : '#fef3c7') : (isModoNoturno ? '#7f1d1d' : '#fee2e2'))),
                        color: isRecompensa ? '#10b981' : (isAprovado ? (isModoNoturno ? '#6ee7b7' : '#166534') : (isAnalise ? (isModoNoturno ? '#fcd34d' : '#92400e') : (isModoNoturno ? '#f87171' : '#991b1b')))
                      }}>
                        {isRecompensa && <FiGift size={12} />}
                        {isAprovado && !isRecompensa && <FiCheckCircle size={12} />}
                        {isAnalise && <FiClock size={12} />}
                        {!isAprovado && !isAnalise && <FiClock size={12} />}
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: theme.textSec, fontSize: '13px' }}>
                  Nenhum lançamento encontrado com os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* RODAPÉ DE SEGURANÇA E CONFORMIDADE */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', fontSize: '11px', color: theme.textSec }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FiShield size={14} color="#059669" />
          <span>Extrato autenticado digitalmente para fins de auditoria corporativa.</span>
        </div>
        <div>
          Exibindo {historicoFiltrado.length} de {historico.length} registro(s)
        </div>
      </div>

    </section>
  );
}