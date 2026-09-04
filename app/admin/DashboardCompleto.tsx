// app/admin/DashboardGestao.tsx (ou o caminho correto do seu arquivo)
"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc, collection, onSnapshot, addDoc, arrayUnion, serverTimestamp, getDocs } from "firebase/firestore";
// Como a pasta hooks está dentro de app:
import { useDashboardInteligencia } from "@/hooks/useDashboardInteligencia";
import { useGerenciarPedido } from "@/hooks/useGerenciarPedido";

// 🌟 Importando o hook do tema global (ThemeContext)
import { useTheme } from "@/context/ThemeContext";

// --- IMPORTAÇÃO DAS TABS ---
import { TabCatalogo } from "./_tabsDashBoardLogista/TabCatalogo";
import { TabSazonalidade } from "./_tabsDashBoardLogista/TabSazonalidade";
import { TabClientes } from "./_tabsDashBoardLogista/TabClientes";
import { TabLucroReal } from "./_tabsDashBoardLogista/TabLucroReal";
import { TabDevolucoes } from "./_tabsDashBoardLogista/TabDevolucoes";
import { TabFaturamentoCanais } from "./_tabsDashBoardLogista/TabFaturamentoCanais";
import { TabDespesas } from "./_tabsDashBoardLogista/TabDespesas";
import { TabRelatorioHistorico } from "./_tabsDashBoardLogista/TabRelatorioHistorico";
import { TabVendas } from "./_tabsDashBoardLogista/TabVendas";
import { ModalDevolucao } from "./_tabsDashBoardLogista/ModalDevolucao";

import { Pedido } from "@/types/pedido";
import { FiSearch, FiChevronLeft, FiChevronRight, FiList, FiBarChart2, FiChevronDown, FiChevronUp, FiUser, FiMapPin, FiPhone, FiMail } from "react-icons/fi";


// ============================================================================
// CONSTANTE DE VERSÃO DO SCHEMA (Incrementar apenas ao adicionar novos campos)
// ============================================================================
const VERSAO_SCHEMA_CODE = 2;


// ============================================================================
// INTERFACES / TYPING
// ============================================================================
interface ItemPedido {
  id?: string;
  idProduto?: string;
  dsNomeProduto?: string; // 🌟 Atualizado para o novo padrão
  nome?: string;
  nrQuantidadeProduto?: number; // 🌟 Atualizado para o novo padrão
  qty?: number;
  quantidade?: number;
  vlPrecoProduto?: number; // 🌟 Atualizado para o novo padrão
  preco?: number;
  valor?: number;         
  valorUnitario?: number; 
  dsVariacaoProduto?: string; // 🌟 Atualizado para o novo padrão
  variacao?: string;
  requisitos?: any[];
  dsFotoCapaProduto?: string; // 🌟 Atualizado para o novo padrão
  foto?: string;
  imagem?: string;
  image?: string;
  url?: string;
  urlOriginal?: string;
  thumb?: string;
  variacaoSelecionada?: {
    foto?: string;
  };
}

interface CanalRenda {
  canal: string;
  valorLiquidoRecebido: number;
  mesAno: string;
}

interface DespesaLojista {
  id: string;
  valor: number;
  data: string;
}


// ============================================================================
// CONSTANTES E AUXILIARES
// ============================================================================
const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

const extrairFotoDoItem = (item: any): string => {
  if (item.dsFotoCapaProduto && typeof item.dsFotoCapaProduto === 'string' && item.dsFotoCapaProduto.startsWith('http')) return item.dsFotoCapaProduto;
  const chavesPossiveis = ['foto', 'imagem', 'image', 'url', 'urlOriginal', 'thumb'];
  for (const chave of chavesPossiveis) {
    if (item[chave] && typeof item[chave] === 'string' && item[chave].startsWith('http')) return item[chave];
  }
  if (item.variacaoSelecionada?.foto) return item.variacaoSelecionada.foto;
  return "";
};

const ItemResumido = React.memo(({ item }: { item: ItemPedido }) => {
  const { theme } = useTheme();
  const qtd = Number(item.nrQuantidadeProduto || item.quantidade || item.qty || 1);

  // 🌟 Captura o preço unitário do item padronizado com os novos campos
  const precoUnitario = Number(item.vlPrecoProduto || item.preco || item.valor || item.valorUnitario || 0);
  const valorTotalItem = precoUnitario * qtd;

  const nomeExibicaoProduto = item.dsNomeProduto || item.nome || "Produto";
  const variacaoExibicao = item.dsVariacaoProduto || item.variacao || "";

  const fotoUrl = useMemo(() => extrairFotoDoItem(item), [item]);

  return (
    <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
        <img
          src={fotoUrl || "https://placehold.co/30x30?text=Prod"}
          alt=""
          style={{ width: '30px', height: '30px', borderRadius: '4px', objectFit: 'cover' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ color: theme.textMain, fontWeight: 'bold', fontSize: '13px' }}>
            {qtd}x {nomeExibicaoProduto}
          </span>
          {variacaoExibicao && (
            <span style={{ color: '#0284c7', fontSize: '12px' }}>
              Variação: {variacaoExibicao}
            </span>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: '12px', fontWeight: '600', color: theme.primary || '#3b82f6' }}>
          R$ {precoUnitario.toFixed(2).replace('.', ',')} un {qtd > 1 ? `(Total: R$ ${valorTotalItem.toFixed(2).replace('.', ',')})` : ''}
        </span>
      </div>
    </li>
  );
});

ItemResumido.displayName = "ItemResumido";

