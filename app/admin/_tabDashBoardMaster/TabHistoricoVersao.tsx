"use client";

import React, { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  deleteField,
  query,
  orderBy,
  serverTimestamp,
  limit,
  startAfter,
  getDocs,
  getDoc
} from "firebase/firestore";
import { FiGitCommit, FiCheckCircle, FiSave, FiSearch, FiTrash2, FiClock, FiTag, FiCalendar, FiEye, FiEyeOff, FiChevronDown, FiDatabase, FiPlusCircle, FiList, FiSliders } from "react-icons/fi";
import { useTheme } from "@/context/ThemeContext";

// Categorias e subpastas estruturadas do sistema para o select agrupado
const categoriasSistema = {
  "DASHBOARD MASTER": [
    "Dashboard Master",
    "TabAparenciaLandPage",
    "TabAssinaturas",
    "TabAvisos",
    "TabDenuncias",
    "TabFinanceiro",
    "TabHistoricoVersao",
    "TabPanorama",
    "TabPlanos.tsx"
  ],
  "DASHBOARD LOJISTA": [
    "TabCatalogo",
    "TabClientes",
    "TabDespesas",
    "TabDevolucoes",
    "TabFaturamentoCanais",
    "TabLucroReal",
    "TabPrecificacao",
    "TabRelatorioHistorico",
    "TabSazonalidade",
    "TabVendas"
  ],
  "ADMIN / CONFIG": [
    "Page",
    "AparenciaTab",
    "AssinaturaTab",
    "AtualizacoesTab",
    "BannerTab",
    "DadosLojaTab",
    "DadosPessoaisTab",
    "MensagensTab",
    "PagamentosTab",
    "SistemaTab"
  ],
  "ADMIN / DENUNCIAS": [
    "Page"
  ],
  "ADMIN / ESTOQUE": [
    "Page"
  ],
  "PRODUTOS": [
    "Page"
  ],
  "ADMIN / PEDIDOS ": [
    "Page",
    "TabCotarFrete",
    "TabDigital",
    "TabEmitirEtiquetas",
    "TabEntregaLocal",
    "TabLogisticaFrete",
    "TabPedidosConcluidos",
    "TabPedidosEnviados",
    "TabProntoPedidos",
    "TabRetiradaLoja",
    "TabSeparacaoImpressao",
    "TabTodosPedidos",
  ],
  "ADMIN": [
    "Page",
    "Layout",
    "Sidebar"
  ],
  "LOGIN": [
    "Page",
  ],
  "APP": [
    "Page",
    "Layout",
  ]
};

// Dicionário para traduzir nomes internos para termos amigáveis
const nomesAmigaveisModulo: { [key: string]: string } = {
  "DASHBOARD MASTER": "Painel Master",
  "DASHBOARD LOJISTA": "Painel do Lojista",
  "ADMIN / CONFIG": "Configurações do Admin",
  "ADMIN / DENUNCIAS": "Denúncias",
  "ADMIN / ESTOQUE": "Estoque",
  "PRODUTOS": "Produtos",
  "ADMIN / PEDIDOS ": "Gerenciamento de Pedidos",
  "ADMIN": "Administração",
  "LOGIN": "Acesso e Login",
  "APP": "Aplicativo",

  "Dashboard Master": "Visão Geral Master",
  "TabAparenciaLandPage": "Aparência da Landing Page",
  "TabAssinaturas": "Assinaturas e Planos",
  "TabAvisos": "Avisos do Sistema",
  "TabDenuncias": "Central de Denúncias",
  "TabFinanceiro": "Painel Financeiro",
  "TabHistoricoVersao": "Histórico de Versões",
  "TabPanorama": "Panorama Geral",
  "TabPlanos.tsx": "Gerenciamento de Planos",

  "TabCatalogo": "Catálogo de Produtos",
  "TabClientes": "Gestão de Clientes",
  "TabDespesas": "Controle de Despesas",
  "TabDevolucoes": "Controle de Devoluções",
  "TabFaturamentoCanais": "Faturamento por Canais",
  "TabLucroReal": "Lucro Real",
  "TabPrecificacao": "Precificação",
  "TabRelatorioHistorico": "Relatório Histórico",
  "TabSazonalidade": "Sazonalidade",
  "TabVendas": "Gestão de Vendas",
  "Page": "Página Principal",
  "Layout": "Layout do Sistema",
  "Sidebar": "Menu Lateral",

  "AparenciaTab": "Configurações / Aparência",
  "AssinaturaTab": "Configurações / Assinatura",
  "AtualizacoesTab": "Configurações / Atualizações",
  "BannerTab": "Configurações / Banners",
  "DadosLojaTab": "Configurações / Dados da Loja",
  "DadosPessoaisTab": "Configurações / Dados Pessoais",
  "MensagensTab": "Configurações / Mensagens",
  "PagamentosTab": "Configurações / Pagamentos",
  "SistemaTab": "Configurações / Sistema - Cupons",

  "TabCotarFrete": "Pedidos / Cotação de Frete",
  "TabDigital": "Pedidos / Digital",
  "TabEmitirEtiquetas": "Pedidos / Etiquetas",
  "TabEntregaLocal": "Pedidos / Entrega Local",
  "TabLogisticaFrete": "Pedidos / Logística e Frete",
  "TabPedidosConcluidos": "Pedidos / Concluídos",
  "TabPedidosEnviados": "Pedidos / Enviados",
  "TabProntoPedidos": "Pedidos Prontos",
  "TabRetiradaLoja": "Pedidos / Retirada",
  "TabSeparacaoImpressao": "Separação e Impressão",
  "TabTodosPedidos": "Todos os Pedidos",
};

