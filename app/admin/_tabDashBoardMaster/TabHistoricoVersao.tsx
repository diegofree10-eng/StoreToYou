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
  getDocs
} from "firebase/firestore";
import { FiGitCommit, FiCheckCircle, FiSave, FiSearch, FiTrash2, FiClock, FiTag, FiCalendar, FiEye, FiEyeOff, FiChevronDown, FiDatabase } from "react-icons/fi";

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

// Dicionário completo e abrangente para traduzir todos os nomes internos para termos amigáveis ao lojista
const nomesAmigaveisModulo: { [key: string]: string } = {
  // Categorias
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

  // Itens Master
  "Dashboard Master": "Visão Geral Master",
  "TabAparenciaLandPage": "Aparência da Landing Page",
  "TabAssinaturas": "Assinaturas e Planos",
  "TabAvisos": "Avisos do Sistema",
  "TabDenuncias": "Central de Denúncias",
  "TabFinanceiro": "Painel Financeiro",
  "TabHistoricoVersao": "Histórico de Versões",
  "TabPanorama": "Panorama Geral",
  "TabPlanos.tsx": "Gerenciamento de Planos",

  // Itens Lojista
   
  "TabCatalogo": "Catálogo de Produtos - DASHBOARD / Catalogo",
  "TabClientes": "Gestão de Clientes - DASHBOARD / Clientes",
  "TabDespesas": "Controle de Despesas - DASHBOARD / Despesas",
  "TabDevolucoes": "Controle de Devoluções - DASHBOARD / Devolucoes",
  "TabFaturamentoCanais": "Faturamento por Canais - DASHBOARD / Canais de Renda",
  "TabLucroReal": "Lucro Real - DASHBOARD / Lucro Real",
  "TabPrecificacao": "Precificação - DASHBOARD / Precificação",
  "TabRelatorioHistorico": "Relatório Histórico - DASHBOARD / Relatório Histórico",
  "TabSazonalidade": "Sazonalidade - DASHBOARD / Sazonalidade",
  "TabVendas": "Gestão de Vendas - DASHBOARD / Vendas",
  "Page": "Página Principal",
  "Layout": "Layout do Sistema",
  "Sidebar": "Menu Lateral",


  // Itens Admin / Config
  "AparenciaTab": "Configuraçoes / Aparência",
  "AssinaturaTab": "Configuraçoes / Assinatura",
  "AtualizacoesTab": "Configuraçoes / Atualizações",
  "BannerTab": "Configuraçoes / Banners",
  "DadosLojaTab": "Configuraçoes / Dados da Loja",
  "DadosPessoaisTab": "Configuraçoes / Dados Pessoais",
  "MensagensTab": "Configuraçoes / Mensagens",
  "PagamentosTab": "Configuraçoes / Pagamentos",
  "SistemaTab": "Configuraçoes / Sistema - Cupons",

  // Itens Pedidos
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

// Função para formatar o texto técnico da página afetada para o lojista de forma completa
const formatarNomeModuloParaLojista = (dsPaginaAfetada: string) => {
  if (!dsPaginaAfetada) return "Sistema";
  let resultado = dsPaginaAfetada;
  // Ordena as chaves por tamanho decrescente para evitar substituições parciais incorretas
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
  ano?: number;
  createdAt?: any;
}

export default function TabHistoricoVersao() {
  const [versoes, setVersoes] = useState<VersaoItem[]>([]);
  const [versaoAtivaGlobal, setVersaoAtivaGlobal] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  const ITENS_POR_PAGINA = 5;

  const [novaVersao, setNovaVersao] = useState({
    ano: "26",
    major: "0",
    minor: "0",
    patch: "0",
    schemaCode: 2,
    data: new Date().toISOString().split('T')[0],
    tipo: "DASHBOARD MASTER > Dashboard Master",
    mudancas: "",
    isExibirLogista: false
  });

  const getNomeColecao = (dataIso: string) => {
    const ano = dataIso ? new Date(dataIso).getFullYear() : new Date().getFullYear();
    return `historico_versoes_${ano}`;
  };

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
      const anoAtual = new Date().getFullYear();
      const nomeColecao = `historico_versoes_${anoAtual}`;
      
      const q = query(
        collection(db, nomeColecao), 
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
            ano: dados.ano || anoAtual,
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
      const anoAtual = new Date().getFullYear();
      const nomeColecao = `historico_versoes_${anoAtual}`;

      const q = query(
        collection(db, nomeColecao), 
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
            ano: dados.ano || anoAtual,
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
      const anoRegistro = new Date(novaVersao.data).getFullYear();
      const nomeColecaoAno = getNomeColecao(novaVersao.data);
      const schemaNum = Number(novaVersao.schemaCode) || 0;

      const dadosVersao: VersaoItem = {
        nrVersaoSistemaSistema: versaoId,
        tsDataAtualizacao: formatarDataBR(novaVersao.data),
        dsPaginaAfetada: novaVersao.tipo,
        dsDescricao: novaVersao.mudancas.split("\n").filter(m => m.trim() !== ""),
        isExibirLogista: novaVersao.isExibirLogista,
        nrVersaoSchemaSistema: schemaNum,
        ano: anoRegistro,
        createdAt: serverTimestamp()
      };

      const versaoRef = doc(db, nomeColecaoAno, versaoId);
      await setDoc(versaoRef, dadosVersao, { merge: true });

      const configRef = doc(db, "configuracoes", "sistema");
      await setDoc(configRef, {
        historicoVersoes: dadosVersao,
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
    } catch (error) {
      console.error("Erro ao salvar versão:", error);
      alert("Erro ao salvar a versão no banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  const excluirVersao = async (versaoId: string, anoVersao?: number) => {
    if (!confirm(`Deseja realmente excluir permanentemente o registro da versão ${versaoId}?`)) return;
    try {
      const anoRef = anoVersao || new Date().getFullYear();
      const nomeColecaoAno = `historico_versoes_${anoRef}`;

      await deleteDoc(doc(db, nomeColecaoAno, versaoId));

      if (versaoAtivaGlobal === versaoId) {
        const configRef = doc(db, "configuracoes", "sistema");
        await updateDoc(configRef, {
          historicoVersoes: deleteField(),
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
      {/* 1. BARRA DE PESQUISA NO TOPO */}
      <div style={styles.searchBox}>
        <FiSearch color="#64748b" size={18} />
        <input
          type="text"
          placeholder="Pesquisar por número da versão, módulo ou alteração..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={styles.searchInput}
        />
        {busca && (
          <button onClick={() => setBusca("")} style={styles.clearSearchBtn}>
            Limpar
          </button>
        )}
      </div>

      {/* 2. PAINEL DE CADASTRO / EDIÇÃO */}
      <div style={styles.cardCadastro}>
        <div style={styles.cardHeaderTitle}>
          <FiGitCommit size={20} color="#3b82f6" />
          <h3 style={styles.h3}>Cadastrar Nova Versão do Sistema</h3>
        </div>
        <p style={styles.helpText}>
          Insira uma nova tag de atualização e informe se há alterações estruturais no banco de dados através da Versão do Schema.
        </p>

        <form onSubmit={salvarVersao} style={styles.formGrid}>
          {/* Layout Ajustado Exclusivamente para Versão PC (Desktop) / Flexível */}
          <div style={styles.inputRowDesktop}>
            
            {/* COMPOSIÇÃO DA VERSÃO */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <FiTag size={12} /> Composição da Versão
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="text"
                  value={novaVersao.ano}
                  readOnly
                  style={{ ...styles.input, width: '45px', textAlign: 'center', background: '#f1f5f9', fontWeight: 'bold' }}
                  title="Ano base"
                />
                <span style={{ fontWeight: 'bold', color: '#64748b' }}>.</span>
                <input
                  type="number"
                  min="0"
                  value={novaVersao.major}
                  onChange={e => setNovaVersao({ ...novaVersao, major: e.target.value })}
                  style={{ ...styles.input, width: '55px', textAlign: 'center' }}
                  required
                />
                <span style={{ fontWeight: 'bold', color: '#64748b' }}>.</span>
                <input
                  type="number"
                  min="0"
                  value={novaVersao.minor}
                  onChange={e => setNovaVersao({ ...novaVersao, minor: e.target.value })}
                  style={{ ...styles.input, width: '55px', textAlign: 'center' }}
                  required
                />
                <span style={{ fontWeight: 'bold', color: '#64748b' }}>.</span>
                <input
                  type="number"
                  min="0"
                  value={novaVersao.patch}
                  onChange={e => setNovaVersao({ ...novaVersao, patch: e.target.value })}
                  style={{ ...styles.input, width: '55px', textAlign: 'center' }}
                  required
                />
              </div>
            </div>

            {/* VERSÃO DO SCHEMA DO BANCO */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <FiDatabase size={12} /> Versão do Schema (Banco)
              </label>
              <input
                type="number"
                min="0"
                placeholder="Ex: 2"
                value={novaVersao.schemaCode}
                onChange={e => setNovaVersao({ ...novaVersao, schemaCode: Number(e.target.value) })}
                style={styles.input}
                required
              />
            </div>

            {/* DATA DA VERSÃO */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <FiCalendar size={12} /> Data da Versão
              </label>
              <input
                type="date"
                value={novaVersao.data}
                onChange={e => setNovaVersao({ ...novaVersao, data: e.target.value })}
                style={styles.input}
                required
              />
            </div>

            {/* ÁREA / MÓDULO AFETADO */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Área / Módulo Afetado</label>
              <select
                value={novaVersao.tipo}
                onChange={e => setNovaVersao({ ...novaVersao, tipo: e.target.value })}
                style={styles.select}
              >
                {Object.entries(categoriasSistema).map(([categoria, paginas]) => (
                  <optgroup key={categoria} label={categoria}>
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
            <label style={styles.label}>O que mudou? (Digite uma alteração por linha)</label>
            <textarea
              placeholder={"- Adicionado suporte ao novo painel financeiro\n- Correção de bugs no fluxo de pedidos"}
              value={novaVersao.mudancas}
              onChange={e => setNovaVersao({ ...novaVersao, mudancas: e.target.value })}
              style={styles.textarea}
              required
            />
          </div>

          {/* CHECKBOX PARA EXIBIR AO LOJISTA */}
          <div style={styles.checkboxContainer}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={novaVersao.isExibirLogista}
                onChange={e => setNovaVersao({ ...novaVersao, isExibirLogista: e.target.checked })}
                style={styles.checkboxInput}
              />
              <span>Exibir esta atualização publicamente no painel do Lojista?</span>
            </label>
          </div>

          <button type="submit" style={styles.btnSalvar} disabled={loading}>
            <FiSave size={16} /> {loading ? "Salvando versão..." : "Salvar e Publicar Versão"}
          </button>
        </form>
      </div>

      {/* 3. TIMELINE / LISTAGEM COMPLETA DO HISTÓRICO DE VERSÕES */}
      <div style={styles.timelineContainer}>
        <div style={styles.listHeaderSection}>
          <h4 style={styles.subTitleHeading}>Histórico de Atualizações Publicadas</h4>
          <span style={styles.badgeCount}>{versoesFiltradas.length} versões listadas</span>
        </div>

        {versoesFiltradas.length === 0 ? (
          <div style={styles.emptyContainer}>
            <FiClock size={32} color="#94a3b8" />
            <p style={styles.emptyText}>Nenhuma versão encontrada no histórico deste ano.</p>
          </div>
        ) : (
          <div style={styles.listGrid}>
            {versoesFiltradas.map((item) => {
              const versaoAtualItem = item.nrVersaoSistemaSistema;
              const isAtiva = versaoAtivaGlobal === versaoAtualItem;
              return (
                <div key={item.id || versaoAtualItem} style={{
                  ...styles.cardVersao,
                  borderColor: isAtiva ? '#3b82f6' : '#e2e8f0',
                  boxShadow: isAtiva ? '0 4px 12px rgba(59, 130, 246, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)'
                }}>
                  <div style={styles.versaoHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={styles.versionIconBadge}>
                        <FiGitCommit size={16} color="#3b82f6" />
                        <span style={styles.tituloVersao}>v{versaoAtualItem}</span>
                      </div>

                      {item.nrVersaoSchemaSistema !== undefined && (
                        <span style={styles.badgeSchema}>
                          Schema v{item.nrVersaoSchemaSistema}
                        </span>
                      )}

                      {isAtiva && (
                        <span style={styles.badgeOficial}>Versão Atual Ativa</span>
                      )}
                      
                      {item.isExibirLogista ? (
                        <span style={styles.badgeVisivel}>
                          <FiEye size={12} /> Visível para Lojistas
                        </span>
                      ) : (
                        <span style={styles.badgeOculto}>
                          <FiEyeOff size={12} /> Oculta (Apenas Master)
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={styles.dataVersao}>{item.tsDataAtualizacao}</span>
                      <button 
                        onClick={() => excluirVersao(versaoAtualItem, item.ano)} 
                        style={styles.btnExcluir} 
                        title="Excluir Versão do Histórico"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Nome amigável totalmente abrangente formatado para o lojista */}
                  <span style={styles.tipoVersao}>{formatarNomeModuloParaLojista(item.dsPaginaAfetada)}</span>

                  <ul style={styles.listaMudancas}>
                    {item.dsDescricao?.map((mudanca: string, idx: number) => (
                      <li key={idx} style={styles.itemMudanca}>
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

        {/* BOTÃO CARREGAR MAIS (Paginação) */}
        {!busca && hasMore && versoes.length > 0 && (
          <button 
            onClick={carregarMaisVersoes} 
            disabled={loadingMore}
            style={styles.btnCarregarMais}
          >
            {loadingMore ? "Carregando mais..." : <>Carregar mais versões antigas <FiChevronDown /></>}
          </button>
        )}
      </div>
    </section>
  );
}

const styles: any = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxWidth: '1000px',
    margin: '0 auto',
    width: '100%'
  },
  searchBox: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px', 
    background: '#fff', 
    padding: '14px 18px', 
    borderRadius: '12px', 
    border: '1px solid #e2e8f0', 
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)' 
  },
  searchInput: { 
    border: 'none', 
    outline: 'none', 
    width: '100%', 
    fontSize: '14px', 
    background: 'transparent',
    color: '#1e293b'
  },
  clearSearchBtn: {
    background: '#f1f5f9',
    border: 'none',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    cursor: 'pointer',
    color: '#64748b',
    fontWeight: '600'
  },
  cardCadastro: { 
    background: '#fff', 
    padding: '28px', 
    borderRadius: '16px', 
    border: '1px solid #e2e8f0', 
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' 
  },
  cardHeaderTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '6px'
  },
  h3: { 
    fontSize: "15px", 
    fontWeight: "800", 
    color: "#1e293b", 
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  },
  helpText: { 
    fontSize: '13px', 
    color: '#64748b', 
    marginBottom: '22px',
    lineHeight: '1.5'
  },
  formGrid: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '18px' 
  },
  inputRowDesktop: { 
    display: 'grid', 
    gridTemplateColumns: '1.4fr 1.1fr 1fr 1.5fr', 
    gap: '12px',
    alignItems: 'end'
  },
  inputGroup: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '6px' 
  },
  label: { 
    fontSize: '11px', 
    fontWeight: '700', 
    color: '#475569', 
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    letterSpacing: '0.4px',
    whiteSpace: 'nowrap'
  },
  input: { 
    padding: '11px 12px', 
    borderRadius: '8px', 
    border: '1px solid #cbd5e1', 
    fontSize: '13px', 
    outline: 'none', 
    background: '#fff',
    color: '#1e293b',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  },
  select: { 
    padding: '11px 12px', 
    borderRadius: '8px', 
    border: '1px solid #cbd5e1', 
    fontSize: '13px', 
    outline: 'none', 
    background: '#fff', 
    cursor: 'pointer',
    color: '#1e293b',
    width: '100%',
    boxSizing: 'border-box'
  },
  textarea: { 
    padding: '12px 14px', 
    borderRadius: '8px', 
    border: '1px solid #cbd5e1', 
    fontSize: '13px', 
    height: '110px', 
    outline: 'none', 
    resize: 'vertical',
    fontFamily: 'inherit',
    color: '#1e293b',
    lineHeight: '1.5'
  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'center',
    background: '#f8fafc',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155'
  },
  checkboxInput: {
    width: '16px',
    height: '16px',
    cursor: 'pointer'
  },
  btnSalvar: { 
    background: '#3b82f6', 
    color: '#fff', 
    padding: '13px 22px', 
    borderRadius: '9px', 
    border: 'none', 
    cursor: 'pointer', 
    fontWeight: '700', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: '8px', 
    fontSize: '13px', 
    transition: 'background 0.2s',
    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
  },
  timelineContainer: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '15px',
    marginTop: '10px'
  },
  listHeaderSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 4px'
  },
  subTitleHeading: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  },
  badgeCount: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    background: '#e2e8f0',
    padding: '3px 10px',
    borderRadius: '20px'
  },
  listGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  cardVersao: { 
    background: '#fff', 
    padding: '22px', 
    borderRadius: '14px', 
    border: '1px solid #e2e8f0', 
    transition: 'all 0.2s'
  },
  versaoHeader: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: '8px', 
    flexWrap: 'wrap', 
    gap: '10px' 
  },
  versionIconBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#eff6ff',
    padding: '4px 10px',
    borderRadius: '8px'
  },
  tituloVersao: { 
    fontSize: '14px', 
    fontWeight: '800', 
    color: '#1d4ed8' 
  },
  badgeSchema: {
    fontSize: '10px',
    fontWeight: '700',
    background: '#fef3c7',
    color: '#d97706',
    padding: '3px 8px',
    borderRadius: '6px',
    textTransform: 'uppercase'
  },
  badgeOficial: {
    fontSize: '10px',
    fontWeight: '700',
    background: '#dcfce7',
    color: '#15803d',
    padding: '3px 8px',
    borderRadius: '6px',
    textTransform: 'uppercase'
  },
  badgeVisivel: {
    fontSize: '10px',
    fontWeight: '700',
    background: '#e0f2fe',
    color: '#0369a1',
    padding: '3px 8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    textTransform: 'uppercase'
  },
  badgeOculto: {
    fontSize: '10px',
    fontWeight: '700',
    background: '#f1f5f9',
    color: '#64748b',
    padding: '3px 8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    textTransform: 'uppercase'
  },
  dataVersao: { 
    fontSize: '12px', 
    color: '#64748b', 
    fontWeight: '600' 
  },
  tipoVersao: { 
    fontSize: '11px', 
    color: '#64748b', 
    fontWeight: '700', 
    textTransform: 'uppercase', 
    display: 'block', 
    marginBottom: '14px',
    letterSpacing: '0.4px'
  },
  listaMudancas: { 
    listStyle: 'none', 
    padding: '0', 
    margin: '0', 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '8px' 
  },
  itemMudanca: { 
    display: 'flex', 
    alignItems: 'flex-start', 
    gap: '10px', 
    fontSize: '13px', 
    color: '#334155',
    lineHeight: '1.4'
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff',
    padding: '40px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    gap: '10px'
  },
  emptyText: { 
    textAlign: 'center', 
    color: '#64748b', 
    fontSize: '13px' 
  },
  btnExcluir: { 
    background: '#fee2e2', 
    color: '#ef4444', 
    border: 'none', 
    padding: '8px', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    transition: 'background 0.2s'
  },
  btnCarregarMais: {
    background: '#f1f5f9',
    color: '#475569',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '10px',
    transition: 'background 0.2s'
  }
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