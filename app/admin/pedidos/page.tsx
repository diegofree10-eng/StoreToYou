'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useFrete } from "@/hooks/useFrete";
import ModalProcessamento from './ModalProcessamento';

// Importação da tipagem centralizada unificada
import { Pedido, ItemPedido, Financeiro, Logistica, Endereco, Cliente } from '@/types/pedido';

// Importação de todas as abas correspondentes
import TabTodosPedidos from './_tabsGestaoPedidos/TabTodosPedidos';
import TabCotarFrete from './_tabsGestaoPedidos/TabCotarFrete';
import TabEmitirEtiquetas from './_tabsGestaoPedidos/TabEmitirEtiquetas';
import TabSeparacaoImpressao from './_tabsGestaoPedidos/TabSeparacaoImpressao';
import TabProntoPedidos from './_tabsGestaoPedidos/TabProntoPedidos';
import TabPedidosEnviados from './_tabsGestaoPedidos/TabPedidosEnviados';
import TabPedidosConcluidos from './_tabsGestaoPedidos/TabPedidosConcluidos';
import TabRetiradaLoja from './_tabsGestaoPedidos/TabRetiradaLoja';
import TabDigital from './_tabsGestaoPedidos/TabDigital';
import TabEntregaLocal from './_tabsGestaoPedidos/TabEntregaLocal';

export interface DadosLoja {
    CEP?: string;
    cep?: string;
    cidade?: string;
}

export interface GestaoPedidosProps {
    pedidos: Pedido[];
    loading?: boolean;
    lojistaIdApp: string;
    db: any;
    dadosLoja?: DadosLoja;
}

// 🎯 Função auxiliar estrita: quando pago e pronto, se for "entrega_local", vai para Entrega Local
const descobrirAbaDoPedido = (p: Pedido): { idAba: string; nomeAba: string } => {
    if (!p) return { idAba: 'pedidos', nomeAba: 'Pedidos' };

    const statusGeral = String(p.status || '').trim().toLowerCase();
    
    // 1. Concluídos
    if (statusGeral === 'concluído' || statusGeral === 'concluido') {
        return { idAba: 'concluidos', nomeAba: 'Concluídos' };
    }

    // 2. Enviados
    const isEnviado = 
        statusGeral === 'enviado' || 
        statusGeral === 'postado' ||
        (p as any).enviado === true || 
        (p as any).statusEnvio === 'enviado' ||
        Boolean(p.codigoRastreio || (p as any).rastreio || (p as any).logistica?.codigoRastreio);

    if (isEnviado) {
        return { idAba: 'enviados', nomeAba: 'Enviados' };
    }

    const statusProdObj = (p as any).StatusProducao || {};
    const statusProdAtual = String(statusProdObj.dsStatusProdução || p.statusProducao || '').toLowerCase();
    const isPago = Boolean(statusProdObj.isPago !== undefined ? statusProdObj.isPago : p.pago);

    // 3. Pedidos (Não pagos e não prontos)
    if (!isPago && statusProdAtual !== 'pronto') {
        return { idAba: 'pedidos', nomeAba: 'Pedidos' };
    }

    // 4. Pendente (Pago mas aguardando)
    if (statusProdAtual === 'pendente' && isPago) {
        return { idAba: 'pendente', nomeAba: 'Pendente' };
    }

    // 5. Produção
    if (statusProdAtual === 'produção' && isPago) {
        return { idAba: 'producao', nomeAba: 'Produção' };
    }

    // 6. Pronto (Pago e com status de produção pronto)
    if (statusProdAtual === 'pronto' && isPago) {
        const pedidoLogistica = (p as any).logistica || {};
        const formaEntregaLogistica = String(pedidoLogistica.dsFormaEntrega || '').trim().toLowerCase();
        const transportadoraIdLogistica = String(pedidoLogistica.dsTransportadoraId || '').trim().toLowerCase();
        
        const isRetirada = pedidoLogistica.isRetirada === true || formaEntregaLogistica === 'retirada' || transportadoraIdLogistica === 'retirada' || p.retirada || p.retirarNaLoja;
        if (isRetirada) return { idAba: 'retirada', nomeAba: 'Retirada' };

        // 🎯 REGRA EXATA SOLICITADA: Pago + Pronto + logistica.dsFormaEntrega === "entrega_local"
        const isEntregaLocal = 
            formaEntregaLogistica === 'entrega_local' || 
            formaEntregaLogistica === 'entregalocal' || 
            formaEntregaLogistica === 'motoboy' || 
            transportadoraIdLogistica === 'entrega_local' ||
            transportadoraIdLogistica === 'entregalocal' ||
            (p as any).entregaLocal === true;

        if (isEntregaLocal) return { idAba: 'entregalocal', nomeAba: 'Entrega Local' };

        const isDigital = formaEntregaLogistica === 'digital' || p.itens?.some((i: any) => i.precisaFrete === false);
        if (isDigital) return { idAba: 'digital', nomeAba: 'Digital' };

        if (!p.etiquetaGerada) {
            const transpFinanceiro = String(p.financeiro?.dsTransportadoraId || "").trim().toLowerCase();
            const transpCotacao = String((p as any).Cotacao?.dsTransportadoraIdCotado || "").trim().toLowerCase();

            const temFreteGratis = 
                transpFinanceiro === "frete_gratis_ativado" || 
                transportadoraIdLogistica === "frete_gratis_ativado" || 
                transpCotacao === "frete_gratis_ativado" ||
                pedidoLogistica.isFreteGratis === true ||
                p.financeiro?.freteGratis === true;

            const itens = Array.isArray(p.itens) ? p.itens : [];
            const temItemFisico = itens.some((item: any) => item.precisaFrete !== false);

            if (temItemFisico && !temFreteGratis) {
                const temTransportadoraReal =
                    (transpFinanceiro !== "" && transpFinanceiro !== "null" && transpFinanceiro !== "undefined" && transpFinanceiro !== "0") ||
                    (transportadoraIdLogistica !== "" && transportadoraIdLogistica !== "null" && transportadoraIdLogistica !== "undefined" && transportadoraIdLogistica !== "0") ||
                    (transpCotacao !== "" && transpCotacao !== "null" && transpCotacao !== "undefined" && transpCotacao !== "0");

                if (!temTransportadoraReal) {
                    return { idAba: 'cotar', nomeAba: 'Cotar Frete' };
                }
            }
        }
        return { idAba: 'etiquetas', nomeAba: 'Etiquetas' };
    }

    // Tratamento para pedidos sem status pronto mas que possuem forma explícita de entrega local
    const pedidoLogistica = (p as any).logistica || {};
    const formaEntregaLogistica = String(pedidoLogistica.dsFormaEntrega || '').trim().toLowerCase();
    const transportadoraIdLogistica = String(pedidoLogistica.dsTransportadoraId || '').trim().toLowerCase();
    
    const isRetirada = pedidoLogistica.isRetirada === true || formaEntregaLogistica === 'retirada' || transportadoraIdLogistica === 'retirada' || p.retirada || p.retirarNaLoja;
    if (isRetirada) return { idAba: 'retirada', nomeAba: 'Retirada' };

    const isEntregaLocal = 
        formaEntregaLogistica === 'entrega_local' || 
        formaEntregaLogistica === 'entregalocal' || 
        formaEntregaLogistica === 'motoboy' || 
        transportadoraIdLogistica === 'entrega_local' ||
        transportadoraIdLogistica === 'entregalocal' ||
        (p as any).entregaLocal === true;

    if (isEntregaLocal) return { idAba: 'entregalocal', nomeAba: 'Entrega Local' };

    const isDigital = formaEntregaLogistica === 'digital' || p.itens?.some((i: any) => i.precisaFrete === false);
    if (isDigital) return { idAba: 'digital', nomeAba: 'Digital' };

    return { idAba: 'pedidos', nomeAba: 'Pedidos' };
};

