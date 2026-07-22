'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import useSWR from 'swr';
import { useFrete } from "@/hooks/useFrete";
import ModalProcessamento from './ModalProcessamento';

// ============================================================================
// TYPING / INTERFACES
// ============================================================================
interface ItemCarrinho {
  id?: string;
  qty?: number;
  quantidade?: number;
  nome?: string;
  title?: string;
  variacao?: string;
  preco?: number;
  precisaFrete?: boolean;
  sku?: string; // Adicione esta linha
  respostasFormatadas?: Record<string, any>;
  personalizacao?: Record<string, any>;
}
interface EnderecoPedido { rua?: string; numero?: string; bairro?: string; cidade?: string; city?: string; uf?: string; cep?: string; }
interface FinanceiroPedido {
  metodo?: string;
  dsTransportadoraId?: string; // Usado para o ID da transportadora
  dsMetodoPagamento?: string;  // Adicionado para satisfazer a linha 461
  freteGratis?: boolean;
  isFreteGratis?: boolean;
}

interface Pedido {
  id: string;
  numeroPedido?: string | number;
  numero?: string | number;
  cliente: string | { nome?: string;[key: string]: any };
  endereco?: EnderecoPedido;
  itens: ItemCarrinho[];
  financeiro?: FinanceiroPedido;
  pago: boolean;
  status: string;
  etiquetaGerada?: boolean;
  statusEtiqueta?: 'pendente' | 'paga' | 'erro' | null;
  idEtiquetaMelhorEnvio?: string;
  dsNumRastreio?: string;
  urlEtiqueta?: string;
  dataGeracaoEtiqueta?: string | null;
  data?: string;
  retirada?: boolean;
  retirarNaLoja?: boolean;
  formaEntrega?: string;
  statusPagamento?: string;
  erroPagamento?: string;
}
interface DadosLoja { CEP?: string; cep?: string; cidade?: string; }
interface GestaoPedidosProps { pedidos: Pedido[]; loading?: boolean; lojistaIdApp: string; db: any; dadosLoja?: DadosLoja; obterCamposDoCliente?: (pedido: Pedido) => any; }

// ============================================================================
// HELPERS
// ============================================================================
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Pendente': return '#f39c12';
    case 'Em Produção': return '#3498db';
    case 'Concluído': return '#2ecc71';
    default: return '#95a5a6';
  }
};

const ehElegivelParaFrete = (pedido: Pedido): boolean => {
  if (!pedido || !pedido.itens) return false;
  const todosSemFrete = pedido.itens.every(item => item.precisaFrete === false);
  return !todosSemFrete;
};