const formatarNomeModuloParaLojista = (dsPaginaAfetada: string) => {
  if (!dsPaginaAfetada) return "Sistema";
  let resultado = dsPaginaAfetada;
  const chavesOrdenadas = Object.keys(nomesAmigaveisModulo).sort((a, b) => b.length - a.length);
  for (const interno of chavesOrdenadas) {
    const amigavel = nomesAmigaveisModulo[interno];
    resultado = resultado.split(interno).join(amigavel);
  }
  return resultado;
};

interface VersaoItem {
  id?: string;
  nrVersaoSistemaSistema: string;
  tsDataAtualizacao: string;
  dsPaginaAfetada: string;
  dsDescricao: string[];
  isExibirLogista?: boolean;
  nrVersaoSchemaSistema?: number;
  createdAt?: any;
}

export default function TabHistoricoVersao() {
  const { theme, isModoNoturno } = useTheme();

  const [abaAtiva, setAbaAtiva] = useState<"cadastrar" | "historico">("cadastrar");
  const [versoes, setVersoes] = useState<VersaoItem[]>([]);
  const [versaoAtivaGlobal, setVersaoAtivaGlobal] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  // Modal de detalhes
  const [versaoSelecionada, setVersaoSelecionada] = useState<VersaoItem | null>(null);

  // Novo estado para controlar o tipo de incremento automático
  const [tipoMudanca, setTipoMudanca] = useState<'patch' | 'minor' | 'major'>('patch');

  const ITENS_POR_PAGINA = 5;

  const [novaVersao, setNovaVersao] = useState({
    ano: new Date().getFullYear().toString().slice(-2),
    major: "0",
    minor: "0",
    patch: "0",
    schemaCode: 2,
    data: new Date().toISOString().split('T')[0],
    tipo: "DASHBOARD MASTER > Dashboard Master",
    mudancas: "",
    isExibirLogista: false
  });

  // Função para calcular a próxima versão com base na última cadastrada
  const calcularProximaVersao = (versaoAnterior: string, tipo: 'patch' | 'minor' | 'major', schemaAnterior: number) => {
    const partes = (versaoAnterior || "26.0.0.0").split('.').map(Number);
    const ano = new Date().getFullYear().toString().slice(-2);
    let major = partes[1] || 0;
    let minor = partes[2] || 0;
    let patch = partes[3] || 0;
    let novoSchema = schemaAnterior || 2;

    if (tipo === 'major') {
      major += 1;
      minor = 0;
      patch = 0;
      novoSchema += 1;
    } else if (tipo === 'minor') {
      minor += 1;
      patch = 0;
    } else {
      patch += 1;
    }

    return {
      ano,
      major: major.toString(),
      minor: minor.toString(),
      patch: patch.toString(),
      schemaCode: novoSchema
    };
  };

  // Buscar última versão ao carregar para auto-preencher
  useEffect(() => {
    const buscarUltimaVersaoParaSugestao = async () => {
      try {
        const q = query(collection(db, "configuracoes", "sistema", "historicoVersoes"), orderBy("nrVersaoSistemaSistema", "desc"), limit(1));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const dadosUltima = snap.docs[0].data();
          const ultimaVersaoStr = dadosUltima.nrVersaoSistemaSistema || "26.0.0.0";
          const ultimoSchema = dadosUltima.nrVersaoSchemaSistema || 2;

          const calculada = calcularProximaVersao(ultimaVersaoStr, tipoMudanca, ultimoSchema);
          setNovaVersao(prev => ({
            ...prev,
            ...calculada
          }));
        }
      } catch (e) {
        console.error("Erro ao buscar sugestão de versão:", e);
      }
    };
    buscarUltimaVersaoParaSugestao();
  }, [tipoMudanca]);

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, "configuracoes", "sistema"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.dsVersaoSistema) {
          setVersaoAtivaGlobal(data.dsVersaoSistema);
        } else if (data.historicoVersoes?.nrVersaoSistemaSistema) {
          setVersaoAtivaGlobal(data.historicoVersoes.nrVersaoSistemaSistema);
        }
      }
    });

    return () => unsubConfig();
  }, []);

  const carregarHistoricoInicial = async () => {
    try {
      const q = query(
        collection(db, "configuracoes", "sistema", "historicoVersoes"),
        orderBy("nrVersaoSistemaSistema", "desc"),
        limit(ITENS_POR_PAGINA)
      );

      const snapshot = await getDocs(q);
      const lista: VersaoItem[] = [];

      snapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        if (dados) {
          lista.push({
            id: docSnap.id,
            nrVersaoSistemaSistema: dados.nrVersaoSistemaSistema || dados.dsVersaoSistema || "0.0.0",
            tsDataAtualizacao: dados.tsDataAtualizacao || "",
            dsPaginaAfetada: dados.dsPaginaAfetada || "",
            dsDescricao: Array.isArray(dados.dsDescricao) ? dados.dsDescricao : [],
            isExibirLogista: !!dados.isExibirLogista,
            nrVersaoSchemaSistema: dados.nrVersaoSchemaSistema || dados.versaoSchema || 0,
            createdAt: dados.createdAt
          } as VersaoItem);
        }
      });

      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === ITENS_POR_PAGINA);
      setVersoes(lista);
    } catch (error) {
      console.error("Erro ao carregar histórico paginado:", error);
    }
  };

  useEffect(() => {
    carregarHistoricoInicial();
  }, []);

  const carregarMaisVersoes = async () => {
    if (!lastVisible || loadingMore) return;
    setLoadingMore(true);

    try {
      const q = query(
        collection(db, "configuracoes", "sistema", "historicoVersoes"),
        orderBy("nrVersaoSistemaSistema", "desc"),
        startAfter(lastVisible),
        limit(ITENS_POR_PAGINA)
      );

      const snapshot = await getDocs(q);
      const lista: VersaoItem[] = [];

      snapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        if (dados) {
          lista.push({
            id: docSnap.id,
            nrVersaoSistemaSistema: dados.nrVersaoSistemaSistema || dados.dsVersaoSistema || "0.0.0",
            tsDataAtualizacao: dados.tsDataAtualizacao || "",
            dsPaginaAfetada: dados.dsPaginaAfetada || "",
            dsDescricao: Array.isArray(dados.dsDescricao) ? dados.dsDescricao : [],
            isExibirLogista: !!dados.isExibirLogista,
            nrVersaoSchemaSistema: dados.nrVersaoSchemaSistema || dados.versaoSchema || 0,
            createdAt: dados.createdAt
          } as VersaoItem);
        }
      });

      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === ITENS_POR_PAGINA);
      setVersoes(prev => [...prev, ...lista]);
    } catch (error) {
      console.error("Erro ao carregar mais versões:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const formatarDataBR = (dataIso: string) => {
    if (!dataIso) return "";
    const partes = dataIso.split("-");
    if (partes.length !== 3) return dataIso;
    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`;
  };

  const salvarVersao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaVersao.mudancas) {
      alert("Preencha pelo menos uma mudança.");
      return;
    }

    setLoading(true);
    try {
      const versaoId = `${novaVersao.ano}.${novaVersao.major}.${novaVersao.minor}.${novaVersao.patch}`;
      const schemaNum = Number(novaVersao.schemaCode) || 0;

      const versaoRef = doc(db, "configuracoes", "sistema", "historicoVersoes", versaoId);
      const docExistente = await getDoc(versaoRef);
      if (docExistente.exists()) {
        alert(`Erro: A versão ${versaoId} já existe no histórico! Escolha outro número.`);
        setLoading(false);
        return;
      }

      const dadosVersao: VersaoItem = {
        nrVersaoSistemaSistema: versaoId,
        tsDataAtualizacao: formatarDataBR(novaVersao.data),
        dsPaginaAfetada: novaVersao.tipo,
        dsDescricao: novaVersao.mudancas.split("\n").filter(m => m.trim() !== ""),
        isExibirLogista: novaVersao.isExibirLogista,
        nrVersaoSchemaSistema: schemaNum,
        createdAt: serverTimestamp()
      };

      await setDoc(versaoRef, dadosVersao);

      const configRef = doc(db, "configuracoes", "sistema");
      await setDoc(configRef, {
        dsVersaoSistema: versaoId,
        versaoSchemaAtual: schemaNum
      }, { merge: true });

      alert(`Versão ${versaoId} (Schema ${schemaNum}) cadastrada e definida como oficial com sucesso!`);

      setNovaVersao(prev => ({
        ...prev,
        patch: (parseInt(prev.patch || "0") + 1).toString(),
        mudancas: "",
        isExibirLogista: false
      }));

      carregarHistoricoInicial();
      setAbaAtiva("historico");
    } catch (error) {
      console.error("Erro ao salvar versão:", error);
      alert("Erro ao salvar a versão no banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  const excluirVersao = async (versaoId: string) => {
    if (!confirm(`Deseja realmente excluir permanentemente o registro da versão ${versaoId}?`)) return;
    try {
      await deleteDoc(doc(db, "configuracoes", "sistema", "historicoVersoes", versaoId));

      if (versaoAtivaGlobal === versaoId) {
        const configRef = doc(db, "configuracoes", "sistema");
        await updateDoc(configRef, {
          dsVersaoSistema: deleteField(),
          versaoSchemaAtual: deleteField()
        });
      }

      alert("Versão excluída com sucesso!");
      carregarHistoricoInicial();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Não foi possível excluir a versão.");
    }
  };

  const versoesFiltradas = useMemo(() => {
    if (!busca.trim()) return versoes;
    const termo = busca.toLowerCase();
    return versoes.filter(v =>
      v.nrVersaoSistemaSistema?.toLowerCase().includes(termo) ||
      v.dsPaginaAfetada?.toLowerCase().includes(termo) ||
      v.dsDescricao?.some(d => d.toLowerCase().includes(termo))
    );
  }, [versoes, busca]);

  return (
    <section style={styles.wrapper}>

      {/* ABAS INTERNAS */}
      <div style={styles.subTabsHeader}>
        <button
          onClick={() => setAbaAtiva("cadastrar")}
          style={abaAtiva === "cadastrar" ? { ...styles.subTabBtnActive, background: theme.primary, color: '#fff' } : { ...styles.subTabBtn, background: isModoNoturno ? theme.bgApp : '#f1f5f9', color: theme.textSec }}
        >
          <FiPlusCircle size={14} /> Cadastrar Nova Versão
        </button>
        <button
          onClick={() => setAbaAtiva("historico")}
          style={abaAtiva === "historico" ? { ...styles.subTabBtnActive, background: theme.primary, color: '#fff' } : { ...styles.subTabBtn, background: isModoNoturno ? theme.bgApp : '#f1f5f9', color: theme.textSec }}
        >
          <FiList size={14} /> Histórico de Atualizações ({versoes.length})
        </button>
      </div>

      {/* MODAL DE DETALHES */}
      {versaoSelecionada && (
        <div style={styles.overlayMaster} onClick={() => setVersaoSelecionada(null)}>
          <div style={{ ...styles.modalVisualizar, background: theme.bgCard, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
            <div style={{ ...styles.modalVisHeader, color: theme.primary }}>
              <FiGitCommit /> DETALHES DA VERSÃO v{versaoSelecionada.nrVersaoSistemaSistema}
            </div>
            <div style={styles.historicoScroll}>
              <div style={{ ...styles.modalVisSub, color: theme.textSec, marginBottom: '10px' }}>
                <span>DATA: {versaoSelecionada.tsDataAtualizacao}</span>
                {versaoSelecionada.nrVersaoSchemaSistema !== undefined && (
                  <span style={{ color: '#d97706', fontWeight: 'bold' }}>SCHEMA v{versaoSelecionada.nrVersaoSchemaSistema}</span>
                )}
              </div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', color: theme.primary, marginBottom: '15px', textTransform: 'uppercase' }}>
                MÓDULO: {formatarNomeModuloParaLojista(versaoSelecionada.dsPaginaAfetada)}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {versaoSelecionada.dsDescricao?.map((desc: string, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: theme.textMain, fontSize: '13px' }}>
                    <FiCheckCircle size={14} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              style={{ ...styles.modalVisBtn, background: isModoNoturno ? theme.bgApp : '#0f172a', color: theme.textMain, border: `1px solid ${theme.border}` }}
              onClick={() => setVersaoSelecionada(null)}
            >
              FECHAR
            </button>
          </div>
        </div>
      )}

      {/* ABA 1: CADASTRAR NOVA VERSÃO */}
      {abaAtiva === "cadastrar" && (
        <div style={{ ...styles.cardCadastro, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <div style={styles.cardHeaderTitle}>
            <FiGitCommit size={20} color={theme.primary} />
            <h3 style={{ ...styles.h3, color: theme.textMain }}>Cadastrar Nova Versão do Sistema</h3>
          </div>
          <p style={{ ...styles.helpText, color: theme.textSec }}>
            O sistema gera automaticamente o próximo número de versão e schema com base no seu último lançamento.
          </p>

          {/* SELETOR DO TIPO DE MUDANÇA */}
          <div style={{ ...styles.tipoMudancaBox, background: isModoNoturno ? theme.bgApp : '#f8fafc', border: `1px solid ${theme.border}` }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textSec, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FiSliders size={14} /> Tipo de Atualização:
            </span>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setTipoMudanca('patch')}
                style={tipoMudanca === 'patch' ? { ...styles.badgeTipoActive, background: theme.primary, color: '#fff' } : { ...styles.badgeTipo, background: isModoNoturno ? theme.bgCard : '#fff', color: theme.textSec, border: `1px solid ${theme.border}` }}
              >
                Patch (Correção)
              </button>
              <button
                type="button"
                onClick={() => setTipoMudanca('minor')}
                style={tipoMudanca === 'minor' ? { ...styles.badgeTipoActive, background: theme.primary, color: '#fff' } : { ...styles.badgeTipo, background: isModoNoturno ? theme.bgCard : '#fff', color: theme.textSec, border: `1px solid ${theme.border}` }}
              >
                Minor (Nova Função)
              </button>
              <button
                type="button"
                onClick={() => setTipoMudanca('major')}
                style={tipoMudanca === 'major' ? { ...styles.badgeTipoActive, background: theme.primary, color: '#fff' } : { ...styles.badgeTipo, background: isModoNoturno ? theme.bgCard : '#fff', color: theme.textSec, border: `1px solid ${theme.border}` }}
              >
                Major (Mudança Estrutural)
              </button>
            </div>
          </div>

          {/* DESCRIÇÃO DINÂMICA DO QUE O BOTÃO FAZ */}
          <div style={{ padding: '10px', marginBottom: '20px', fontSize: '12px', color: theme.textSec, fontStyle: 'italic', borderLeft: `3px solid ${theme.primary}` }}>
            {tipoMudanca === 'patch' && "Patch: Correções de bugs e ajustes de performance. Não altera a estrutura do banco e é transparente ao lojista."}
            {tipoMudanca === 'minor' && "Minor: Adição de novas ferramentas ou menus. Sem impacto no banco de dados, mas altera o fluxo de uso do lojista."}
            {tipoMudanca === 'major' && "Major: Mudanças estruturais profundas. Exige migração de dados e altera o Schema do banco de dados."}
          </div>

          <form onSubmit={salvarVersao} style={styles.formGrid}>
            <div style={styles.inputRowDesktop}>

              <div style={styles.inputGroup}>
                <label style={{ ...styles.label, color: theme.textSec }}>
                  <FiTag size={12} /> Composição Automática
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="text"
                    value={novaVersao.ano}
                    readOnly
                    style={{ ...styles.input, width: '45px', textAlign: 'center', background: isModoNoturno ? theme.bgApp : '#f1f5f9', fontWeight: 'bold', color: theme.textMain, border: `1px solid ${theme.border}` }}
                  />
                  <span style={{ fontWeight: 'bold', color: theme.textSec }}>.</span>
                  <input
                    type="number"
                    value={novaVersao.major}
                    onChange={e => setNovaVersao({ ...novaVersao, major: e.target.value })}
                    style={{ ...styles.input, width: '55px', textAlign: 'center', background: theme.inputBg || theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}` }}
                    required
                  />
                  <span style={{ fontWeight: 'bold', color: theme.textSec }}>.</span>
                  <input
                    type="number"
                    value={novaVersao.minor}
                    onChange={e => setNovaVersao({ ...novaVersao, minor: e.target.value })}
                    style={{ ...styles.input, width: '55px', textAlign: 'center', background: theme.inputBg || theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}` }}
                    required
                  />
                  <span style={{ fontWeight: 'bold', color: theme.textSec }}>.</span>
                  <input
                    type="number"
                    value={novaVersao.patch}
                    onChange={e => setNovaVersao({ ...novaVersao, patch: e.target.value })}
                    style={{ ...styles.input, width: '55px', textAlign: 'center', background: theme.inputBg || theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}` }}
                    required
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={{ ...styles.label, color: theme.textSec }}>
                  <FiDatabase size={12} /> Versão do Schema
                </label>
                <input
                  type="number"
                  min="0"
                  value={novaVersao.schemaCode}
                  onChange={e => setNovaVersao({ ...novaVersao, schemaCode: Number(e.target.value) })}
                  style={{ ...styles.input, background: theme.inputBg || theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}` }}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={{ ...styles.label, color: theme.textSec }}>
                  <FiCalendar size={12} /> Data da Versão
                </label>
                <input
                  type="date"
                  value={novaVersao.data}
                  onChange={e => setNovaVersao({ ...novaVersao, data: e.target.value })}
                  style={{ ...styles.input, background: theme.inputBg || theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}` }}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={{ ...styles.label, color: theme.textSec }}>Módulo Afetado</label>
                <select
                  value={novaVersao.tipo}
                  onChange={e => setNovaVersao({ ...novaVersao, tipo: e.target.value })}
                  style={{ ...styles.select, background: theme.inputBg || theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}` }}
                >
                  {Object.entries(categoriasSistema).map(([categoria, paginas]) => (
                    <optgroup key={categoria} label={categoria} style={{ background: theme.bgCard, color: theme.textMain }}>
                      {paginas.map((pagina) => {
                        const valorFormatado = `${categoria} > ${pagina}`;
                        return (
                          <option key={pagina} value={valorFormatado}>
                            {pagina}
                          </option>
                        );
                      })}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={{ ...styles.label, color: theme.textSec }}>O que mudou? (Uma alteração por linha)</label>
              <textarea
                placeholder={"- Adicionado suporte ao novo painel financeiro\n- Correção de bugs no fluxo de pedidos"}
                value={novaVersao.mudancas}
                onChange={e => setNovaVersao({ ...novaVersao, mudancas: e.target.value })}
                style={{ ...styles.textarea, background: theme.inputBg || theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}` }}
                required
              />
            </div>

            <div style={{ ...styles.checkboxContainer, background: isModoNoturno ? theme.bgApp : '#f8fafc', border: `1px solid ${theme.border}` }}>
              <label style={{ ...styles.checkboxLabel, color: theme.textMain }}>
                <input
                  type="checkbox"
                  checked={novaVersao.isExibirLogista}
                  onChange={e => setNovaVersao({ ...novaVersao, isExibirLogista: e.target.checked })}
                  style={styles.checkboxInput}
                />
                <span>Exibir esta atualização publicamente no painel do Lojista?</span>
              </label>
            </div>

            <button type="submit" style={{ ...styles.btnSalvar, background: theme.primary }} disabled={loading}>
              <FiSave size={16} /> {loading ? "Salvando versão..." : "Salvar e Publicar Versão"}
            </button>
          </form>
        </div>
      )}

      {/* ABA 2: HISTÓRICO DE ATUALIZAÇÕES */}
      {abaAtiva === "historico" && (
        <div style={styles.timelineContainer}>
          <div style={{ ...styles.searchBox, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
            <FiSearch color={theme.textSec} size={18} />
            <input
              type="text"
              placeholder="Pesquisar por número da versão, módulo ou alteração..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{ ...styles.searchInput, color: theme.textMain }}
            />
            {busca && (
              <button onClick={() => setBusca("")} style={{ ...styles.clearSearchBtn, background: isModoNoturno ? '#334155' : '#f1f5f9', color: theme.textSec }}>
                Limpar
              </button>
            )}
          </div>

          <div style={styles.listHeaderSection}>
            <h4 style={{ ...styles.subTitleHeading, color: theme.textMain }}>Histórico de Atualizações Publicadas</h4>
            <span style={{ ...styles.badgeCount, background: isModoNoturno ? '#334155' : '#e2e8f0', color: theme.textSec }}>{versoesFiltradas.length} versões listadas</span>
          </div>

          {versoesFiltradas.length === 0 ? (
            <div style={{ ...styles.emptyContainer, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
              <FiClock size={32} color={theme.textSec} />
              <p style={{ ...styles.emptyText, color: theme.textSec }}>Nenhuma versão encontrada no histórico.</p>
            </div>
          ) : (
            <div style={styles.listGrid}>
              {versoesFiltradas.map((item) => {
                const versaoAtualItem = item.nrVersaoSistemaSistema;
                const isAtiva = versaoAtivaGlobal === versaoAtualItem;
                return (
                  <div
                    key={item.id || versaoAtualItem}
                    onClick={() => setVersaoSelecionada(item)}
                    style={{
                      ...styles.cardVersao,
                      cursor: 'pointer',
                      background: theme.bgCard,
                      borderColor: isAtiva ? theme.primary : theme.border,
                      boxShadow: isAtiva ? `0 4px 12px rgba(59, 130, 246, 0.08)` : '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={styles.versaoHeader}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ ...styles.versionIconBadge, background: isModoNoturno ? '#1e293b' : '#eff6ff' }}>
                          <FiGitCommit size={16} color={theme.primary} />
                          <span style={{ ...styles.tituloVersao, color: theme.primary }}>v{versaoAtualItem}</span>
                        </div>

                        {item.nrVersaoSchemaSistema !== undefined && (
                          <span style={styles.badgeSchema}>Schema v{item.nrVersaoSchemaSistema}</span>
                        )}

                        {isAtiva && (
                          <span style={styles.badgeOficial}>Versão Atual Ativa</span>
                        )}

                        {item.isExibirLogista ? (
                          <span style={styles.badgeVisivel}><FiEye size={12} /> Visível para Lojistas</span>
                        ) : (
                          <span style={{ ...styles.badgeOculto, background: isModoNoturno ? '#334155' : '#f1f5f9', color: theme.textSec }}><FiEyeOff size={12} /> Oculta</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ ...styles.dataVersao, color: theme.textSec }}>{item.tsDataAtualizacao}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            excluirVersao(versaoAtualItem);
                          }}
                          style={styles.btnExcluir}
                          title="Excluir Versão"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <span style={{ ...styles.tipoVersao, color: theme.textSec }}>{formatarNomeModuloParaLojista(item.dsPaginaAfetada)}</span>

                    <ul style={styles.listaMudancas}>
                      {item.dsDescricao?.map((mudanca: string, idx: number) => (
                        <li key={idx} style={{ ...styles.itemMudanca, color: theme.textMain }}>
                          <FiCheckCircle size={14} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <span>{mudanca}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}

          {!busca && hasMore && versoes.length > 0 && (
            <button
              onClick={carregarMaisVersoes}
              disabled={loadingMore}
              style={{ ...styles.btnCarregarMais, background: isModoNoturno ? theme.bgApp : '#f1f5f9', color: theme.textMain, border: `1px solid ${theme.border}` }}
            >
              {loadingMore ? "Carregando mais..." : <>Carregar mais versões antigas <FiChevronDown /></>}
            </button>
          )}
        </div>
      )}

    </section>
  );
}

const styles: any = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%' },
  subTabsHeader: { display: 'flex', gap: '10px', marginBottom: '5px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '15px' },
  subTabBtn: { padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' },
  subTabBtnActive: { padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' },
  tipoMudancaBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '10px', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' },
  badgeTipo: { padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', border: 'none', transition: 'all 0.2s' },
  badgeTipoActive: { padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' },
  searchInput: { border: 'none', outline: 'none', width: '100%', fontSize: '14px', background: 'transparent' },
  clearSearchBtn: { border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' },
  cardCadastro: { padding: '28px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
  cardHeaderTitle: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' },
  h3: { fontSize: "15px", fontWeight: "800", textTransform: 'uppercase', letterSpacing: '0.3px' },
  helpText: { fontSize: '13px', marginBottom: '18px', lineHeight: '1.5' },
  formGrid: { display: 'flex', flexDirection: 'column', gap: '18px' },
  inputRowDesktop: { display: 'grid', gridTemplateColumns: '1.4fr 1.1fr 1fr 1.5fr', gap: '12px', alignItems: 'end' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px', letterSpacing: '0.4px', whiteSpace: 'nowrap' },
  input: { padding: '11px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  select: { padding: '11px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none', cursor: 'pointer', width: '100%', boxSizing: 'border-box' },
  textarea: { padding: '12px 14px', borderRadius: '8px', fontSize: '13px', height: '110px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5' },
  checkboxContainer: { display: 'flex', alignItems: 'center', padding: '12px 14px', borderRadius: '8px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  checkboxInput: { width: '16px', height: '16px', cursor: 'pointer' },
  btnSalvar: { color: '#fff', padding: '13px 22px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)' },
  timelineContainer: { display: 'flex', flexDirection: 'column', gap: '15px' },
  listHeaderSection: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' },
  subTitleHeading: { fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px' },
  badgeCount: { fontSize: '12px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' },
  listGrid: { display: 'flex', flexDirection: 'column', gap: '15px' },
  cardVersao: { padding: '22px', borderRadius: '14px', border: '1px solid', transition: 'all 0.2s' },
  versaoHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '10px' },
  versionIconBadge: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px', borderRadius: '8px' },
  tituloVersao: { fontSize: '14px', fontWeight: '800' },
  badgeSchema: { fontSize: '10px', fontWeight: '700', background: '#fef3c7', color: '#d97706', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' },
  badgeOficial: { fontSize: '10px', fontWeight: '700', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' },
  badgeVisivel: { fontSize: '10px', fontWeight: '700', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' },
  badgeOculto: { fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' },
  dataVersao: { fontSize: '12px', fontWeight: '600' },
  tipoVersao: { fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '14px', letterSpacing: '0.4px' },
  listaMudancas: { listStyle: 'none', padding: '0', margin: '0', display: 'flex', flexDirection: 'column', gap: '8px' },
  itemMudanca: { display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', lineHeight: '1.4' },
  emptyContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', borderRadius: '12px', gap: '10px' },
  emptyText: { textAlign: 'center', fontSize: '13px' },
  btnExcluir: { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btnCarregarMais: { padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' },
  overlayMaster: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  modalVisualizar: { padding: '30px', borderRadius: '24px', maxWidth: '600px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' },
  modalVisHeader: { fontSize: '14px', fontWeight: '900', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase' },
  historicoScroll: { maxHeight: '400px', overflowY: 'auto', paddingRight: '10px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' },
  modalVisSub: { display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '800' },
  modalVisBtn: { width: '100%', padding: '15px', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }
};
// Este componente (TabHistoricoVersao.tsx) é o painel de gerenciamento e controle do histórico de versões do sistema.
// Ele permite que o administrador Master cadastre novas tags de atualização (composição de versão semântica),
// defina a versão do Schema do banco de dados, selecione o módulo/área afetada, descreva as alterações linha a linha
// e decida se a atualização ficará visível publicamente no painel dos lojistas.
// Além disso, oferece ferramentas de busca, paginação e exclusão de registros históricos diretamente integradas ao Firestore.

// Este componente (TabHistoricoVersao.tsx) é o painel de gerenciamento e controle do histórico de versões do sistema.
// Ele permite que o administrador Master cadastre novas tags de atualização (composição de versão semântica),
// defina a versão do Schema do banco de dados, selecione o módulo/área afetada, descreva as alterações linha a linha
// e decida se a atualização ficará visível publicamente no painel dos lojistas.
// Além disso, oferece ferramentas de busca, paginação e exclusão de registros históricos diretamente integradas ao Firestore.
// atualizar todo o sistema e lancar em qual pagina foi feito, gerar uma nova sequencia da versao do
// sistema, depois de o DEPLOY, os logista vao receber essa nova atualizaçao e exibir a versão recente.
// Este componente (TabHistoricoVersao.tsx) é o painel de gerenciamento e controle do histórico de versões do sistema.
// Ele permite que o administrador Master cadastre novas tags de atualização (composição de versão semântica),
// defina a versão do Schema do banco de dados, selecione o módulo/área afetada, descreva as alterações linha a linha
// e decida se a atualização ficará visível publicamente no painel dos lojistas.
// Além disso, oferece ferramentas de busca, paginação e exclusão de registros históricos diretamente integradas ao Firestore.