export default function GestaoPedidos({
    pedidos = [], loading = false, lojistaIdApp, db, dadosLoja
}: GestaoPedidosProps) {

    const [abaAtiva, setAbaAtiva] = useState<string>('pedidos');

    const [selecionados, setSelecionados] = useState<string[]>([]);
    const [busca, setBusca] = useState("");
    const [termoBuscaAtivo, setTermoBuscaAtivo] = useState(""); 
    const [filtroLogistica, setFiltroLogistica] = useState("todos");
    const [ordenacao, setOrdenacao] = useState("recentes");
    const [processandoMassaStatus, setProcessandoMassaStatus] = useState(false);

    const [localPedidos, setLocalPedidos] = useState<Pedido[]>(pedidos);
    useEffect(() => { setLocalPedidos(pedidos); }, [pedidos]);

    const [idsConhecidos, setIdsConhecidos] = useState<string[]>(() => {
        if (typeof window === 'undefined') return [];
        const salvo = localStorage.getItem(`ids_conhecidos_pedidos_${lojistaIdApp}`);
        return salvo ? JSON.parse(salvo) : [];
    });

    const lidarComCliqueAbaPedidos = () => {
        setAbaAtiva('pedidos');
        setTermoBuscaAtivo("");
        
        if (localPedidos.length > 0) {
            const idsAtuaisDaAba = localPedidos.filter(p => descobrirAbaDoPedido(p).idAba === 'pedidos').map(p => p.id);
            setIdsConhecidos(idsAtuaisDaAba);
            localStorage.setItem(`ids_conhecidos_pedidos_${lojistaIdApp}`, JSON.stringify(idsAtuaisDaAba));
        }
    };

    const searchContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setBusca(""); 
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const [modalProgresso, setModalProgresso] = useState<{
        aberto: boolean;
        titulo: string;
        itens: { id: string; numero: string; status: 'processando' | 'sucesso' | 'erro'; mensagem?: string }[];
    }>({ aberto: false, titulo: "", itens: [] });

    const [pedidoParaDeletar, setPedidoParaDeletar] = useState<Pedido | null>(null);
    const [confirmacaoTexto, setConfirmacaoTexto] = useState("");

    const [textoDigitadoMassa, setTextoDigitadoMassa] = useState("");
    const [modalExclusaoMassaAberto, setModalExclusaoMassaAberto] = useState(false);

    const { cotarFrete } = useFrete(lojistaIdApp, dadosLoja);

    const estornarEstoqueDoPedido = async (pedido: Pedido) => {
        if (!pedido || !Array.isArray(pedido.itens) || pedido.itens.length === 0) return;

        for (const item of pedido.itens) {
            const produtoId = item.idProduto || item.id;
            if (!produtoId) continue;

            const prodRef = doc(db, "lojistas", lojistaIdApp, "produtos", produtoId);
            const prodSnap = await getDoc(prodRef);

            if (!prodSnap.exists()) continue;
            const dadosProd = prodSnap.data();
            const qtdEstornar = Number(item.qty || item.quantidade || 1);
            const nomeVar = item.variacao || (item as any).nomeVariacao;

            if (nomeVar && nomeVar !== "Produto Único" && Array.isArray(dadosProd.variacoes)) {
                const novasVariacoes = dadosProd.variacoes.map((v: any) => {
                    if (v.nome === nomeVar) {
                        const estoqueAtual = Number(v.estoque || 0);
                        const novoEstoque = estoqueAtual + qtdEstornar;
                        return { ...v, estoque: String(novoEstoque) };
                    }
                    return v;
                });
                await updateDoc(prodRef, { variacoes: novasVariacoes });
            } else {
                const estoqueAtual = Number(dadosProd.estoque || 0);
                const novoEstoque = estoqueAtual + qtdEstornar;
                await updateDoc(prodRef, { estoque: String(novoEstoque) });
            }
        }
    };

    const novosPedidosCount = useMemo(() => {
        const pedidosNaAbaPedidos = localPedidos.filter(p => {
            if (!p) return false;
            return descobrirAbaDoPedido(p).idAba === 'pedidos';
        });

        const novos = pedidosNaAbaPedidos.filter(p => !idsConhecidos.includes(p.id));
        return novos.length;
    }, [localPedidos, idsConhecidos]);

    useEffect(() => {
        if (lojistaIdApp) {
            localStorage.setItem(`contador_novos_pedidos_${lojistaIdApp}`, String(novosPedidosCount));
        }
    }, [novosPedidosCount, lojistaIdApp]);

    const contadoresAbas = useMemo(() => {
        const counts: { [key: string]: number } = {
            pedidos: 0, pendente: 0, producao: 0, cotar: 0, etiquetas: 0, retirada: 0, entregalocal: 0, digital: 0, enviados: 0, concluidos: 0
        };

        localPedidos.forEach(p => {
            if (!p) return;
            const abaInfo = descobrirAbaDoPedido(p).idAba;
            counts[abaInfo] = (counts[abaInfo] || 0) + 1;
        });

        return counts;
    }, [localPedidos]);

    const verificarMatchBusca = (p: Pedido, termo: string): boolean => {
        const numPedidoStr = p.numeroPedido !== undefined && p.numeroPedido !== null ? String(p.numeroPedido) : (p.numero !== undefined && p.numero !== null ? String(p.numero) : "");
        const idStr = String(p.id || "").toLowerCase();
        
        const clienteNome = typeof p.cliente === 'object' 
            ? String(p.cliente.nome || p.cliente.nmNomeCliente || "").toLowerCase() 
            : String(p.cliente || "").toLowerCase();

        const nomeComecaComTermo = clienteNome.trim().startsWith(termo);
        const itensNomes = (p.itens || []).map(i => String(i.nome || i.title || "").toLowerCase());
        const itemComecaComTermo = itensNomes.some(item => item.trim().startsWith(termo));

        const numeroBate = numPedidoStr.toLowerCase().startsWith(termo);
        const idBate = idStr.startsWith(termo);

        return nomeComecaComTermo || numeroBate || idBate || itemComecaComTermo;
    };

    const resultadosBuscaMenu = useMemo(() => {
        const termo = busca.toLowerCase().trim();
        if (!termo || termo.length < 2) return [];

        return localPedidos.filter(p => {
            if (!p) return false;
            return verificarMatchBusca(p, termo);
        }).slice(0, 8);
    }, [busca, localPedidos]);

    const selecionarPedidoDoMenu = (pedidoSelecionado: Pedido) => {
        const abaDestino = descobrirAbaDoPedido(pedidoSelecionado).idAba;
        const numPedidoStr = pedidoSelecionado.numeroPedido !== undefined && pedidoSelecionado.numeroPedido !== null 
            ? String(pedidoSelecionado.numeroPedido) 
            : (pedidoSelecionado.numero !== undefined && pedidoSelecionado.numero !== null ? String(pedidoSelecionado.numero) : pedidoSelecionado.id);

        if (abaDestino === 'pedidos') {
            lidarComCliqueAbaPedidos();
        } else {
            setAbaAtiva(abaDestino);
        }
        setTermoBuscaAtivo(numPedidoStr); 
        setBusca(""); 
    };

    const pedidosFiltradosGlobais = useMemo(() => {
        return localPedidos.filter(p => {
            if (!p) return false;

            const statusGeral = String(p.status || '').trim().toLowerCase();
            const statusProdObj = (p as any).StatusProducao || {};
            const statusProdAtual = String(statusProdObj.dsStatusProdução || p.statusProducao || '').toLowerCase();
            const isPago = Boolean(statusProdObj.isPago !== undefined ? statusProdObj.isPago : p.pago);

            if (abaAtiva === 'concluidos') {
                if (statusGeral !== 'concluído' && statusGeral !== 'concluido') return false;
            } else {
                if (statusGeral === 'concluído' || statusGeral === 'concluido') return false;
            }

            if (abaAtiva === 'pedidos') {
                if (isPago || statusProdAtual === 'pronto') return false;
            } else if (abaAtiva === 'pendente') {
                if (!(statusProdAtual === 'pendente' && isPago)) return false;
            } else if (abaAtiva === 'producao') {
                if (!(statusProdAtual === 'produção' && isPago)) return false;
            } else if (abaAtiva === 'cotar') {
                if (p.etiquetaGerada || statusGeral === 'concluído' || statusGeral === 'concluido') return false;
                if (statusProdAtual !== 'pronto') return false;
                
                const itens = Array.isArray(p.itens) ? p.itens : [];
                const temItemFisico = itens.some((item: any) => item.precisaFrete !== false);
                if (!temItemFisico) return false;

                const transpFinanceiro = String(p.financeiro?.dsTransportadoraId || "").trim();
                const transpLogistica = String((p as any).logistica?.dsTransportadoraId || "").trim();
                const transpCotacao = String((p as any).Cotacao?.dsTransportadoraIdCotado || "").trim();

                const temFreteGratis = 
                    transpFinanceiro === "frete_gratis_ativado" || 
                    transpLogistica === "frete_gratis_ativado" || 
                    transpCotacao === "frete_gratis_ativado" ||
                    (p as any).logistica?.isFreteGratis === true ||
                    p.financeiro?.freteGratis === true;

                if (!temFreteGratis) {
                    const temTransportadoraReal =
                        (transpFinanceiro !== "" && transpFinanceiro !== "null" && transpFinanceiro !== "undefined" && transpFinanceiro !== "0") ||
                        (transpLogistica !== "" && transpLogistica !== "null" && transpLogistica !== "undefined" && transpLogistica !== "0") ||
                        (transpCotacao !== "" && transpCotacao !== "null" && transpCotacao !== "undefined" && transpCotacao !== "0");
                    
                    if (temTransportadoraReal) return false;
                }
            } else if (abaAtiva === 'etiquetas') {
                if (p.status === 'Concluído' || p.status === 'enviado' || (p as any).enviado === true) return false;

                const transpFinanceiro = String(p.financeiro?.dsTransportadoraId || "").trim();
                const transpLogistica = String((p as any).logistica?.dsTransportadoraId || "").trim();
                const transpCotacao = String((p as any).Cotacao?.dsTransportadoraIdCotado || "").trim();

                if (transpFinanceiro === "frete_gratis_ativado" || transpLogistica === "frete_gratis_ativado" || transpCotacao === "frete_gratis_ativado") {
                    return false;
                }

                const temTransportadoraId =
                    (transpFinanceiro !== "" && transpFinanceiro !== "null" && transpFinanceiro !== "undefined" && transpFinanceiro !== "0") ||
                    (transpLogistica !== "" && transpLogistica !== "null" && transpLogistica !== "undefined" && transpLogistica !== "0") ||
                    (transpCotacao !== "" && transpCotacao !== "null" && transpCotacao !== "undefined" && transpCotacao !== "0");

                if (!temTransportadoraId) return false;
            } else if (abaAtiva === 'enviados') {
                const isEnviado = 
                    statusGeral === 'enviado' || 
                    statusGeral === 'postado' ||
                    (p as any).enviado === true || 
                    (p as any).statusEnvio === 'enviado' ||
                    Boolean(p.codigoRastreio || (p as any).rastreio || (p as any).logistica?.codigoRastreio);
                if (!isEnviado) return false;
            } else if (abaAtiva === 'retirada') {
                const pedidoLogistica = (p as any).logistica || {};
                const forma = String(pedidoLogistica.dsFormaEntrega || '').toLowerCase();
                const transp = String(pedidoLogistica.dsTransportadoraId || '').toLowerCase();
                const isRetirada = pedidoLogistica.isRetirada === true || forma === 'retirada' || transp === 'retirada' || p.retirada || p.retirarNaLoja;
                if (!isRetirada) return false;
            } else if (abaAtiva === 'entregalocal') {
                const pedidoLogistica = (p as any).logistica || {};
                const forma = String(pedidoLogistica.dsFormaEntrega || '').toLowerCase();
                const transp = String(pedidoLogistica.dsTransportadoraId || '').toLowerCase();
                const isEntregaLocal = forma === 'entrega_local' || forma === 'entregalocal' || forma === 'motoboy' || transp === 'entrega_local' || transp === 'entregalocal' || (p as any).entregaLocal === true;
                if (!isEntregaLocal) return false;
            } else if (abaAtiva === 'digital') {
                const pedidoLogistica = (p as any).logistica || {};
                const forma = String(pedidoLogistica.dsFormaEntrega || '').toLowerCase();
                const isDigital = forma === 'digital' || p.itens?.some((i: any) => i.precisaFrete === false);
                if (!isDigital) return false;
            }

            if (termoBuscaAtivo) {
                const termo = termoBuscaAtivo.toLowerCase().trim();
                if (!verificarMatchBusca(p, termo)) return false;
            }

            const formaEntregaStr = String(p.logistica?.dsFormaEntrega || p.formaEntrega || '').trim().toLowerCase();
            const ehRetirada = p.logistica?.isRetirada === true || p.retirada === true || p.retirarNaLoja === true || formaEntregaStr === 'retirada';
            const ehSemFrete = Array.isArray(p.itens) && p.itens.length > 0 ? p.itens.every(item => item.precisaFrete === true) : false;

            if (filtroLogistica === "pendentes") return p.etiquetaGerada && p.statusEtiqueta === 'pendente';
            if (filtroLogistica === "freteGratis") return (p.logistica?.isFreteGratis || p.financeiro?.freteGratis) === true;
            if (filtroLogistica === "semFrete") return ehSemFrete;
            if (filtroLogistica === "retirada") return ehRetirada;

            return true;
        }).sort((a, b) => {
            const d1 = new Date(a.data || (a.cliente as any)?.data || 0).getTime();
            const d2 = new Date(b.data || (b.cliente as any)?.data || 0).getTime();
            return ordenacao === "recentes" ? d2 - d1 : d1 - d2;
        });
    }, [localPedidos, termoBuscaAtivo, filtroLogistica, ordenacao, abaAtiva]);

    const idsVisiveisDaAba = useMemo(() => pedidosFiltradosGlobais.map(p => p.id), [pedidosFiltradosGlobais]);

    const selecionadosNestaAbaCount = useMemo(() => {
        return (selecionados || []).filter(id => idsVisiveisDaAba.includes(id)).length;
    }, [selecionados, idsVisiveisDaAba]);

    const alterarStatusMassa = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const valorAcao = e.target.value;
        if (!valorAcao) return;

        const selecionadosAtuais = selecionados || [];
        if (selecionadosAtuais.length === 0) {
            alert("Selecione ao menos um pedido.");
            e.target.value = "";
            return;
        }

        setProcessandoMassaStatus(true);
        try {
            if (valorAcao === 'pago' || valorAcao === 'nao_pago') {
                const novoPago = valorAcao === 'pago';
                const statusProdAntigo = String((localPedidos.find(p => selecionadosAtuais.includes(p.id)) as any)?.StatusProducao?.dsStatusProdução || 'pendente').toLowerCase();
                const novoStatusProd = novoPago ? 'pendente' : statusProdAntigo;

                for (const pedidoId of selecionadosAtuais) {
                    const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", pedidoId);
                    await updateDoc(pedidoRef, {
                        "StatusProducao.isPago": novoPago,
                        "StatusProducao.dsStatusProdução": novoStatusProd
                    });
                }

                setLocalPedidos(prev => prev.map(p => selecionadosAtuais.includes(p.id) ? { 
                    ...p, 
                    StatusProducao: {
                        ...(p as any).StatusProducao,
                        isPago: novoPago,
                        dsStatusProdução: novoStatusProd
                    }
                } : p));

                setSelecionados([]);
                alert(`✅ ${selecionadosAtuais.length} pedido(s) atualizado(s) para ${novoPago ? 'PAGO (Movido para Pendente)' : 'NÃO PAGO'}!`);
                if (novoPago) setAbaAtiva('pendente');
            } else {
                const pedidosInvalidos = localPedidos.filter(p => selecionadosAtuais.includes(p.id) && !Boolean((p as any).StatusProducao?.isPago));
                if (pedidosInvalidos.length > 0) {
                    alert("❌ Ação bloqueada: Esta ação não pode ser feita porque o pedido não foi pago.");
                    e.target.value = "";
                    return;
                }

                if (!confirm(`Deseja alterar o status de produção de ${selecionadosAtuais.length} pedido(s) para "${valorAcao.toUpperCase()}"?`)) {
                    e.target.value = "";
                    return;
                }

                let novaFaseDestino = valorAcao.toLowerCase();

                if (valorAcao === 'pronto') {
                    const primeiroSelecionado = localPedidos.find(p => p.id === selecionadosAtuais[0]);
                    if (primeiroSelecionado) {
                        const pedidoLogistica = (primeiroSelecionado as any).logistica || {};
                        const forma = String(pedidoLogistica.dsFormaEntrega || '').toLowerCase();
                        const transp = String(pedidoLogistica.dsTransportadoraId || '').toLowerCase();
                        
                        const isRetirada = pedidoLogistica.isRetirada === true || forma === 'retirada' || transp === 'retirada' || primeiroSelecionado.retirada || primeiroSelecionado.retirarNaLoja;
                        const isEntregaLocal = forma === 'entrega_local' || forma === 'entregalocal' || forma === 'motoboy' || transp === 'entrega_local' || transp === 'entregalocal' || (primeiroSelecionado as any).entregaLocal === true;
                        const isDigital = forma === 'digital' || primeiroSelecionado.itens?.some((i: any) => i.precisaFrete === false);
                        
                        const temTransportadoraReal = transp && transp !== "" && transp !== "null" && transp !== "undefined" && transp !== "0" && transp !== "frete_gratis_ativado" && transp !== "entrega_local" && transp !== "entregalocal";

                        if (isRetirada) {
                            setAbaAtiva('retirada');
                            novaFaseDestino = 'retirada';
                        } else if (isEntregaLocal) {
                            setAbaAtiva('entregalocal');
                            novaFaseDestino = 'entregalocal';
                        } else if (isDigital) {
                            setAbaAtiva('digital');
                            novaFaseDestino = 'digital';
                        } else if (temTransportadoraReal) {
                            setAbaAtiva('etiquetas');
                            novaFaseDestino = 'etiquetas';
                        } else {
                            setAbaAtiva('cotar');
                            novaFaseDestino = 'cotar';
                        }
                    }
                }

                for (const pedidoId of selecionadosAtuais) {
                    const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", pedidoId);
                    await updateDoc(pedidoRef, { 
                        "StatusProducao.dsStatusProdução": novaFaseDestino 
                    });
                }

                setLocalPedidos(prev => prev.map(p => selecionadosAtuais.includes(p.id) ? { 
                    ...p, 
                    StatusProducao: {
                        ...(p as any).StatusProducao,
                        dsStatusProdução: novaFaseDestino
                    }
                } : p));

                setSelecionados([]);
                alert("✅ Status de produção atualizados com sucesso!");
            }
        } catch (e: any) {
            alert("Erro ao atualizar em massa: " + e.message);
        } finally {
            setProcessandoMassaStatus(false);
            e.target.value = "";
        }
    };

    const executarExclusaoPermanente = async () => {
        if (!db || !lojistaIdApp || !pedidoParaDeletar) return;
        const identificador = pedidoParaDeletar.numeroPedido ? String(pedidoParaDeletar.numeroPedido) : pedidoParaDeletar.id.slice(-4);
        if (confirmacaoTexto !== identificador) return alert("Incorreto.");
        if (!confirm("⚠️ ATENÇÃO: Ação IRREVERSÍVEL. O estoque dos produtos será estornado.")) return;
        
        try {
            await estornarEstoqueDoPedido(pedidoParaDeletar);

            await deleteDoc(doc(db, "lojistas", lojistaIdApp, "pedidos", pedidoParaDeletar.id));
            setLocalPedidos(prev => prev.filter(p => p.id !== pedidoParaDeletar.id));
            setPedidoParaDeletar(null);
            setConfirmacaoTexto("");
            alert("💥 Pedido excluído e estoque estornado com sucesso!");
        } catch (error: any) {
            alert("Erro ao excluir: " + error.message);
        }
    };

    return (
        <div style={styles.contentArea}>
            <style jsx>{`
                @media (max-width: 768px) {
                    .gp-header-topo {
                        flex-direction: column !important;
                        align-items: stretch !important;
                        gap: 12px !important;
                    }
                    .gp-filter-bar {
                        flex-direction: column !important;
                        align-items: stretch !important;
                    }
                    .gp-filter-bar select,
                    .gp-filter-bar input {
                        width: 100% !important;
                    }
                    .gp-selection-bar {
                        flex-direction: column !important;
                        align-items: stretch !important;
                        height: auto !important;
                        padding: 12px !important;
                        gap: 12px !important;
                    }
                    .gp-selection-acoes {
                        width: 100% !important;
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 8px !important;
                    }
                    .gp-selection-acoes select {
                        width: 100% !important;
                    }
                }
            `}</style>

            <div style={styles.headerFixoContainer}>
                <div className="gp-header-topo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                    <h2 style={{ fontSize: '20px', color: '#1e293b', margin: 0, fontWeight: 800 }}>📋 Gestão de Pedidos</h2>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button onClick={async () => {
                            const res = await fetch("/api/frete/sincronizar", { method: "POST", body: JSON.stringify({ lojistaId: lojistaIdApp }) });
                            const data = await res.json();
                            alert(`Sincronização concluída: ${data.atualizados} pedidos atualizados.`);
                            window.location.reload();
                        }} style={{ padding: '8px 14px', backgroundColor: "#8b5cf6", color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', width: '100%' }}>
                            🔄 Sincronizar Pagamentos
                        </button>
                    </div>
                </div>

                <div className="gp-filter-bar" style={styles.filterBar}>
                    <select value={filtroLogistica} onChange={(e) => setFiltroLogistica(e.target.value)} style={styles.selectLogistica}>
                        <option value="todos">🗂️ Todas Logísticas</option>
                        <option value="pendentes">🏷️ Etiqueta Pendente</option>
                        <option value="freteGratis">🚚 Frete Grátis</option>
                        <option value="semFrete">📦 Sem Frete</option>
                        <option value="retirada">🏪 Retirada Loja</option>
                    </select>
                    <select value={ordenacao} onChange={(e) => setOrdenacao(e.target.value)} style={styles.selectOrdenacaoStyle}>
                        <option value="recentes">📅 Mais Recentes</option>
                        <option value="antigos">⏳ Mais Antigos</option>
                    </select>
                    
                    <div ref={searchContainerRef} style={{ display: 'flex', flex: 1, position: 'relative' }}>
                        <div style={{ display: 'flex', width: '100%', gap: '6px' }}>
                            <input
                                type="text"
                                placeholder="🔍 Digite para buscar (ex: Maria, nº pedido ou Id Pedido)..."
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                style={styles.searchInput}
                            />

                            {termoBuscaAtivo && (
                                <button
                                    onClick={() => {
                                        setTermoBuscaAtivo("");
                                        setBusca("");
                                    }}
                                    style={{
                                        backgroundColor: '#cbd5e1',
                                        color: '#1e293b',
                                        border: 'none',
                                        padding: '0 12px',
                                        borderRadius: '6px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                    title="Limpar filtro de busca ativo"
                                >
                                    ✖
                                </button>
                            )}
                        </div>

                        {resultadosBuscaMenu.length > 0 && (
                            <div style={styles.dropdownMenu}>
                                <div style={styles.dropdownHeader}>
                                    <span>🔍 Total de {resultadosBuscaMenu.length} resultado(s) encontrado(s)</span>
                                </div>
                                <div style={styles.dropdownList}>
                                    {resultadosBuscaMenu.map((p) => {
                                        const numPed = p.numeroPedido !== undefined && p.numeroPedido !== null ? p.numeroPedido : (p.numero || p.id.slice(-6));
                                        const clienteNome = typeof p.cliente === 'object' ? (p.cliente.nome || p.cliente.nmNomeCliente || "Cliente") : (p.cliente || "Cliente");
                                        const infoAba = descobrirAbaDoPedido(p).nomeAba;

                                        return (
                                            <div
                                                key={p.id}
                                                onClick={() => selecionarPedidoDoMenu(p)}
                                                style={styles.dropdownItem}
                                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
                                            >
                                                <div style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '13px' }}>
                                                    #{numPed} - <span style={{ color: '#1e293b' }}>{clienteNome}</span>
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                    Etapa/Aba: <strong style={{ color: '#059669' }}>{infoAba}</strong>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="gp-selection-bar" style={styles.selectionBar}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                            type="checkbox"
                            onChange={() => {
                                const todosEstaoSelecionados = idsVisiveisDaAba.length > 0 && idsVisiveisDaAba.every(id => (selecionados || []).includes(id));

                                if (todosEstaoSelecionados) {
                                    setSelecionados(prev => (prev || []).filter(id => !idsVisiveisDaAba.includes(id)));
                                } else {
                                    setSelecionados(prev => [...new Set([...(prev || []), ...idsVisiveisDaAba])]);
                                }
                            }}
                            checked={
                                idsVisiveisDaAba.length > 0 &&
                                idsVisiveisDaAba.every(id => (selecionados || []).includes(id))
                            }
                            style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>
                            {selecionadosNestaAbaCount > 0
                                ? `${selecionadosNestaAbaCount} selecionado${selecionadosNestaAbaCount > 1 ? 's' : ''}`
                                : `Nenhum selecionado`}
                        </span>
                    </div>

                    <div className="gp-selection-acoes" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {selecionadosNestaAbaCount > 0 && (
                            <>
                                <select
                                    disabled={processandoMassaStatus}
                                    onChange={async (e) => {
                                        const acao = e.target.value;
                                        if (!acao) return;

                                        if (acao === 'deletar') {
                                            const selecionadosAtuais = selecionados || [];
                                            if (selecionadosAtuais.length === 0) {
                                                alert("Selecione ao menos um pedido.");
                                                e.target.value = "";
                                                return;
                                            }
                                            setTextoDigitadoMassa("");
                                            setModalExclusaoMassaAberto(true);
                                            e.target.value = "";
                                            return;
                                        }

                                        alterarStatusMassa(e);
                                    }}
                                    defaultValue=""
                                    style={styles.selectAcaoMassa}
                                >
                                    <option value="" disabled>⚙️ Mudar Status / Ações...</option>
                                    <option value="pago">✅ Marcar como Pago</option>
                                    <option value="nao_pago">❌ Marcar como Não Pago</option>
                                    <option value="pendente">⏳ Status: Pendente</option>
                                    <option value="produção">⚙️ Status: Produção</option>
                                    <option value="pronto">✅ Status: Pronto</option>
                                    <option value="deletar" style={{ color: '#ef4444', fontWeight: 'bold' }}>🗑️ Excluir Pedidos</option>
                                </select>
                                <button onClick={() => setSelecionados([])} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Limpar</button>
                            </>
                        )}
                    </div>
                </div>

                <div style={styles.tabContainer}>
                    <button onClick={lidarComCliqueAbaPedidos} style={{ ...styles.tabStyle, ...(abaAtiva === 'pedidos' ? styles.tabAtiva : {}) }}>
                        PEDIDOS 
                        {novosPedidosCount > 0 && <span style={styles.badgeNovo}>{novosPedidosCount}</span>}
                        <span style={styles.badgeTotal}>({contadoresAbas['pedidos'] || 0})</span>
                    </button>
                    
                    <button onClick={() => { setAbaAtiva('pendente'); setTermoBuscaAtivo(""); }} style={{ ...styles.tabStyle, ...(abaAtiva === 'pendente' ? styles.tabAtiva : {}) }}>
                        PENDENTE <span style={styles.badgeTotal}>({contadoresAbas['pendente'] || 0})</span>
                    </button>
                    
                    <button onClick={() => { setAbaAtiva('producao'); setTermoBuscaAtivo(""); }} style={{ ...styles.tabStyle, ...(abaAtiva === 'producao' ? styles.tabAtiva : {}) }}>
                        PRODUÇÃO <span style={styles.badgeTotal}>({contadoresAbas['producao'] || 0})</span>
                    </button>
                    
                    <button onClick={() => { setAbaAtiva('cotar'); setTermoBuscaAtivo(""); }} style={{ ...styles.tabStyle, ...(abaAtiva === 'cotar' ? styles.tabAtiva : {}) }}>
                        COTAR FRETE <span style={styles.badgeTotal}>({contadoresAbas['cotar'] || 0})</span>
                    </button>
                    
                    <button onClick={() => { setAbaAtiva('etiquetas'); setTermoBuscaAtivo(""); }} style={{ ...styles.tabStyle, ...(abaAtiva === 'etiquetas' ? styles.tabAtiva : {}) }}>
                        ETIQUETAS <span style={styles.badgeTotal}>({contadoresAbas['etiquetas'] || 0})</span>
                    </button>
                    
                    <button onClick={() => { setAbaAtiva('retirada'); setTermoBuscaAtivo(""); }} style={{ ...styles.tabStyle, ...(abaAtiva === 'retirada' ? styles.tabAtiva : {}) }}>
                        RETIRADA <span style={styles.badgeTotal}>({contadoresAbas['retirada'] || 0})</span>
                    </button>

                    <button onClick={() => { setAbaAtiva('entregalocal'); setTermoBuscaAtivo(""); }} style={{ ...styles.tabStyle, ...(abaAtiva === 'entregalocal' ? styles.tabAtiva : {}) }}>
                        ENTREGA LOCAL <span style={styles.badgeTotal}>({contadoresAbas['entregalocal'] || 0})</span>
                    </button>
                    
                    <button onClick={() => { setAbaAtiva('digital'); setTermoBuscaAtivo(""); }} style={{ ...styles.tabStyle, ...(abaAtiva === 'digital' ? styles.tabAtiva : {}) }}>
                        DIGITAL <span style={styles.badgeTotal}>({contadoresAbas['digital'] || 0})</span>
                    </button>
                    
                    <button onClick={() => { setAbaAtiva('enviados'); setTermoBuscaAtivo(""); }} style={{ ...styles.tabStyle, ...(abaAtiva === 'enviados' ? styles.tabAtivaEnviados : {}) }}>
                        ENVIADOS <span style={styles.badgeTotal}>({contadoresAbas['enviados'] || 0})</span>
                    </button>
                    
                    <button onClick={() => { setAbaAtiva('concluidos'); setTermoBuscaAtivo(""); }} style={{ ...styles.tabStyle, ...(abaAtiva === 'concluidos' ? styles.tabAtivaConcluidos : {}) }}>
                        CONCLUÍDOS <span style={styles.badgeTotal}>({contadoresAbas['concluidos'] || 0})</span>
                    </button>
                </div>
            </div>

            <div style={styles.conteudoDinamicoArea}>
                {abaAtiva === 'cotar' ? (
                    <TabCotarFrete
                        pedidos={pedidosFiltradosGlobais}
                        lojistaIdApp={lojistaIdApp}
                        db={db}
                        dadosLoja={dadosLoja}
                        cotarFrete={cotarFrete}
                        setLocalPedidos={setLocalPedidos}
                        selecionados={selecionados || []}
                        setSelecionados={setSelecionados}
                    />
                ) : abaAtiva === 'retirada' ? (
                    <TabRetiradaLoja
                        pedidos={pedidosFiltradosGlobais}
                        lojistaIdApp={lojistaIdApp}
                        db={db}
                        dadosLoja={dadosLoja}
                        setLocalPedidos={setLocalPedidos}
                        mudarStatusDireto={async (p, s) => { }}
                        selecionados={selecionados || []}
                        setSelecionados={setSelecionados}
                    />
                ) : abaAtiva === 'entregalocal' ? (
                    <TabEntregaLocal
                        pedidos={pedidosFiltradosGlobais}
                        lojistaIdApp={lojistaIdApp}
                        db={db}
                        dadosLoja={dadosLoja}
                        setLocalPedidos={setLocalPedidos}
                        mudarStatusDireto={async (p, s) => { }}
                        selecionados={selecionados || []}
                        setSelecionados={setSelecionados}
                    />
                ) : abaAtiva === 'digital' ? (
                    <TabDigital
                        pedidos={pedidosFiltradosGlobais}
                        lojistaIdApp={lojistaIdApp}
                        db={db}
                        dadosLoja={dadosLoja}
                        setLocalPedidos={setLocalPedidos}
                        mudarStatusDireto={async (p, s) => { }}
                        selecionados={selecionados || []}
                        setSelecionados={setSelecionados}
                    />
                ) : abaAtiva === 'etiquetas' ? (
                    <TabEmitirEtiquetas
                        pedidos={pedidosFiltradosGlobais}
                        lojistaIdApp={lojistaIdApp}
                        db={db}
                        dadosLoja={dadosLoja}
                        setModalProgresso={setModalProgresso}
                        setLocalPedidos={setLocalPedidos}
                        selecionados={selecionados || []}
                        setSelecionados={setSelecionados}
                    />
                ) : abaAtiva === 'enviados' ? (
                    <TabPedidosEnviados
                        pedidos={pedidosFiltradosGlobais}
                        loading={loading}
                        lojistaIdApp={lojistaIdApp}
                        db={db}
                        mudarStatusDireto={async (p, s) => { }}
                        selecionados={selecionados || []}
                        setSelecionados={setSelecionados}
                    />
                ) : abaAtiva === 'concluidos' ? (
                    <TabPedidosConcluidos
                        pedidos={pedidosFiltradosGlobais}
                        lojistaIdApp={lojistaIdApp}
                        db={db}
                        dadosLoja={dadosLoja}
                        setLocalPedidos={setLocalPedidos}
                        selecionados={selecionados || []}
                        setSelecionados={setSelecionados}
                    />
                ) : (
                    <TabTodosPedidos
                        pedidos={pedidosFiltradosGlobais}
                        loading={loading}
                        lojistaIdApp={lojistaIdApp}
                        db={db}
                        mudarStatusDireto={async (p, s) => { }}
                        alternarPago={async (p) => { }}
                        dispararSegurancaDeletar={(p) => setPedidoParaDeletar(p)}
                        cotarFrete={cotarFrete}
                        setLocalPedidos={setLocalPedidos}
                        dadosLoja={dadosLoja}
                        selecionados={selecionados || []}
                        setSelecionados={setSelecionados}
                    />
                )}
            </div>

            {pedidoParaDeletar && (
                <div style={localStyles.modalOverlayCentroFix}>
                    <div style={{ ...localStyles.modalContentCentroCard, borderTop: '5px solid #ef4444' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#ef4444' }}>⚠️ EXCLUSÃO DEFINITIVA (COM ESTORNO)</h3>
                        <p style={{ fontSize: '13px', color: '#475569', marginBottom: '12px' }}>
                            Ao excluir este pedido, os itens serão devolvidos para o estoque automaticamente.
                        </p>
                        <input
                            type="text"
                            placeholder={`Digite ${pedidoParaDeletar.numeroPedido || pedidoParaDeletar.id.slice(-4)}...`}
                            value={confirmacaoTexto}
                            onChange={(e) => setConfirmacaoTexto(e.target.value)}
                            style={{ width: '100%', marginBottom: '20px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => { setPedidoParaDeletar(null); setConfirmacaoTexto(""); }} style={{ padding: '8px 12px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                            <button onClick={executarExclusaoPermanente} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Confirmar e Excluir</button>
                        </div>
                    </div>
                </div>
            )}

            {modalExclusaoMassaAberto && (
                <div style={localStyles.modalOverlayCentroFix}>
                    <div style={{ ...localStyles.modalContentCentroCard, borderTop: '5px solid #ef4444' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#ef4444' }}>⚠️ EXCLUSÃO EM MASSA (COM ESTORNO)</h3>
                        <p style={{ fontSize: '13px', color: '#475569', marginBottom: '15px', lineHeight: '1.4' }}>
                            {selecionados.length === 1 ? (
                                <>Para excluir o pedido e estornar o estoque, digite o número <strong>{String(localPedidos.find(p => p.id === selecionados[0])?.numeroPedido || selecionados[0].slice(-4))}</strong> abaixo:</>
                            ) : (
                                <>Para confirmar a exclusão de <strong>{selecionados.length} pedidos</strong> e estornar o estoque de todos, digite a palavra <strong>selecionados</strong> abaixo:</>
                            )}
                        </p>
                        <input
                            type="text"
                            placeholder={selecionados.length === 1 ? "Digite o número do pedido..." : "Digite selecionados..."}
                            value={textoDigitadoMassa}
                            onChange={(e) => setTextoDigitadoMassa(e.target.value)}
                            style={{ width: '100%', marginBottom: '20px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalExclusaoMassaAberto(false)} style={{ padding: '8px 12px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                            <button
                                onClick={async () => {
                                    const selecionadosAtuais = selecionados || [];
                                    const textoEsperado = selecionadosAtuais.length === 1
                                        ? String(localPedidos.find(p => p.id === selecionadosAtuais[0])?.numeroPedido || selecionadosAtuais[0].slice(-4))
                                        : "selecionados";

                                    if (textoDigitadoMassa !== textoEsperado) {
                                        alert("Confirmação incorreta.");
                                        return;
                                    }

                                    try {
                                        setProcessandoMassaStatus(true);
                                        for (const pedidoId of selecionadosAtuais) {
                                            const pedidoObj = localPedidos.find(p => p.id === pedidoId);
                                            if (pedidoObj) {
                                                await estornarEstoqueDoPedido(pedidoObj);
                                            }
                                            await deleteDoc(doc(db, "lojistas", lojistaIdApp, "pedidos", pedidoId));
                                        }
                                        setLocalPedidos(prev => prev.filter(p => !selecionadosAtuais.includes(p.id)));
                                        setSelecionados([]);
                                        setModalExclusaoMassaAberto(false);
                                        setTextoDigitadoMassa("");
                                        alert("💥 Pedido(s) excluído(s) e estoque estornado com sucesso!");
                                    } catch (err: any) {
                                        alert("Erro ao excluir: " + err.message);
                                    } finally {
                                        setProcessandoMassaStatus(false);
                                    }
                                }}
                                style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Confirmar e Excluir
                            </button>
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
    contentArea: { padding: '20px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' },
    headerFixoContainer: {
        position: 'relative',
        backgroundColor: '#f8fafc',
        paddingTop: '5px',
        paddingBottom: '10px',
        borderBottom: '1px solid #e2e8f0',
        zIndex: 10
    },
    filterBar: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '10px', backgroundColor: '#fff', padding: '12px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
    selectionBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '10px',
        backgroundColor: '#fff',
        padding: '0 16px',
        height: '52px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        flexWrap: 'wrap',
        gap: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        boxSizing: 'border-box'
    },
    selectLogistica: { padding: '7px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', cursor: 'pointer', backgroundColor: '#fff' },
    selectOrdenacaoStyle: { padding: '7px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', cursor: 'pointer', backgroundColor: '#fff' },
    selectAcaoMassa: { padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', cursor: 'pointer', backgroundColor: '#f8fafc', fontWeight: '600', color: '#1e293b' },
    searchInput: { padding: '7px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', flex: 1, backgroundColor: '#fff' },

    dropdownMenu: {
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
        zIndex: 999,
        maxHeight: '320px',
        overflowY: 'auto'
    },
    dropdownHeader: {
        padding: '10px 14px',
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#64748b',
        borderBottom: '1px solid #f1f5f9',
        backgroundColor: '#f8fafc'
    },
    dropdownList: {
        display: 'flex',
        flexDirection: 'column'
    },
    dropdownItem: {
        padding: '10px 14px',
        borderBottom: '1px solid #f1f5f9',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease'
    },

    tabContainer: {
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        borderBottom: '1px solid #e2e8f0',
        marginTop: '14px',
        width: '100%',
        boxSizing: 'border-box',
        alignItems: 'center',
        paddingLeft: '4px',
        paddingBottom: '2px'
    },
    tabStyle: {
        background: 'none',
        borderWidth: '0px 0px 3px 0px',
        borderStyle: 'solid',
        borderColor: 'transparent',
        padding: '8px 6px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#64748b',
        cursor: 'pointer',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '-1px'
    },
    tabAtiva: {
        color: '#2563eb',
        borderColor: '#2563eb',
        fontWeight: 'bold'
    },
    tabAtivaEnviados: {
        color: '#2563eb',
        borderColor: '#2563eb',
        fontWeight: 'bold'
    },
    tabAtivaConcluidos: {
        color: '#059669',
        borderColor: '#059669',
        fontWeight: 'bold'
    },
    badgeNovo: {
        backgroundColor: '#ef4444',
        color: '#fff',
        fontSize: '10px',
        fontWeight: 'bold',
        padding: '1px 5px',
        borderRadius: '10px',
        marginLeft: '2px'
    },
    badgeTotal: {
        backgroundColor: '#e2e8f0',
        color: '#475569',
        fontSize: '11px',
        fontWeight: '600',
        padding: '1px 5px',
        borderRadius: '4px'
    },
    conteudoDinamicoArea: {
        marginTop: '20px'
    }
};

const localStyles: { [key: string]: React.CSSProperties } = {
    modalOverlayCentroFix: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
    modalContentCentroCard: { backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '90%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }
};