const formatarData = (dataStr: string | undefined): string => {
  if (!dataStr) return '-';
  try {
    const data = new Date(dataStr);
    return data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch (e) { return dataStr; }
};

const extrairFotoDoItem = (item: any): string => {
  const chavesPossiveis = ['foto', 'imagem', 'image', 'url', 'urlOriginal', 'thumb'];
  for (const chave of chavesPossiveis) {
    if (item[chave] && typeof item[chave] === 'string' && item[chave].startsWith('http')) return item[chave];
  }
  if (item.variacaoSelecionada?.foto) return item.variacaoSelecionada.foto;
  return "";
};

const itemCarrinhoEhDigital = (pedido: Pedido) => pedido.itens?.every(i => i.precisaFrete === false);
const ehFretePagoNoCarrinho = (pedido: Pedido) => {
  return pedido.financeiro?.metodo && !pedido.financeiro.metodo.startsWith("Logística:");
};

const fetchProduto = async (path: string, db: any) => {
  const [_, lojistaId, __, idProd] = path.split('/');
  const docRef = doc(db, "lojistas", lojistaId, "produtos", idProd);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : null;
};

const LinhaItemProduto = React.memo(({ item, lojistaId, isRetirada, db }: any) => {
  const idProd = item.idProduto || item.id;
  const { data: produtoData } = useSWR(
    idProd && lojistaId ? `lojistas/${lojistaId}/produtos/${idProd}` : null,
    (key) => fetchProduto(key, db),
    { revalidateOnFocus: false }
  );

  const respostas = item.respostasFormatadas || item.personalizacao || {};
  const isDigital = item.precisaFrete === false;
  const selo = isDigital ? { texto: "Digital", cor: "#3b82f6" } : (isRetirada ? { texto: "Retirada", cor: "#f59e0b" } : { texto: "Envio", cor: "#10b981" });

  const fotoUrl = useMemo(() => {
    const fotoDireta = extrairFotoDoItem(item);
    if (fotoDireta) return fotoDireta;
    if (produtoData) {
      if (item.variacao && Array.isArray(produtoData.variacoes)) {
        const match = produtoData.variacoes.find((v: any) => v.nome === item.variacao);
        if (match?.foto) return match.foto;
      }
      return produtoData.capa || "";
    }
    return "";
  }, [item, produtoData]);

  return (
    <div style={localStyles.itemCardWhiteBox}>
      <div style={localStyles.imageContainer}>
        {fotoUrl ? (
          <img src={fotoUrl} alt={item.nome} style={localStyles.productImage as any} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        ) : (
          <div style={localStyles.productImagePlaceholder}>📦</div>
        )}
        <div style={localStyles.imageCrossBadge}>x</div>
      </div>
      <div style={localStyles.itemDetailsCol}>
        <div style={localStyles.itemTitleRow}>
          <span style={{ ...localStyles.badgeEnvioStyle, backgroundColor: selo.cor, color: '#fff' }}>{selo.texto}</span>
          <span>{item.nome || item.title}</span>
        </div>
        <div style={localStyles.personalizacaoText}>
          {Object.entries(respostas).map(([key, val]) => <div key={key}>{key}: <strong>{String(val)}</strong></div>)}
          {Object.keys(respostas).length === 0 && item.variacao && <div>Variação: <strong>{item.variacao}</strong></div>}
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function GestaoPedidos({
  pedidos = [], loading = false, lojistaIdApp, db, dadosLoja
}: GestaoPedidosProps) {

  const [modalProgresso, setModalProgresso] = useState<{
    aberto: boolean;
    titulo: string;
    itens: { id: string; numero: string; status: 'processando' | 'sucesso' | 'erro'; mensagem?: string }[];
  }>({ aberto: false, titulo: "", itens: [] });

  const [localPedidos, setLocalPedidos] = useState<Pedido[]>(pedidos);
  useEffect(() => { setLocalPedidos(pedidos); }, [pedidos]);

  const temPedidosPendentes = useMemo(() => {
    return localPedidos.some(p => p.etiquetaGerada === true && p.statusEtiqueta === 'pendente');
  }, [localPedidos]);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroLogistica, setFiltroLogistica] = useState("todos");
  const [ordenacao, setOrdenacao] = useState("recentes");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [processandoMassa, setProcessandoMassa] = useState(false);
  const [pedidoSelecionadoParaFrete, setPedidoSelecionadoParaFrete] = useState<Pedido | null>(null);
  const [opcoesFreteCotadas, setOpcoesFreteCotadas] = useState<any[]>([]);
  const [pedidoParaDeletar, setPedidoParaDeletar] = useState<Pedido | null>(null);
  const [confirmacaoTexto, setConfirmacaoTexto] = useState("");
  const [erroFrete, setErroFrete] = useState<string | null>(null);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 30;

  const { cotarFrete, loadingFrete: loadingFreteAdmin } = useFrete(lojistaIdApp, dadosLoja);

  const pedidosFiltrados = useMemo(() => {
    return localPedidos.filter(p => {
      if (!p) return false;
      const termo = busca.toLowerCase().trim();
      const numPedidoStr = p.numeroPedido !== undefined && p.numeroPedido !== null ? String(p.numeroPedido) : (p.numero !== undefined && p.numero !== null ? String(p.numero) : "");
      const itemsStr = (p.itens || []).map(i => i.nome || i.title || "").join(" ").toLowerCase();
      let clienteNome = typeof p.cliente === 'object' ? String(p.cliente.nome || "").toLowerCase() : String(p.cliente || "").toLowerCase();

      const matchBusca = termo === "" || numPedidoStr.includes(termo) || clienteNome.includes(termo) || itemsStr.includes(termo);
      const matchStatus = filtroStatus === "Todos"
        ? true
        : (p.status === filtroStatus && p.pago === true);

      // Identificadores de Lógica
      const methodStr = String(p.financeiro?.metodo || '').trim().toLowerCase();
      const formaEntregaStr = String(p.formaEntrega || '').trim().toLowerCase();
      const ehRetirada = p.retirada === true || p.retirarNaLoja === true || formaEntregaStr === 'retirada' || formaEntregaStr === 'retirar na loja';
      const ehSemFrete = Array.isArray(p.itens) && p.itens.length > 0 ? p.itens.every(item => item.precisaFrete === true) : false;
      const ehFreteGratisPedido = methodStr.includes("grátis") || methodStr.includes("gratis") || p.financeiro?.freteGratis === true;

      // Filtros de Logística (agora mais flexíveis)
      if (filtroLogistica === "pendentes") {
        // Pega tudo que é etiqueta pendente, independente do resto
        return matchBusca && matchStatus && p.etiquetaGerada && p.statusEtiqueta === 'pendente';
      }
      if (filtroLogistica === "freteGratis") {
        // Mostra Frete Grátis sempre

        return matchBusca && matchStatus && p.financeiro?.freteGratis === true;
      }
      if (filtroLogistica === "semFrete") {
        // Mostra apenas os digitais
        return matchBusca && matchStatus && ehSemFrete;
      }
      if (filtroLogistica === "retirada") {
        // Mostra apenas retirada
        return matchBusca && matchStatus && ehRetirada;
      }

      return matchBusca && matchStatus;
    }).sort((a, b) => {
      const d1 = new Date(a.data || (a.cliente as any)?.data || 0).getTime();
      const d2 = new Date(b.data || (b.cliente as any)?.data || 0).getTime();
      return ordenacao === "recentes" ? d2 - d1 : d1 - d2;
    });
  }, [localPedidos, busca, filtroStatus, filtroLogistica, ordenacao]);
  useEffect(() => { setPaginaAtual(1); }, [pedidosFiltrados]);

  const pedidosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return pedidosFiltrados.slice(inicio, inicio + itensPorPagina);
  }, [pedidosFiltrados, paginaAtual]);

  const totalPaginas = Math.ceil(pedidosFiltrados.length / itensPorPagina);

  const qtdAptosParaEtiqueta = useMemo(() => {
    // Olhamos apenas para os pedidos visíveis na página atual (pedidosPaginados)
    return pedidosPaginados.filter(p => {
      // 1. O pedido deve estar selecionado (checkbox)
      const estaSelecionado = selecionados.includes(p.id);

      // 2. Deve ter uma transportadora válida definida (dsTransportadoraId preenchido)
      // E não pode ser o estado de Frete Grátis "padrão" (se este não for cotável)
      const idTransporte = String(p.financeiro?.dsTransportadoraId || "");
      const isCotado = idTransporte.length > 0 && idTransporte !== "frete_gratis_ativado";

      // 3. NÃO deve ter etiqueta já gerada
      const semEtiqueta = !p.etiquetaGerada;

      // 4. Status válido (opcional, conforme sua regra de negócio)
      const statusValido = p.status !== 'Concluído';

      return estaSelecionado && isCotado && semEtiqueta && statusValido;
    }).length;
  }, [pedidosPaginados, selecionados]); // Dependência em pedidosPaginados garante o foco na página atual

  const toggleSelectAll = () => {
    const idsPaginaAtual = pedidosPaginados.map(p => p.id);
    const todosSelecionadosNaPagina = idsPaginaAtual.every(id => selecionados.includes(id));
    if (todosSelecionadosNaPagina) {
      setSelecionados(prev => prev.filter(id => !idsPaginaAtual.includes(id)));
    } else {
      setSelecionados(prev => [...new Set([...prev, ...idsPaginaAtual])]);
    }
  };

  const mudarStatusDireto = async (pedido: Pedido, novoStatus: string) => {
    // 1. Bloqueio padrão se já estiver concluído
    if (pedido.status === 'Concluído') return;

    // 2. Trava de Segurança: Verifica se o usuário está tentando concluir
    if (novoStatus === 'Concluído') {

      // NOVA TRAVA: Exige que o pedido esteja marcado como PAGO
      if (pedido.pago !== true) {
        alert("❌ Ação bloqueada: Este pedido ainda não foi PAGO!");
        return;
      }

      const formaEntregaStr = String(pedido.formaEntrega || '').trim().toLowerCase();
      const isRetirada = pedido.retirada === true || pedido.retirarNaLoja === true || formaEntregaStr === 'retirada' || formaEntregaStr === 'retirar na loja';
      const isDigital = itemCarrinhoEhDigital(pedido);

      // Regra de Logística: 
      // Se NÃO for retirada e NÃO for digital...
      if (!isRetirada && !isDigital) {
        // Exige que a etiqueta tenha sido gerada E que o status seja 'paga'
        if (!pedido.etiquetaGerada || pedido.statusEtiqueta !== 'paga') {
          alert("❌ Ação bloqueada: O pedido só pode ser concluído se a etiqueta de frete estiver paga!");
          return;
        }
      }

      // Pergunta de confirmação apenas se passou por TODAS as travas
      if (!confirm("⚠️ Confirmar finalização? O pedido será marcado como pago e concluído.")) return;
    }

    // Se passou pelas travas, atualiza no Firebase
    setLocalPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, status: novoStatus } : p));
    if (db) try {
      await updateDoc(doc(db, "lojistas", lojistaIdApp, "pedidos", pedido.id), { status: novoStatus });
    } catch (error) {
      alert("Erro ao atualizar status no banco de dados.");
    }
  };
  const alternarPago = async (pedido: Pedido) => {
    if (pedido.status === 'Concluído') return;
    const novoPago = !pedido.pago;
    setLocalPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, pago: novoPago } : p));
    if (db) try { await updateDoc(doc(db, "lojistas", lojistaIdApp, "pedidos", pedido.id), { pago: novoPago }); } catch (e) { }
  };

  const abrirJanelaCotacao = async (pedido: Pedido) => {
    if (pedido.status === 'Concluído') return;
    setPedidoSelecionadoParaFrete(pedido);
    setErroFrete(null);
    const opcoes = await cotarFrete(pedido);
    if (!opcoes || opcoes.length === 0) setErroFrete("Nenhuma transportadora encontrada.");
    setOpcoesFreteCotadas(opcoes);
  };

  const selecionarEtiquetaMaisBarata = async (opcaoFrete: any) => {
    if (!db || !pedidoSelecionadoParaFrete || !lojistaIdApp) return;

    try {
      const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", pedidoSelecionadoParaFrete.id);
      const novoMetodo = `Logística: ${opcaoFrete.name}`;

      // 1. Atualiza Firebase
      await updateDoc(pedidoRef, {
        "financeiro.metodo": novoMetodo,
        "financeiro.dsTransportadoraId": String(opcaoFrete.id)
      });

      // 2. Atualiza ESTADO LOCAL com o nome correto do campo
      setLocalPedidos(prev => prev.map(p => p.id === pedidoSelecionadoParaFrete.id ? {
        ...p,
        financeiro: {
          ...p.financeiro,
          metodo: novoMetodo,
          dsTransportadoraId: String(opcaoFrete.id) // <--- O nome que o card espera
        }
      } : p));

      setPedidoSelecionadoParaFrete(null);
    } catch (e: any) {
      alert("Erro ao selecionar: " + e.message);
    }
  };

  const resetarEtiqueta = async (pedido: Pedido) => {
    if (!confirm("⚠️ Resetar etiqueta? Isso permitirá cotar novamente.")) return;
    try {
      const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", pedido.id);

      // Identifica se é frete grátis da campanha original
      const isOriginalmenteFreteGratis = pedido.financeiro?.dsTransportadoraId === "frete_gratis_ativado" || pedido.financeiro?.freteGratis;

      await updateDoc(pedidoRef, {
        etiquetaGerada: false,
        statusEtiqueta: null,
        urlEtiqueta: null,
        "financeiro.dsTransportadoraId": isOriginalmenteFreteGratis ? "frete_gratis_ativado" : null,
        "financeiro.metodo": null
      });
      // 2. Atualiza o estado local para forçar a renderização imediata
      setLocalPedidos(prev => prev.map(p => p.id === pedido.id ? {
        ...p,
        etiquetaGerada: false,
        statusEtiqueta: undefined,
        financeiro: {
          ...p.financeiro,
          dstransportadoraId: p.financeiro?.freteGratis ? "frete_gratis_ativado" : undefined,
          metodo: undefined
        }
      } : p));

      alert("✅ Etiqueta resetada!");
    } catch (e: any) {
      alert("Erro ao resetar: " + e.message);
    }
  };

  const resetarStatusErro = (pedido: Pedido) => {
    setLocalPedidos(prev => prev.map(p => p.id === pedido.id ? {
      ...p,
      statusPagamento: undefined,
      erroPagamento: undefined
    } : p));
  };

  const tentarPagamento = async (pedido: Pedido) => {
    try {
      const res = await fetch("/api/frete/tentar-pagamento", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        // CORREÇÃO AQUI ABAIXO:
        body: JSON.stringify({
          lojistaId: lojistaIdApp,
          pedidoId: pedido.id,
          transportadoraId: pedido.financeiro?.dsTransportadoraId // Alterado de .transportadoraId para .dsTransportadoraId
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Pagamento processado!");
        window.location.reload();
      } else {
        alert("⚠️ Falha ao pagar.");
      }
    } catch (e) {
      alert("Erro de comunicação.");
    }
  };

  const gerarEtiquetasEmMassa = async () => {
    // 1. Filtrar baseando-se no que está visível na tela e selecionado
    const pedidosParaGerar = pedidosPaginados.filter(p => {
      const estaSelecionado = selecionados.includes(p.id);

      // Verifica se tem transportadora (seja string ou número)
      const idTransporte = String(p.financeiro?.dsTransportadoraId || "");
      const temTransportadora = idTransporte.length > 0 && idTransporte !== "frete_gratis_ativado";

      const jaGerada = p.etiquetaGerada === true;
      const concluido = p.status === 'Concluído';

      return estaSelecionado && temTransportadora && !jaGerada && !concluido;
    });

    if (pedidosParaGerar.length === 0) {
      alert("⚠️ Nenhum pedido apto para geração selecionado nesta página.");
      return;
    }

    setModalProgresso({
      aberto: true,
      titulo: "Gerando etiquetas...",
      itens: pedidosParaGerar.map(p => ({
        id: p.id,
        numero: String(p.numeroPedido || p.numero || p.id.slice(-4)),
        status: 'processando'
      }))
    });

    setProcessandoMassa(true);

    for (const pedido of pedidosParaGerar) {
      try {
        const res = await fetch("/api/frete/gerar-massa", {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lojistaId: lojistaIdApp, orders: [pedido] })
        });

        const data = await res.json();
        const sucesso = data.success;

        setModalProgresso(prev => ({
          ...prev,
          itens: prev.itens.map(i => i.id === pedido.id ? {
            ...i,
            status: sucesso ? 'sucesso' : 'erro',
            mensagem: sucesso ? "" : (data.errors?.[0]?.message || data.error || "Erro na geração")
          } : i)
        }));

        if (sucesso) {
          // Atualiza localmente o status do pedido para 'paga' ou 'pendente'
          setLocalPedidos(prev => prev.map(p => p.id === pedido.id ? {
            ...p,
            etiquetaGerada: true,
            statusEtiqueta: 'paga'
          } : p));

        } else {
          // AQUI: Atualiza o estado para exibir o card de erro na tela
          setLocalPedidos(prev => prev.map(p => p.id === pedido.id ? {
            ...p,
            etiquetaGerada: false,
            statusPagamento: 'erro', // Isso ativa o card vermelho
            erroPagamento: data.errors?.[0]?.message || data.message || "Erro no checkout"
          } : p));
        }

      } catch (err) {
        setModalProgresso(prev => ({
          ...prev,
          itens: prev.itens.map(i => i.id === pedido.id ? {
            ...i,
            status: 'erro',
            // Usamos false, pois se caiu no catch, houve erro na requisição
            mensagem: "Erro de rede ou falha na API"
          } : i)
        }));
      }
    }
    setProcessandoMassa(false);
    setSelecionados([]); // Limpa a seleção após o processamento
  };

  // 2. PAGAMENTO PENDENTES (Mantido e estável)
  const pagarPendentes = async () => {
    const pedidosPendentes = localPedidos.filter(p => p.etiquetaGerada && p.statusEtiqueta === 'pendente');
    if (pedidosPendentes.length === 0) return;

    if (!confirm(`⚠️ Você tem ${pedidosPendentes.length} etiquetas pendentes de pagamento. Deseja continuar?`)) return;

    setModalProgresso({
      aberto: true,
      titulo: "Pagando Etiquetas...",
      itens: pedidosPendentes.map(p => ({
        id: p.id,
        numero: String(p.numeroPedido || p.id.slice(-4)),
        status: 'processando'
      }))
    });

    for (const pedido of pedidosPendentes) {
      try {
        const res = await fetch("/api/frete/tentar-pagamento", {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lojistaId: lojistaIdApp, pedidoId: pedido.id })
        });
        const data = await res.json();

        setModalProgresso(prev => ({
          ...prev,
          itens: prev.itens.map(i => i.id === pedido.id ? {
            ...i,
            status: data.success ? 'sucesso' : 'erro',
            mensagem: data.success ? "" : (data.message || "Falha no pagamento")
          } : i)
        }));
      } catch (e) {
        setModalProgresso(prev => ({
          ...prev,
          itens: prev.itens.map(i => i.id === pedido.id ? { ...i, status: 'erro', mensagem: "Erro de comunicação" } : i)
        }));
      }
    }
  };

  const dispararSegurancaDeletar = (pedido: Pedido) => { setPedidoParaDeletar(pedido); setConfirmacaoTexto(""); };

  const ejecutarExclusaoPermanente = async () => {
    if (!db || !lojistaIdApp || !pedidoParaDeletar) return;
    const identificador = pedidoParaDeletar.numeroPedido ? String(pedidoParaDeletar.numeroPedido) : pedidoParaDeletar.id.slice(-4);
    if (confirmacaoTexto !== identificador) return alert("Incorreto.");
    if (!confirm("⚠️ ATENÇÃO: Ação IRREVERSÍVEL.")) return;
    try {
      await deleteDoc(doc(db, "lojistas", lojistaIdApp, "pedidos", pedidoParaDeletar.id));
      setLocalPedidos(prev => prev.filter(p => p.id !== pedidoParaDeletar.id));
      setPedidoParaDeletar(null);
      alert("💥 Pedido excluído!");
    } catch (error) { }
  };

  // 1. Modelo para Separação (Sua lista antiga adaptada)
  const imprimirListaSeparacao = () => {
    if (selecionados.length === 0) {
      return alert("⚠️ Nenhum pedido selecionado! Marque os pedidos na lista.");
    }

    const pToPrint = localPedidos.filter(p => selecionados.includes(p.id));

    const win = window.open("", "_blank", "width=800,height=900");
    if (win) {
      const lines = pToPrint.map(p => {
        const clienteNome = typeof p.cliente === 'object' ? p.cliente.nome : p.cliente;

        return `
        <tr style="border-bottom: 1px solid #000;">
          <td style="padding: 4px; font-size: 12px; font-weight: bold; vertical-align: top;">#${p.numeroPedido || p.numero || p.id.slice(-4)}</td>
          <td style="padding: 4px; font-size: 12px; vertical-align: top;">${clienteNome}</td>
          <td style="padding: 4px; font-size: 12px; vertical-align: top;">
            ${p.itens.map(i => `
              <div style="margin-bottom: 6px; border-bottom: 1px dotted #ccc; padding-bottom: 2px;">
                <strong>${i.nome || i.title}</strong> (${i.quantidade || i.qty || 1}x)<br>
                <small style="color: #000; font-weight: bold;">SKU: ${i.sku || 'N/A'}</small>
                ${i.variacao ? `<br><small style="color: #444;">Var: ${i.variacao}</small>` : ''}
                ${i.respostasFormatadas ? `<br><small style="color: #444;">${Object.entries(i.respostasFormatadas).map(([k, v]) => `${k}: ${v}`).join(', ')}</small>` : ''}
              </div>
            `).join('')}
          </td>
        </tr>
      `;
      }).join('');

      win.document.write(`
      <html>
        <head>
          <style>
            body { font-family: sans-serif; margin: 5mm; }
            table { width: 100%; border-collapse: collapse; }
            th { border-bottom: 2px solid #000; padding: 4px; font-size: 12px; text-align: left; }
          </style>
        </head>
        <body>
          <h3 style="margin: 0 0 10px 0; font-size: 16px;">Lista de Separação (${pToPrint.length} pedidos)</h3>
          <table>
            <thead>
              <tr><th>Pedido</th><th>Cliente</th><th>Produto / SKU / Detalhes</th></tr>
            </thead>
            <tbody>${lines}</tbody>
          </table>
          <script>
            window.onload = () => { window.print(); window.onafterprint = () => window.close(); };
          </script>
        </body>
      </html>
    `);
      win.document.close();
    }
  };

  // 2. Modelo para Etiquetas A6 (4 por folha A4)
  const imprimirEtiquetas = () => {
    // Filtra apenas os que possuem etiqueta gerada
    const pToPrint = selecionados.length > 0
      ? localPedidos.filter(p => selecionados.includes(p.id) && p.etiquetaGerada && p.urlEtiqueta)
      : localPedidos.filter(p => p.etiquetaGerada && p.urlEtiqueta);

    if (pToPrint.length === 0) return alert("Nenhum pedido selecionado possui etiqueta gerada.");

    const win = window.open("", "_blank", "width=800,height=900");
    if (win) {
      win.document.write(`
        <html>
          <head>
            <style>
              @page { size: A4; margin: 0; }
              body { margin: 0; padding: 0; display: flex; flex-wrap: wrap; }
              .etiqueta { width: 105mm; height: 148mm; border: 1px solid #eee; box-sizing: border-box; overflow: hidden; }
              @media print { .etiqueta { page-break-inside: avoid; } }
            </style>
          </head>
          <body>
            ${pToPrint.map(p => `
              <div class="etiqueta">
                <img src="${p.urlEtiqueta}" style="width:100%; height:100%; object-fit: contain;"/>
              </div>
            `).join('')}
            <script>window.print(); window.onafterprint=()=>window.close();</script>
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  return (
    <div style={styles.contentArea}>
      <div style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ fontSize: '20px', color: '#1e293b', margin: 0, fontWeight: 800 }}>📋 Gestão de Pedidos</h2>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={styles.checkboxLabelGlobal}>
            <input
              type="checkbox"
              onChange={toggleSelectAll}
              checked={pedidosPaginados.length > 0 && pedidosPaginados.every(p => selecionados.includes(p.id))}
              style={{ transform: 'scale(1.2)' }}
            />
            <span style={{ marginLeft: '6px', fontWeight: 'bold' }}>Selecionar Página</span>
          </label>

          <button onClick={imprimirListaSeparacao} style={{ ...styles.btnMassPrint, backgroundColor: "#34495e" }}>
            🖨️ Imprimir Pedidos
          </button>

          <button
            onClick={gerarEtiquetasEmMassa}
            disabled={processandoMassa || qtdAptosParaEtiqueta === 0}
            style={{ ...styles.btnMassPrint, backgroundColor: (processandoMassa || qtdAptosParaEtiqueta === 0) ? "#94a3b8" : "#2563eb" }}
          >
            {processandoMassa ? "⏳ Gerando..." : `🚚 Gerar ${qtdAptosParaEtiqueta} Etiquetas`}
          </button>

          <button onClick={imprimirEtiquetas} style={{ ...styles.btnMassPrint, backgroundColor: "#059669" }}>
            🖨️ Imprimir Etiquetas (A6)
          </button>

          <button onClick={async () => {
            const res = await fetch("/api/frete/sincronizar", { method: "POST", body: JSON.stringify({ lojistaId: lojistaIdApp }) });
            const data = await res.json();
            alert(`Sincronização concluída: ${data.atualizados} pedidos atualizados.`);
            window.location.reload();
          }} style={{ ...styles.btnMassPrint, backgroundColor: "#8b5cf6" }}>
            🔄 Sincronizar Pagamentos
          </button>

          {temPedidosPendentes && (
            <button
              onClick={pagarPendentes} // Agora chama a função que definimos acima
              style={{ ...styles.btnMassPrint, backgroundColor: "#eab308" }}
            >
              🔄 Pagar Pendentes
            </button>
          )}
        </div>
      </div>
      <div style={styles.filterBar}>
        <div style={styles.statusTabs}>
          {["Todos", "Pendente", "Em Produção", "Concluído"].map(s => (
            <button key={s} onClick={() => setFiltroStatus(s)} style={{ ...styles.tabBtn, backgroundColor: filtroStatus === s ? "#2c3e50" : "transparent", color: filtroStatus === s ? "#fff" : "#64748b" }}>{s}</button>
          ))}
        </div>
        <select value={filtroLogistica} onChange={(e) => setFiltroLogistica(e.target.value)} style={styles.selectLogistica}>
          <option value="todos">🗂️ Todos os Pedidos</option>
          <option value="pendentes">🏷️ Etiqueta Pendente</option>
          <option value="freteGratis">🚚 Frete Grátis</option>
          <option value="semFrete">📦 Sem Frete</option>
          <option value="retirada">🏪 Retirada Loja</option>
        </select>
        <select value={ordenacao} onChange={(e) => setOrdenacao(e.target.value)} style={styles.selectOrdenacaoStyle}>
          <option value="recentes">📅 Mais Recentes</option>
          <option value="antigos">⏳ Mais Antigos</option>
        </select>
        <input type="text" placeholder="🔍 Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} style={styles.searchInput} />
      </div>

      <div style={localStyles.containerGridCards}>
        {loading ? <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Carregando...</div>
          : pedidosPaginados.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Nenhum pedido encontrado.</div>
            : pedidosPaginados.map((pedido) => {
              const formaEntregaStr = String(pedido.formaEntrega || '').trim().toLowerCase();
              const isRetirada = pedido.retirada === true || pedido.retirarNaLoja === true || formaEntregaStr === 'retirada' || formaEntregaStr === 'retirar na loja';
              const isDigital = itemCarrinhoEhDigital(pedido);
              const ehFinalizado = pedido.status === 'Concluído';
              const podeSelecionar = !ehFinalizado;

              return (
                <div key={pedido.id} style={{ ...localStyles.cardMasterLayout, ...(ehFinalizado ? { border: '2px solid #2ecc71' } : {}) }}>
                  <div style={{ ...localStyles.faixaSuperiorCard, backgroundColor: pedido.pago ? '#2ecc71' : '#e74c3c' }}>
                    <div style={localStyles.faixaEsquerdaInfoRow}>
                      <input type="checkbox" disabled={!podeSelecionar} checked={selecionados.includes(pedido.id)} onChange={() => setSelecionados(prev => prev.includes(pedido.id) ? prev.filter(item => item !== pedido.id) : [...prev, pedido.id])} />
                      <span style={localStyles.numeroPedidoTexto}>#{String(pedido.numeroPedido || pedido.numero || pedido.id.slice(-4)).padStart(5, '0')}</span>
                      <span style={localStyles.clienteNomeTexto}>{typeof pedido.cliente === 'object' ? pedido.cliente.nome : pedido.cliente}</span>
                      <span style={localStyles.enderecoTexto}>{[pedido.endereco?.rua, pedido.endereco?.numero, pedido.endereco?.cidade].filter(Boolean).join(", ")}</span>
                      <span style={localStyles.dataTexto}>🕒 {formatarData(pedido.data || (pedido.cliente as any)?.data)}</span>
                    </div>
                    <button disabled={ehFinalizado} onClick={() => alternarPago(pedido)} style={localStyles.badgeNaoPago}>
                      {pedido.pago ? "✅ PAGO" : "❌ NÃO PAGO"}
                    </button>
                  </div>

                  <div style={localStyles.corpoCardInterno}>
                    <div style={localStyles.colunaEspecificacoesCentro}>
                      {pedido.itens?.map((item, idx) => <LinhaItemProduto key={idx} item={item} lojistaId={lojistaIdApp} isRetirada={isRetirada} db={db} />)}
                    </div>
                    <div style={localStyles.colunaControlesDireita}>
                      {/* CARD DE LOGÍSTICA COM LÓGICA DE ESTADOS */}



                      <div style={localStyles.cardLogistica}>


                        {/* 2. CASO: ETIQUETA JÁ GERADA (Card Verde de sucesso) */}
                        {pedido.etiquetaGerada && (
                          <div style={{ backgroundColor: pedido.statusEtiqueta === 'paga' ? '#ecfdf5' : '#fef3c7', padding: '8px', borderRadius: '6px', border: `1px solid ${pedido.statusEtiqueta === 'paga' ? '#a7f3d0' : '#fbbf24'}` }}>
                            <div style={{ fontWeight: 'bold', color: pedido.statusEtiqueta === 'paga' ? '#065f46' : '#92400e', fontSize: '11px', marginBottom: '4px' }}>
                              {pedido.statusEtiqueta === 'paga' ? '✅ Etiqueta Gerada Ok' : '⏳ Pendente de Pagamento'}
                            </div>
                            {pedido.idEtiquetaMelhorEnvio && (
                              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>Cód. Envio: <b>{pedido.idEtiquetaMelhorEnvio}</b></div>
                            )}
                            <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '6px' }}>Numero de Rastreio</div>
                            <div style={{ backgroundColor: '#fff', padding: '4px', marginTop: '2px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '11px' }}>
                              {pedido.dsNumRastreio || "Aguardando..."}
                            </div>
                            <button onClick={() => resetarEtiqueta(pedido)} style={{ ...localStyles.btnReset, display: 'block', width: '100%', fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
                              🗑️ Resetar Etiqueta
                            </button>
                          </div>
                        )}

                        {/* 3. CASO: FRETE GRÁTIS PROMOCIONAL (Visual Sem título-4) */}
                        {!pedido.etiquetaGerada && pedido.financeiro?.isFreteGratis === true && (
                          <div style={{ padding: '8px', borderRadius: '6px', border: '1px solid #2ecc71', backgroundColor: '#f0fdf4', textAlign: 'center' }}>
                            <div style={{ color: '#065f46', fontWeight: 'bold', fontSize: '11px', marginBottom: '5px' }}>✅ Frete Grátis Promocional</div>

                            {/* Se NÃO tem transportadora escolhida, mostra o botão de Cotação */}
                            {!pedido.financeiro?.dsTransportadoraId || pedido.financeiro?.dsTransportadoraId === "frete_gratis_ativado" ? (
                              <button onClick={() => abrirJanelaCotacao(pedido)} style={{ ...localStyles.btnReset, color: '#065f46', fontSize: '11px', display: 'block', width: '100%', fontWeight: 'bold' }}>
                                🚚 Cotar Transportadora
                              </button>
                            ) : (
                              /* Se JÁ TEM transportadora (após cotar), mostra o botão de Gerar Etiqueta */
                              <>
                                <div style={{ fontSize: '12px', color: '#065f46', marginBottom: '5px' }}>
                                  Selecionado: <b>{pedido.financeiro.metodo?.replace('Logística: ', '')}</b>
                                </div>

                                {/* Botão de Reset com confirmação */}
                                <button onClick={() => resetarEtiqueta(pedido)} style={{ ...localStyles.btnReset, color: '#991b1b', fontSize: '12px', marginTop: '5px' }}>
                                  🔄 Resetar Cotação
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {/* 4. CASO: NÃO GERADO - TRANSPORTADORA DEFINIDA (Visual Sem título-5) */}
                        {!pedido.etiquetaGerada && pedido.financeiro?.isFreteGratis === false && (
                          <div style={{ padding: '8px', borderRadius: '6px', border: '1px solid #fef3c7', backgroundColor: '#fffbeb', textAlign: 'center' }}>
                            <div style={{ color: '#92400e', fontSize: '11px' }}>Selecionado: <b>{pedido.financeiro.dsMetodoPagamento?.replace('Logística: ', '')}</b></div>
                          </div>
                        )}
                      </div>

                      {/* Select de Status */}
                      <select
                        disabled={ehFinalizado}
                        value={pedido.status}
                        onChange={(e) => mudarStatusDireto(pedido, e.target.value)}
                        style={{ ...localStyles.selectStatusAmarelo, backgroundColor: ehFinalizado ? '#2ecc71' : getStatusColor(pedido.status) }}
                      >
                        <option value="Pendente">⏳ PENDENTE</option>
                        <option value="Em Produção">🛠️ EM PRODUÇÃO</option>
                        <option value="Concluído">✅ CONCLUÍDO</option>
                      </select>

                      {/* Botão Remover */}
                      <button onClick={() => dispararSegurancaDeletar(pedido)} style={localStyles.btnRemoverTransparente}>
                        🗑️ Remover Pedido
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
      {totalPaginas > 1 && (
        <div style={styles.paginationContainer}>
          <button disabled={paginaAtual === 1} onClick={() => setPaginaAtual(p => p - 1)} style={styles.pageBtn}>Anterior</button>
          <span style={{ margin: '0 15px' }}>Página {paginaAtual} de {totalPaginas}</span>
          <button disabled={paginaAtual === totalPaginas} onClick={() => setPaginaAtual(p => p + 1)} style={styles.pageBtn}>Próxima</button>
        </div>
      )}

      {pedidoSelecionadoParaFrete && (
        <div style={localStyles.modalOverlayCentroFix}>
          <div style={localStyles.modalContentCentroCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px' }}>📦 Logística</h3>
              <button onClick={() => setPedidoSelecionadoParaFrete(null)} style={styles.modalCloseBtn}>✕</button>
            </div>
            {loadingFreteAdmin ? <p>Consultando frete...</p> : opcoesFreteCotadas.map((opt) => (
              <div key={opt.id} onClick={() => selecionarEtiquetaMaisBarata(opt)} style={styles.opcaoFreteCard}>
                <div>{opt.name}</div><b>R$ {Number(opt.price).toFixed(2)}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      {pedidoParaDeletar && (
        <div style={localStyles.modalOverlayCentroFix}>
          <div style={{ ...localStyles.modalContentCentroCard, borderTop: '5px solid #ef4444' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#ef4444' }}>⚠️ EXCLUSÃO DEFINITIVA</h3>
            <input type="text" placeholder={`Digite ${pedidoParaDeletar.numeroPedido || pedidoParaDeletar.id.slice(-4)}...`} value={confirmacaoTexto} onChange={(e) => setConfirmacaoTexto(e.target.value)} style={{ ...styles.searchInput, width: '100%', marginBottom: '20px', padding: '10px' }} />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setPedidoParaDeletar(null)} style={{ ...styles.tabBtn, background: '#e2e8f0', border: 'none', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={ejecutarExclusaoPermanente} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Confirmar e Excluir</button>
            </div>
          </div>
        </div>
      )}

      <ModalProcessamento
        aberto={modalProgresso.aberto}
        titulo={modalProgresso.titulo}
        itens={modalProgresso.itens}
        onFechar={() => {
          setModalProgresso(prev => ({ ...prev, aberto: false }));
          window.location.reload();
        }}
      />
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  contentArea: { padding: '20px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' },
  header: { marginBottom: '20px' },
  checkboxLabelGlobal: { display: 'flex', alignItems: 'center', fontSize: '14px', color: '#475569', cursor: 'pointer' },
  btnMassPrint: { padding: '8px 16px', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' },
  filterBar: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px', backgroundColor: '#fff', padding: '12px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  statusTabs: { display: 'flex', gap: '5px' },
  tabBtn: { padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
  selectLogistica: { padding: '7px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', cursor: 'pointer' },
  selectOrdenacaoStyle: { padding: '7px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', cursor: 'pointer' },
  searchInput: { padding: '7px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', flex: 1 },
  modalCloseBtn: { background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' },
  opcaoFreteCard: { padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', marginBottom: '8px', cursor: 'pointer' },
  paginationContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', marginTop: '10px' },
  pageBtn: { padding: '8px 16px', cursor: 'pointer', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold' }
};

const localStyles: { [key: string]: React.CSSProperties } = {
  containerGridCards: { display: 'flex', flexDirection: 'column', gap: '20px' },
  cardMasterLayout: { backgroundColor: '#f8fafc', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' },
  faixaSuperiorCard: { padding: '12px 16px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  faixaEsquerdaInfoRow: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  numeroPedidoTexto: { fontSize: '15px', fontWeight: 'bold' },
  clienteNomeTexto: { fontSize: '14px', fontWeight: 'bold' },
  enderecoTexto: { fontSize: '13px', opacity: 0.9 },
  dataTexto: { fontSize: '12px', opacity: 0.8 },
  badgeNaoPago: { padding: '6px 12px', backgroundColor: 'transparent', border: '2px solid rgba(255,255,255,0.6)', borderRadius: '6px', color: '#fff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
  corpoCardInterno: { padding: '12px', display: 'flex', gap: '16px', alignItems: 'stretch' },
  colunaEspecificacoesCentro: { flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' },
  itemCardWhiteBox: { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'flex', gap: '16px' },
  imageContainer: { position: 'relative', width: '80px', height: '80px', flexShrink: 0 },
  productImage: { width: '100%', height: '100%', borderRadius: '6px', objectFit: 'cover', transition: 'opacity 0.3s' },
  productImagePlaceholder: { width: '100%', height: '100%', backgroundColor: '#e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' },
  imageCrossBadge: { position: 'absolute', top: '-6px', right: '-6px', backgroundColor: '#1e293b', color: '#fff', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '10px', fontWeight: 'bold' },
  itemDetailsCol: { display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  itemTitleRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '15px', fontWeight: 'bold', color: '#1e293b' },
  badgeEnvioStyle: { padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' },
  personalizacaoText: { fontSize: '13px', color: '#b45309', lineHeight: '1.5' },
  colunaControlesDireita: { width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'flex-start', borderLeft: '1px solid #e2e8f0', paddingLeft: '12px' },
  btnGerarEtiquetaBranco: { padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', color: '#334155' },
  selectStatusAmarelo: { padding: '10px', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center', appearance: 'none' },
  btnRemoverTransparente: { padding: '10px', backgroundColor: 'transparent', border: '1px solid #ef4444', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' },
  cardLogistica: { padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'center', backgroundColor: '#f9fafb', marginBottom: '10px' },
  cardEtiquetaSucesso: { padding: '10px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', color: '#065f46', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' },
  btnReset: { background: 'none', border: 'none', color: '#059669', textDecoration: 'underline', marginTop: '4px', cursor: 'pointer' },
  modalOverlayCentroFix: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modalContentCentroCard: { backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '90%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }
};