const LinhaPedido = React.memo(({ pedido, expandido, onExpandir, onDevolver, dataFormatada }: any) => {
  const { theme, isModoNoturno } = useTheme();
  
  // 🌟 Mapeia o cliente usando o novo padrão dsCliente e os campos internos
  const clienteObj = pedido.dsCliente || (typeof pedido.cliente === 'object' && pedido.cliente !== null ? pedido.cliente : {});
  const nomeExibicao = clienteObj.nmNomeCliente || clienteObj.nome || (typeof pedido.cliente === 'string' ? pedido.cliente : "Cliente Sem Nome");

  const fin = pedido.financeiro || {};
  const log = pedido.logistica || {};

  const subtotalVal = Number(fin.vlSubtotal ?? fin.subtotal ?? fin.valorSubtotal ?? 0);
  const descontoVal = Number(fin.vlDesconto ?? fin.discount ?? fin.descontos ?? 0);
  const freteVal = Number(log.vlFrete ?? fin.frete ?? 0);
  const freteGratisFlag = Boolean(log.isFreteGratis || fin.freteGratis || log.dsTransportadoraId === "frete_gratis_ativado");

  const totalCalculadoManual = subtotalVal + (freteGratisFlag ? 0 : freteVal) - descontoVal;
  const totalFinal = Number(fin.vlTotal ?? fin.total ?? fin.valorTotal ?? (totalCalculadoManual > 0 ? totalCalculadoManual : 0));
  
  // 🌟 Exibe o número do pedido com suporte ao novo campo nrNumeroPedido
  const numeroPedidoExibir = pedido.nrNumeroPedido || pedido.numeroPedido || pedido.id?.slice(0, 6) || "000";

  return (
    <React.Fragment>
      {/* LINHA PRINCIPAL DO PEDIDO */}
      <tr
        onClick={() => onExpandir(pedido.id)}
        style={{
          backgroundColor: isModoNoturno ? '#1e293b' : '#ffffff',
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          borderRadius: '12px',
          transition: 'all 0.2s ease',
          borderBottom: `8px solid ${theme.bgMain || (isModoNoturno ? '#0f172a' : '#f8fafc')}`
        }}
      >
        <td style={{ padding: '16px', borderRadius: '12px 0 0 12px', fontSize: '13px', color: theme.textMain }}>{dataFormatada}</td>
        <td style={{ padding: '16px', fontSize: '13px', fontWeight: '700' }}>
          <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: theme.inputBg, color: theme.textMain }}>
            #{numeroPedidoExibir}
          </span>
        </td>
        <td style={{ padding: '16px', fontSize: '13px', color: theme.primary, fontWeight: '600' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FiUser size={14} /> {nomeExibicao} {expandido ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </span>
        </td>
        <td style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold', color: theme.textMain }}>{formatarMoeda(totalFinal)}</td>
        <td style={{ padding: '16px', borderRadius: '0 12px 12px 0', fontSize: '13px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onDevolver(pedido); }}
            style={{ ...styles.btnDevolver, backgroundColor: pedido.devolvido ? '#e0f2fe' : '#fee2e2', color: pedido.devolvido ? '#0ea5e9' : '#ef4444' }}
          >
            {pedido.devolvido ? 'Restaurar' : 'Devolver'}
          </button>
        </td>
      </tr>

      {/* PAINEL EXPANDIDO COM O MESMO DESIGN DA DEVOLUÇÃO */}
      {expandido && (
        <tr>
          <td colSpan={5} style={{ padding: '0 8px' }}>
            <div style={{
              padding: '20px',
              backgroundColor: isModoNoturno ? '#0f172a' : '#f8fafc',
              border: `1px solid ${theme.border}`,
              borderRadius: '0 0 12px 12px',
              marginTop: '-8px',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div style={{ backgroundColor: theme.bgCard, padding: '14px', borderRadius: '10px', border: `1px solid ${theme.border}` }}>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textSec, marginBottom: '10px' }}>ITENS DO PEDIDO:</p>
                  {(pedido.itens || []).map((item: ItemPedido, idx: number) => {
                    const qtd = Number(item.nrQuantidadeProduto || item.quantidade || item.qty || 1);
                    const precoUnitario = Number(item.vlPrecoProduto || item.preco || item.valor || item.valorUnitario || 0);
                    const valorTotalItem = precoUnitario * qtd;
                    const fotoUrl = extrairFotoDoItem(item);
                    const nomeProd = item.dsNomeProduto || item.nome || "Produto";
                    const varProd = item.dsVariacaoProduto || item.variacao || "";

                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={fotoUrl || "https://placehold.co/32x32?text=Prod"}
                            alt=""
                            style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }}
                          />
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: '600', display: 'block', color: theme.textMain }}>
                              {qtd}x {nomeProd}
                            </span>
                            {varProd && (
                              <span style={{ fontSize: '11px', color: '#0284c7', display: 'block' }}>
                                Variação: {varProd}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: theme.primary }}>
                            R$ {precoUnitario.toFixed(2).replace('.', ',')} un {qtd > 1 ? `(Total: R$ ${valorTotalItem.toFixed(2).replace('.', ',')})` : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${theme.border}`, fontSize: '11px', color: theme.textSec }}>
                    <strong>ID do Pedido:</strong> <span style={{ fontFamily: 'monospace' }}>{pedido.id}</span>
                  </div>
                </div>

                <div style={{ backgroundColor: theme.bgCard, padding: '14px', borderRadius: '10px', border: `1px solid ${theme.border}` }}>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textSec, marginBottom: '10px' }}>RESUMO FINANCEIRO:</p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: theme.textSec }}>
                    <span>Total dos Produtos:</span>
                    <span style={{ color: theme.textMain }}>{formatarMoeda(subtotalVal)}</span>
                  </div>

                  {descontoVal > 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: '#16a34a' }}>
                      <span>Cupom de Desconto:</span>
                      <span>- {formatarMoeda(descontoVal)}</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: theme.textSec, fontStyle: 'italic' }}>
                      <span>Cupom de Desconto:</span>
                      <span>Não aplicado</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: theme.textSec }}>
                    <span>Sub total:</span>
                    <span style={{ color: theme.textMain }}>{formatarMoeda(subtotalVal - descontoVal)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: theme.textSec }}>
                    <span>Total de Frete:</span>
                    <strong style={{ color: theme.textMain }}>{freteGratisFlag ? "Grátis" : formatarMoeda(freteVal)}</strong>
                  </div>

                  <hr style={{ border: '0', borderTop: `1px solid ${theme.border}`, margin: '8px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', color: theme.textMain }}>
                    <span>Pagamento total:</span> <span style={{ color: theme.primary }}>{formatarMoeda(totalFinal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
});

LinhaPedido.displayName = "LinhaPedido";


// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export function DashboardGestao({ pedidos, lojistaId }: { pedidos: Pedido[], lojistaId?: string }) {
  const router = useRouter();
  const { theme } = useTheme();

  // 🌟 Validação de Permissão do Operador Ativo no PDV
  useEffect(() => {
    const operadorSalvo = localStorage.getItem("operadorAtivoPdv");
    if (operadorSalvo) {
      try {
        const colab = JSON.parse(operadorSalvo);
        if (colab && colab.permissoes && colab.permissoes.dash !== true) {
          alert("⚠️ Você não tem permissão para acessar o Dashboard!");
          window.location.href = "/admin/pdv";
        }
      } catch (e) {
        console.error("Erro ao validar operador:", e);
      }
    }
  }, []);

  const [abaAtiva, setAbaAtiva] = useState("vendas");
  const [buscaNome, setBuscaNome] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [pedidoExpandido, setPedidoExpandido] = useState<string | null>(null);
  const [pedidoParaDevolverModal, setPedidoParaDevolverModal] = useState<Pedido | null>(null);

  const [itensPorPagina, setItensPorPagina] = useState(20);

  const [canaisExternos, setCanaisExternos] = useState<CanalRenda[]>([]);
  const [despesasLojista, setDespesasLojista] = useState<DespesaLojista[]>([]);

  const [recursosLiberados, setRecursosLiberados] = useState({ temCanaisRenda: false, temDespesas: false });
  const [metaFaturamento, setMetaFaturamento] = useState(15000);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [inputMeta, setInputMeta] = useState("15000");

  const [calcCustoInsumo, setCalcCustoInsumo] = useState("10.00");
  const [calcMargemDesejada, setCalcMargemDesejada] = useState("40");
  const [calcImpostos, setCalcImpostos] = useState("6");
  const [calcTaxaMarketplace, setCalcTaxaMarketplace] = useState("0");

  const [versoesPendentes, setVersoesPendentes] = useState<any[]>([]);
  const [mostrarModalNovidades, setMostrarModalNovidades] = useState(false);
  const [salvandoLeitura, setSalvandoLeitura] = useState(false);

  const [localPedidos, setLocalPedidos] = useState<Pedido[]>(pedidos);
  useEffect(() => { setLocalPedidos(pedidos); }, [pedidos]);

  const { estornarEstoqueDoPedido } = useGerenciarPedido({
    db,
    lojistaIdApp: lojistaId || "",
    setLocalPedidos
  });

  const carregarDadosTeste = async () => {
    if (!lojistaId) return;
    if (!confirm("Isso adicionará dados de 2025 e 2026 para testar o gráfico. Continuar?")) return;

    const colRef = collection(db, "lojistas", lojistaId, "pedidos");
    const pedidosTeste = [
      { data: "2025-06-15T12:00:00", status: "concluído", devolvido: false, numeroPedido: 501, cliente: "Teste 2025", financeiro: { total: 1000 }, itens: [{ nome: "Topo de Bolo Luxo", qty: 1, preco: 14000 }] },
      { data: "2026-01-15T12:00:00", status: "concluído", devolvido: false, numeroPedido: 1001, cliente: "Teste Jan", financeiro: { total: 500 }, itens: [{ nome: "Convite Marsala", qty: 2, preco: 250 }] },
      { data: "2026-02-20T12:00:00", status: "concluído", devolvido: false, numeroPedido: 1002, cliente: "Teste Fev", financeiro: { total: 800 }, itens: [{ nome: "Topo de Bolo Luxo", qty: 2, preco: 400 }] },
      { data: "2026-03-10T12:00:00", status: "concluído", devolvido: false, numeroPedido: 1003, cliente: "Teste Mar", financeiro: { total: 300 }, itens: [{ nome: "Convite One Peace", qty: 3, preco: 100 }] }
    ];

    try {
      for (const p of pedidosTeste) { await addDoc(colRef, p); }
      alert("Dados de 2025 e 2026 inseridos! O gráfico agora terá dois anos para você alternar.");
    } catch (e) {
      alert("Erro ao inserir dados.");
    }
  };

  useEffect(() => {
    if (!lojistaId) return;

    const carregarEVerificarLojista = async () => {
      try {
        const [lojistaSnap, planosSnap, sistemaSnap] = await Promise.all([
          getDoc(doc(db, "lojistas", lojistaId)),
          getDoc(doc(db, "configuracoes", "planos")),
          getDoc(doc(db, "configuracoes", "sistema"))
        ]);

        if (lojistaSnap.exists()) {
          const dadosLojista = lojistaSnap.data();
          const nomePlanoLojista = dadosLojista.plano || "Bronze";
          const versaoSchemaBanco = dadosLojista.sistema?.versaoSchema || 0;

          if (versaoSchemaBanco < VERSAO_SCHEMA_CODE) {
            let houveAlteracao = false;
            const dadosAtualizados = { ...dadosLojista };
            if (!dadosAtualizados.sistema) dadosAtualizados.sistema = {};
            if (!dadosAtualizados.aparencia) dadosAtualizados.aparencia = {};
            if (dadosAtualizados.aparencia.isModoNoturno === undefined) dadosAtualizados.aparencia.isModoNoturno = false;
            dadosAtualizados.sistema.versaoSchema = VERSAO_SCHEMA_CODE;
            houveAlteracao = true;
            if (houveAlteracao) {
              await updateDoc(doc(db, "lojistas", lojistaId), { ...dadosAtualizados, updatedAt: new Date().toISOString() });
            }
          }

          if (dadosLojista.metaFaturamentoMensal) {
            setMetaFaturamento(Number(dadosLojista.metaFaturamentoMensal));
            setInputMeta(String(dadosLojista.metaFaturamentoMensal));
          }

          if (planosSnap.exists()) {
            const masterPlanos = planosSnap.data();
            const configDoPlanoAtual = masterPlanos[nomePlanoLojista] || {};
            setRecursosLiberados({ temCanaisRenda: !!configDoPlanoAtual.temCanaisRenda, temDespesas: !!configDoPlanoAtual.temDespesas });
          }

          if (sistemaSnap.exists()) {
            const dadosSistema = sistemaSnap.data();
            const versaoGlobalSistema = dadosSistema.dsVersaoSistema || "";
            const versoesLidasPeloLojista = dadosLojista.atualizacao?.versoesLidas || [];
            if (versaoGlobalSistema && !versoesLidasPeloLojista.includes(versaoGlobalSistema)) {
              const historicoSnap = await getDocs(collection(db, "configuracoes", "sistema", "historicoVersoes"));
              const todasPublicadas = historicoSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
              const naoLidas = todasPublicadas.filter(v => v.isExibirLogista === true && !versoesLidasPeloLojista.includes(v.nrVersaoSistemaSistema));
              if (naoLidas.length > 0) {
                setVersoesPendentes(naoLidas);
                setMostrarModalNovidades(true);
              }
            }
          }
        }
      } catch (error) { console.error("Erro ao carregar ou sincronizar dados:", error); }
    };
    carregarEVerificarLojista();
  }, [lojistaId]);

  const marcarNovidadesComoLidas = async () => {
    if (!lojistaId || versoesPendentes.length === 0) return;
    setSalvandoLeitura(true);
    try {
      const idsPendentes = versoesPendentes.map(v => v.nrVersaoSistemaSistema);
      await updateDoc(doc(db, "lojistas", lojistaId), { "atualizacao.versoesLidas": arrayUnion(...idsPendentes), "atualizacao.ultimaLeitura": serverTimestamp() });
      setMostrarModalNovidades(false);
      setVersoesPendentes([]);
    } catch (e) { console.error("Erro:", e); alert("Erro ao confirmar leitura."); } finally { setSalvandoLeitura(false); }
  };

  useEffect(() => {
    if (!lojistaId) return;
    const unsubCanais = onSnapshot(collection(db, "lojistas", lojistaId, "faturamento_canais"), (snap) => setCanaisExternos(snap.docs.map(doc => doc.data() as CanalRenda)));
    const unsubDespesas = onSnapshot(collection(db, "lojistas", lojistaId, "despesas"), (snap) => setDespesasLojista(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any)));
    return () => { unsubCanais(); unsubDespesas(); };
  }, [lojistaId]);

  const handleSalvarMeta = async () => {
    if (!lojistaId) return;
    const novaMeta = Number(inputMeta) || 0;
    try { await updateDoc(doc(db, "lojistas", lojistaId), { metaFaturamentoMensal: novaMeta }); setMetaFaturamento(novaMeta); setEditandoMeta(false); } catch (e) { alert("Erro ao salvar meta."); }
  };

  const parseDataPedido = useCallback((dataStr: any) => {
    if (!dataStr) return null;
    if (typeof dataStr === 'object' && typeof dataStr.toDate === 'function') return dataStr.toDate();
    if (typeof dataStr === 'string' && (dataStr.includes("T") || dataStr.includes("-"))) return new Date(dataStr);
    return new Date(dataStr);
  }, []);

  const formatarDataExibicao = useCallback((dataStr: any) => {
    const dataObj = parseDataPedido(dataStr);
    if (!dataObj || isNaN(dataObj.getTime())) return "Data Inválida";
    return dataObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }, [parseDataPedido]);

  const alternarDevolucao = useCallback(async (pedidoObj: Pedido) => {
    if (!pedidoObj.devolvido) {
      setPedidoParaDevolverModal(pedidoObj);
    } else {
      if (confirm("Confirmar RESTAURAÇÃO deste pedido?")) {
        try {
          const pedidoRef = doc(db, "lojistas", lojistaId!, "pedidos", pedidoObj.id);
          await updateDoc(pedidoRef, {
            devolvido: false,
            "dadosDevolucao.isDevolucaoSolicitado": false,
            "dadosDevolucao.dsStatusDevolucao": "pendente",
            "dadosDevolucao.dataSolicitacaoDevolucao": 0,
          });
          alert("✅ Pedido restaurado com sucesso!");
        } catch (e: any) {
          alert("Erro: " + e.message);
        }
      }
    }
  }, [lojistaId]);

  const confirmarDevolucaoComDados = async (dadosModal: any) => {
    if (!lojistaId || !pedidoParaDevolverModal) return;
    try {
      const pedidoRef = doc(db, "lojistas", lojistaId, "pedidos", pedidoParaDevolverModal.id);
      await updateDoc(pedidoRef, {
        devolvido: true,
        "dadosDevolucao.isDevolucaoSolicitado": true,
        "dadosDevolucao.dsStatusDevolucao": "solicitada",
        "dadosDevolucao.dataSolicitacaoDevolucao": new Date().toISOString(),
        "dadosDevolucao.dsMotivo": dadosModal.motivo,
        "dadosDevolucao.dsEstadoProduto": dadosModal.estadoProduto,
        "dadosDevolucao.vlCustoFreteReverso": Number(dadosModal.custoFreteReverso || 0),
      });

      setPedidoParaDevolverModal(null);
      alert("✅ Devolução registrada com sucesso! O estoque e as estatísticas estão sendo atualizados.");
    } catch (e: any) {
      alert("Erro ao registrar devolução: " + e.message);
    }
  };

  const inteligencia = useDashboardInteligencia(pedidos, canaisExternos, despesasLojista, dataInicio, dataFim, recursosLiberados, parseDataPedido);

  useEffect(() => {
    if (!lojistaId || !inteligencia) return;
    const syncFinanceiro = async () => {
      try {
        const ticketMedioCalculado = inteligencia.totalPedidosValidos > 0 ? (inteligencia.faturamentoInternoPuro / inteligencia.totalPedidosValidos) : 0;
        await updateDoc(doc(db, "lojistas", lojistaId), { lucroReal: inteligencia.lucroReal, ticketMedio: ticketMedioCalculado, ultimaAtualizacao: new Date().toISOString() });
      } catch (error) { console.error("Erro ao salvar financeiro:", error); }
    };
    const timer = setTimeout(syncFinanceiro, 2000);
    return () => clearTimeout(timer);
  }, [inteligencia.lucroReal, inteligencia.totalPedidosValidos, lojistaId]);

  const simuladorPrecoSugerido = useMemo(() => {
    const custo = Number(calcCustoInsumo) || 0;
    const margem = Number(calcMargemDesejada) || 0;
    const imposto = Number(calcImpostos) || 0;
    const taxaMkt = Number(calcTaxaMarketplace) || 0;
    const percentualDeducoes = (margem + imposto + taxaMkt) / 100;
    return percentualDeducoes >= 1 ? 0 : custo / (1 - percentualDeducoes);
  }, [calcCustoInsumo, calcMargemDesejada, calcImpostos, calcTaxaMarketplace]);

  const progressoMeta = useMemo(() => {
    if (metaFaturamento <= 0) return 0;
    return Math.min(100, Math.round((inteligencia.faturamento / metaFaturamento) * 100));
  }, [inteligencia.faturamento, metaFaturamento]);

  const dadosFiltradosBusca = useMemo(() => {
    return pedidos.filter(p => {
      const clienteObj = p.dsCliente || p.cliente || {};
      const clienteNomeStr = String(clienteObj.nmNomeCliente || clienteObj.nome || "");
      const numPedidoStr = String(p.nrNumeroPedido || p.numeroPedido || "");
      const termoBusca = String(buscaNome || "").toLowerCase().trim();

      if (buscaNome && !clienteNomeStr.toLowerCase().includes(termoBusca) && !numPedidoStr.toLowerCase().includes(termoBusca)) return false;
      
      const dataP = parseDataPedido(p.timestamp || p.data);
      if (dataInicio && dataP && dataP < new Date(dataInicio + "T00:00:00")) return false;
      if (dataFim && dataP && dataP > new Date(dataFim + "T23:59:59")) return false;
      return true;
    });
  }, [pedidos, buscaNome, dataInicio, dataFim, parseDataPedido]);

  const abasDisponiveis = [
    { id: "vendas", label: "VENDAS" }, { id: "devolucoes", label: "🔄 DEVOLVIDOS" },
    { id: "lucro", label: "💰 LUCRO REAL" }, { id: "precificacao", label: "🧮 PRECIFICAÇÃO" },
    { id: "sazonalidade", label: "SAZONALIDADE" }, { id: "catalogo", label: "CATÁLOGO" },
    { id: "clientes", label: "CLIENTES" }, { id: "historico", label: "📈 RELATÓRIO HISTÓRICO" },
    { id: "canais", label: "📦 CANAIS DE RENDA" }, { id: "despesas", label: "💸 DESPESAS" }
  ];

  return (
    <div style={{ ...styles.page, backgroundColor: theme.bgMain, color: theme.textMain }} className="dashboard-page-container">

      {mostrarModalNovidades && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.primary }}>
                <span style={{ fontSize: '18px' }}>✨</span>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>NOVIDADES NO SISTEMA</h3>
              </div>
              <span style={styles.badgeCountNotif}>{versoesPendentes.length} atualizações</span>
            </div>
            <p style={{ fontSize: '13px', color: theme.textSec, lineHeight: '1.4', marginBottom: '20px' }}>Preparamos melhorias e novas funcionalidades no painel.</p>
            <div style={styles.modalScrollArea}>
              {versoesPendentes.map((versao, idx) => (
                <div key={idx} style={{ ...styles.versaoCardItem, background: theme.inputBg, border: `1px solid ${theme.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: theme.primary }}>📌 v{versao.nrVersaoSistemaSistema}</span>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: theme.textSec }}>{versao.tsDataAtualizacao}</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {versao.dsDescricao?.map((desc: string, i: number) => <li key={i} style={{ fontSize: '13px', color: theme.textMain }}>{desc}</li>)}
                  </ul>
                </div>
              ))}
            </div>
            <button onClick={marcarNovidadesComoLidas} disabled={salvandoLeitura} style={{ ...styles.btnEntendidoModal, background: theme.primary }}>
              ✅ {salvandoLeitura ? "Salvando..." : "Entendido, continuar para o painel"}
            </button>
          </div>
        </div>
      )}

      {/* 1. BARRA DE METAS */}
      <div style={{ ...styles.metaContainer, backgroundColor: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <div style={styles.metaInfoRow}>
          <div>
            <span style={{ ...styles.metaMiniTitle, color: theme.textSec }}>🎯 META DE FATURAMENTO MENSAL</span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "3px" }}>
              {editandoMeta ? (
                <div style={{ display: "flex", gap: "5px" }}>
                  <input type="number" value={inputMeta} onChange={e => setInputMeta(e.target.value)} style={{ ...styles.inputMetaEdit, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }} />
                  <button onClick={handleSalvarMeta} style={styles.btnMetaSalvar}>Salvar</button>
                  <button onClick={() => setEditandoMeta(false)} style={{ ...styles.btnMetaCancelar, color: theme.textSec }}>✕</button>
                </div>
              ) : (
                <>
                  <h3 style={{ ...styles.metaValores, color: theme.textMain }}>{formatarMoeda(inteligencia.faturamento)} / <span style={{ color: theme.textSec }}>{formatarMoeda(metaFaturamento)}</span></h3>
                  <button onClick={() => setEditandoMeta(true)} style={styles.btnMetaEdit}>✏️ Alterar Meta</button>
                </>
              )}
            </div>
          </div>
          <span style={styles.metaPercentBadge}>{progressoMeta}% Atingido</span>
        </div>
        <div style={{ ...styles.progressBarBg, backgroundColor: theme.inputBg }}><div style={{ ...styles.progressBarFill, width: `${progressoMeta}%` }} /></div>
      </div>

      {/* 2. CARDS DE RESUMO */}
      <div style={styles.grid}>
        <div style={{ ...styles.card, backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderLeft: '5px solid #2ecc71' }}><span style={{ ...styles.cardLabel, color: theme.textSec }}>Faturamento Omnichannel</span><h2 style={{ ...styles.cardVal, color: theme.textMain }}>{formatarMoeda(inteligencia.faturamento)}</h2></div>
        <div style={{ ...styles.card, backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderLeft: '5px solid #27ae60' }}><span style={{ ...styles.cardLabel, color: theme.textSec }}>Lucro Real Consolidado</span><h2 style={{ ...styles.cardVal, color: theme.textMain }}>{formatarMoeda(inteligencia.lucroReal)}</h2></div>
        <div style={{ ...styles.card, backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderLeft: '5px solid #3498db' }}><span style={{ ...styles.cardLabel, color: theme.textSec }}>Ticket Médio</span><h2 style={{ ...styles.cardVal, color: theme.textMain }}>{formatarMoeda(inteligencia.faturamentoInternoPuro / (inteligencia.totalPedidosValidos || 1))}</h2></div>
        <div style={{ ...styles.card, backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderLeft: '5px solid #e74c3c' }}><span style={{ ...styles.cardLabel, color: theme.textSec }}>Perda (Cancelados)</span><h2 style={{ ...styles.cardVal, color: theme.textMain }}>{formatarMoeda(inteligencia.perdaDevolucao)}</h2></div>
      </div>

      {/* 3. FILTROS E ABAS */}
      <header style={styles.header}>
        <div style={{ ...styles.filtrosCard, backgroundColor: theme.bgCard, border: `1px solid ${theme.border}` }} className="filtro-container">
          <input type="text" placeholder="🔍 Buscar por nome do cliente ou número do pedido..." value={buscaNome} onChange={e => setBuscaNome(e.target.value)} style={{ ...styles.input, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }} />
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={{ ...styles.inputDate, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }} />
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={{ ...styles.inputDate, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }} />
          <select value={itensPorPagina} onChange={(e) => setItensPorPagina(Number(e.target.value))} style={{ ...styles.selectPaginacaoTopo, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }}>
            <option value={20}>20 por pág</option>
            <option value={40}>40 por pág</option>
            <option value={100}>100 por pág</option>
          </select>
          <button onClick={() => { setBuscaNome(""); setDataInicio(""); setDataFim(""); }} style={styles.btnLimpar}>Limpar</button>
        </div>

        <div style={{ ...styles.tabBar, borderColor: theme.border }}>
          {abasDisponiveis.map(t => (
            <button key={t.id} style={abaAtiva === t.id ? styles.tabActive : { ...styles.tab, backgroundColor: theme.inputBg, color: theme.textSec }} onClick={() => { setAbaAtiva(t.id); setPedidoExpandido(null); }}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* 4. CONTEÚDO DAS ABAS */}
      <section style={{ ...styles.section, backgroundColor: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <div style={{ ...styles.abaHeader, borderBottom: `1px solid ${theme.border}` }}>
          <h3 style={{ margin: 0, color: theme.textMain }}>
            {abaAtiva === 'lucro' ? '💰 DETALHAMENTO DE RESULTADO' : abaAtiva === 'canais' ? '📦 CENTRAL DE CANAIS OMNICHANNEL' : abaAtiva === 'precificacao' ? '🧮 SIMULADOR DE PRECIFICAÇÃO E MARGEM' : abaAtiva.toUpperCase()}
          </h3>
        </div>

        {abaAtiva === 'vendas' && (
          <TabVendas
            pedidos={dadosFiltradosBusca.filter(p => {
              const statusPedidoRaiz = String(p.dsStatusPedido || p.statusPedido || "").toLowerCase().trim();
              const ehConcluido = statusPedidoRaiz === "concluído" || statusPedidoRaiz === "concluido";

              return ehConcluido && !p.devolvido;
            })}
            formatarDataExibicao={formatarDataExibicao}
            formatarMoeda={formatarMoeda}
            alternarDevolucao={alternarDevolucao}
            pedidoExpandido={pedidoExpandido}
            setPedidoExpandido={setPedidoExpandido}
            LinhaPedido={LinhaPedido}
            styles={styles}
            itensPorPagina={itensPorPagina}
          />
        )}

        {abaAtiva === 'catalogo' && <TabCatalogo rankingProdutos={inteligencia.rankingProdutos} formatarMoeda={formatarMoeda} styles={styles} />}
        {abaAtiva === 'sazonalidade' && <TabSazonalidade sazonalidade={inteligencia.sazonalidade} nomesMeses={inteligencia.nomesMeses} formatarMoeda={formatarMoeda} />}
        {abaAtiva === 'clientes' && <TabClientes clientesEstrela={inteligencia.clientesEstrela} formatarMoeda={formatarMoeda} styles={styles} />}

        {abaAtiva === 'lucro' && (
          <TabLucroReal
            uid={lojistaId || ""}
            formatarMoeda={formatarMoeda}
            evolucaoMensal={inteligencia.evolucaoPorAno}
            totalPedidos={dadosFiltradosBusca.length}
          />
        )}

        {abaAtiva === 'precificacao' && (
          <div style={styles.precificacaoBox}>
            <div style={{ ...styles.precificacaoInputsForm, backgroundColor: theme.inputBg, borderColor: theme.border }}>
              <h4 style={{ margin: "0 0 15px 0", color: theme.textMain }}>🔧 Componentes do Custo</h4>
              <div style={styles.formRowSimulador}>
                <label style={{ ...styles.labelSimulador, color: theme.textSec }}>Custo de Produção / Insumos (R$):</label>
                <input type="number" value={calcCustoInsumo} onChange={e => setCalcCustoInsumo(e.target.value)} style={{ ...styles.inputSimulador, backgroundColor: theme.bgCard, color: theme.textMain, borderColor: theme.border }} />
              </div>
              <div style={styles.formRowSimulador}>
                <label style={{ ...styles.labelSimulador, color: theme.textSec }}>Margem de Lucro Desejada (%):</label>
                <input type="number" value={calcMargemDesejada} onChange={e => setCalcMargemDesejada(e.target.value)} style={{ ...styles.inputSimulador, backgroundColor: theme.bgCard, color: theme.textMain, borderColor: theme.border }} />
              </div>
              <div style={styles.formRowSimulador}>
                <label style={{ ...styles.labelSimulador, color: theme.textSec }}>Impostos Federais/Estaduais (%):</label>
                <input type="number" value={calcImpostos} onChange={e => setCalcImpostos(e.target.value)} style={{ ...styles.inputSimulador, backgroundColor: theme.bgCard, color: theme.textMain, borderColor: theme.border }} />
              </div>
              <div style={styles.formRowSimulador}>
                <label style={{ ...styles.labelSimulador, color: theme.textSec }}>Comissão do Marketplace (%):</label>
                <input type="number" value={calcTaxaMarketplace} onChange={e => setCalcTaxaMarketplace(e.target.value)} style={{ ...styles.inputSimulador, backgroundColor: theme.bgCard, color: theme.textMain, borderColor: theme.border }} />
              </div>
            </div>

            <div style={{ ...styles.precificacaoResultCard, backgroundColor: theme.bgCard, borderColor: theme.border }}>
              <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4f46e5", textTransform: "uppercase" }}>💰 PREÇO DE VENDA RECOMENDADO</span>
              <h2 style={{ ...styles.precoSugeridoGrande, color: theme.textMain }}>{simuladorPrecoSugerido > 0 ? formatarMoeda(simuladorPrecoSugerido) : "Ajuste as margens"}</h2>
              <div style={{ borderTop: `1px dashed ${theme.border}`, marginTop: "15px", paddingTop: "15px", fontSize: "13px", color: theme.textSec }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span>Sobra Líquida ({calcMargemDesejada}%):</span>
                  <strong style={{ color: "#16a34a" }}>{formatarMoeda(simuladorPrecoSugerido * (Number(calcMargemDesejada) / 100))}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span>Reserva para Impostos ({calcImpostos}%):</span>
                  <span style={{ color: "#dc2626" }}>{formatarMoeda(simuladorPrecoSugerido * (Number(calcImpostos) / 100))}</span>
                </div>
                {Number(calcTaxaMarketplace) > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Taxa da Plataforma ({calcTaxaMarketplace}%):</span>
                    <span style={{ color: "#e67e22" }}>{formatarMoeda(simuladorPrecoSugerido * (Number(calcTaxaMarketplace) / 100))}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'canais' && recursosLiberados.temCanaisRenda && (
          <TabFaturamentoCanais
            canaisExternos={canaisExternos}
            faturamentoCatalogoProprio={inteligencia.faturamentoInternoPuro}
            formatarMoeda={formatarMoeda}
          />
        )}

        {abaAtiva === 'historico' && (
          <TabRelatorioHistorico pedidos={pedidos} formatarMoeda={formatarMoeda} />
        )}

        {abaAtiva === 'despesas' && recursosLiberados.temDespesas && (
          <TabDespesas lojistaId={lojistaId || ""} formatarMoeda={formatarMoeda} />
        )}

        {abaAtiva === 'devolucoes' && (
          <TabDevolucoes
            uid={lojistaId || ""} 
            dadosFiltradosBusca={dadosFiltradosBusca}
            formatarDataExibicao={formatarDataExibicao}
            formatarMoeda={formatarMoeda}
            alternarDevolucao={alternarDevolucao}
            styles={styles}
          />
        )}
      </section>

      {pedidoParaDevolverModal && (
        <ModalDevolucao
          pedido={pedidoParaDevolverModal}
          isOpen={!!pedidoParaDevolverModal}
          onClose={() => setPedidoParaDevolverModal(null)}
          onConfirmar={confirmarDevolucaoComDados}
        />
      )}

      <button onClick={carregarDadosTeste} style={{ margin: '20px 0', padding: '10px', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
        🧪 Inserir Dados de Teste
      </button>

      <style jsx>{`
        :global(body), :global(html) {
          margin: 0 !important;
          padding: 0 !important;
          overflow-x: hidden !important;
        }
        .dashboard-page-container {
          box-sizing: border-box;
          margin-top: 0 !important;
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
        }
        .dashboard-page-container ::-webkit-scrollbar {
          height: 4px;
        }
        .dashboard-page-container ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        @media (max-width: 768px) {
          .filtro-container {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .filtro-container input,
          .filtro-container select,
          .filtro-container button {
            width: 100% !important;
            flex: none !important;
            min-width: 100% !important;
          }
        }

        @media (min-width: 769px) {
          .dashboard-page-container {
            margin-left: 0px !important;
            width: 100% !important;
            max-width: 100% !important;
            padding-top: 0px !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: { padding: '0px 16px 24px 16px', fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', boxSizing: 'border-box' },
  header: { marginBottom: '24px' },
  btnVoltar: { padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', color: '#334155' },
  filtrosCard: { display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '20px', alignItems: 'center' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', flex: 1, minWidth: '240px', outline: 'none', boxSizing: 'border-box' },
  inputDate: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  selectPaginacaoTopo: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', cursor: 'pointer', boxSizing: 'border-box', flexShrink: 0 },
  btnAtalho: { padding: '10px 16px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', color: '#475569' },
  btnLimpar: { padding: '10px 16px', backgroundColor: '#fee2e2', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', color: '#ef4444', flexShrink: 0, boxSizing: 'border-box' },
  tabBar: { display: 'flex', gap: '6px', flexWrap: 'wrap', borderBottom: '1px solid', paddingBottom: '12px' },
  tab: { padding: '8px 14px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '12px', borderRadius: '8px' },
  tabActive: { padding: '8px 14px', border: 'none', backgroundColor: '#1e293b', color: '#fff', fontWeight: '600', fontSize: '12px', borderRadius: '8px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' },
  card: { padding: '16px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  cardLabel: { fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' },
  cardVal: { margin: 0, fontSize: '20px', fontWeight: '800' },
  section: { padding: '16px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflowX: 'auto' },
  abaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '10px' },
  infoTooltip: { width: '28px', height: '28px', borderRadius: '50%', border: 'none', backgroundColor: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748b' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
  th: { padding: '14px', fontSize: '13px', fontWeight: '700' },
  tr: { borderBottom: '1px solid' },
  td: { padding: '14px', fontSize: '14px' },
  pedidoBadge: { padding: '4px 8px', borderRadius: '6px', fontWeight: '600', fontSize: '13px' },
  btnDevolver: { padding: '6px 12px', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer' },
  detalheBox: { padding: '16px' },
  expandInfo: { backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' },
  expandHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px dashed #e2e8f0', fontSize: '14px' },
  metaContainer: { padding: '16px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '20px' },
  metaInfoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  metaMiniTitle: { fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' },
  metaValores: { margin: 0, fontSize: '18px', fontWeight: '800' },
  metaPercentBadge: { backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: '700' },
  progressBarBg: { width: '100%', height: '8px', borderRadius: '9999px', overflow: 'hidden' },
  progressBarFill: { height: '100%', background: 'linear-gradient(90deg, #3b82f6, #06b6d4)', borderRadius: '9999px', transition: 'width 0.4s ease-in-out' },
  metaMotivationText: { margin: '12px 0 0 0', fontSize: '13px', fontWeight: '500', color: '#475569' },
  btnMetaEdit: { background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '12px', fontWeight: '600', padding: 0, marginLeft: '10px' },
  inputMetaEdit: { padding: '4px 8px', borderRadius: '6px', border: '1px solid', width: '100px', fontSize: '13px', fontWeight: '600', outline: 'none' },
  btnMetaSalvar: { backgroundColor: '#1e293b', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' },
  btnMetaCancelar: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '0 4px' },
  precificacaoBox: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', padding: '4px 0' },
  precificacaoInputsForm: { padding: '16px', borderRadius: '12px', border: '1px solid' },
  formRowSimulador: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' },
  labelSimulador: { fontSize: '12px', fontWeight: '600' },
  inputSimulador: { padding: '10px', borderRadius: '8px', border: '1px solid', fontSize: '14px', fontWeight: '600', outline: 'none', width: '100%', boxSizing: 'border-box' },
  precificacaoResultCard: { padding: '20px', borderRadius: '14px', border: '2px solid', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  precoSugeridoGrande: { fontSize: '32px', margin: '8px 0', fontWeight: '900', letterSpacing: '-1px' },
  finRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  modalContent: { width: '100%', maxWidth: '540px', padding: '28px', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  badgeCountNotif: { fontSize: '11px', fontWeight: '700', backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '20px' },
  modalScrollArea: { maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', paddingRight: '4px' },
  versaoCardItem: { padding: '14px', borderRadius: '12px' },
  btnEntendidoModal: { width: '100%', padding: '14px', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
};