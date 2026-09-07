// components/GestaoPedidos.tsx
'use client';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useFrete } from "@/hooks/useFrete";
import { useGerenciarPedido } from "@/hooks/useGerenciarPedido";

import { Pedido } from '@/types/pedido';
import { descobrirAbaDoPedido } from '@/utils/classificarPedido';
import { doc, onSnapshot, writeBatch } from 'firebase/firestore';

// 🌟 Importando a função utilitária otimizada de embalagens (Custo mínimo no Firebase)
import { buscarEmbalagensLoja, EmbalagemLoja } from "@/utils/buscarEmbalagens";

// 🌟 Importando o hook do tema global (ThemeContext)
import { useTheme } from "@/context/ThemeContext";

// 🌟 Importando as barras de ações isoladas
import BarraAcoesStatusProducao from './_tabsGestaoPedidos/BarraAcoesStatusProducao';
import BarraDeAcoes from './_tabsGestaoPedidos/BarraAcoesTabEtiquetas';

import TabTodosPedidos from './_tabsGestaoPedidos/TabTodosPedidos';
import TabCotarFrete from './_tabsGestaoPedidos/TabCotarFrete';
import TabEmitirEtiquetas from './_tabsGestaoPedidos/TabEmitirEtiquetas';
import TabPedidosEnviados from './_tabsGestaoPedidos/TabPedidosEnviados';
import TabPedidosConcluidos from './_tabsGestaoPedidos/TabPedidosConcluidos';
import TabRetiradaLoja from './_tabsGestaoPedidos/TabRetiradaLoja';
import TabDigital from './_tabsGestaoPedidos/TabDigital';
import TabEntregaLocal from './_tabsGestaoPedidos/TabEntregaLocal';

export interface DadosLoja {
    CEP?: string;
    cep?: string;
    cidade?: string;
    sistema?: {
        isAutomacaoCompletaMelhorEnvio?: boolean;
    };
}

export interface GestaoPedidosProps {
    pedidos: Pedido[];
    loading?: boolean;
    lojistaIdApp: string;
    db: any;
    dadosLoja?: DadosLoja;
}

export default function GestaoPedidos({
    pedidos = [], loading = false, lojistaIdApp, db, dadosLoja: dadosLojaIniciais
}: GestaoPedidosProps) {

    // 🌟 CONSUMINDO O TEMA GLOBALMENTE NO INÍCIO DO COMPONENTE
    const { theme } = useTheme();

    const [abaAtiva, setAbaAtiva] = useState<string>('pedidos');
    const [selecionados, setSelecionados] = useState<string[]>([]);

    const [busca, setBusca] = useState("");
    const [debouncedBusca, setDebouncedBusca] = useState("");

    const [termoBuscaAtivo, setTermoBuscaAtivo] = useState("");
    const [ordenacao, setOrdenacao] = useState("recentes");

    // 📦 Estados otimizados para gerenciar as embalagens na aba de Produção
    const [listaEmbalagensLoja, setListaEmbalagensLoja] = useState<EmbalagemLoja[]>([]);
    const [embalagemEscolhidaParaLote, setEmbalagemEscolhidaParaLote] = useState<string>("");

    const funcaoCotarRef = useRef<() => void>(() => { });
    const funcaoConcluirRetiradaRef = useRef<() => void>(() => { });
    const funcaoConcluirEntregaLocalRef = useRef<() => void>(() => { });
    const funcaoConcluirDigitalRef = useRef<() => void>(() => { });
    const funcaoConfirmarRecebimentoRef = useRef<() => void>(() => { });
    const funcaoSalvarEmbalagemProducaoRef = useRef<() => void>(() => { });

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedBusca(busca), 300);
        return () => clearTimeout(handler);
    }, [busca]);

    const [dadosLoja, setDadosLoja] = useState<DadosLoja | undefined>(dadosLojaIniciais);
    useEffect(() => {
        setDadosLoja(dadosLojaIniciais);
    }, [dadosLojaIniciais]);

    useEffect(() => {
        if (!db || !lojistaIdApp) return;

        const docRef = doc(db, 'lojistas', lojistaIdApp);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const dadosAtualizados = docSnap.data() as DadosLoja;
                setDadosLoja(dadosAtualizados);
            }
        }, (error) => {
            console.error("Erro ao escutar atualizações da loja:", error);
        });

        return () => unsubscribe();
    }, [db, lojistaIdApp]);

    // 📦 Busca única e eficiente das embalagens cadastradas pelo lojista
    useEffect(() => {
        async function carregarEmbalagens() {
            if (!db || !lojistaIdApp) return;
            const embalagens = await buscarEmbalagensLoja(db, lojistaIdApp);
            setListaEmbalagensLoja(embalagens);
        }
        carregarEmbalagens();
    }, [db, lojistaIdApp]);

    const isAutomacaoHabilitada = useMemo(() =>
        Boolean(dadosLoja?.sistema?.isAutomacaoCompletaMelhorEnvio),
        [dadosLoja?.sistema?.isAutomacaoCompletaMelhorEnvio]
    );

    const [localPedidos, setLocalPedidos] = useState<Pedido[]>(pedidos);
    useEffect(() => { setLocalPedidos(pedidos); }, [pedidos]);

    // 🛡️ Filtro inteligente: Oculta da gestão pedidos de PDV de pronta-entrega (Fisico_Sem + retirada)
    const pedidosFiltradosParaGestao = useMemo(() => {
        return localPedidos.filter(p => {
            if (!p) return false;

            const origem = String(p.origemPedido || "").trim().toLowerCase();
            const ehPdv = origem === "pdv" || origem === "balcão" || origem === "balcao";

            if (ehPdv) {
                const logistica = p.logistica || {};
                const formaEntrega = String(logistica.dsFormaEntrega || "").trim().toLowerCase();
                const ehRetirada = formaEntrega === "retirada" || logistica.isRetirada === true;

                const itens = p.itens || [];
                const todosItensSaoProntaEntrega = itens.length > 0 && itens.every((item: any) => {
                    const tipoProd = String(item.dsTipoProduto || "").trim();
                    return tipoProd === "Fisico_Sem";
                });

                if (ehRetirada && todosItensSaoProntaEntrega) {
                    return false; // Sai da tela de gestão (venda balcão pronta-entrega pura)
                }
            }

            return true; // Demais pedidos (Site, WhatsApp, ou PDV personalizados) continuam visíveis
        });
    }, [localPedidos]);

    const { alterarStatusPedido, excluirPedidoComEstorno } = useGerenciarPedido({
        db,
        lojistaIdApp,
        setLocalPedidos
    });

    const [idsConhecidos, setIdsConhecidos] = useState<string[]>(() => {
        if (typeof window === 'undefined') return [];
        const salvo = localStorage.getItem(`ids_conhecidos_pedidos_${lojistaIdApp}`);
        return salvo ? JSON.parse(salvo) : [];
    });

    // 🛡️ Função centralizada e segura para classificar a aba real de cada pedido
    const obterAbaDoPedidoEfetiva = useCallback((p: Pedido): string => {
        if (!p) return 'pedidos';
        const statusGeral = String(p.status || '').trim().toLowerCase();
        const dsStatusPedido = String((p as any).dsStatusPedido || '').trim().toLowerCase();
        const statusProd = String((p as any).StatusProducao?.dsStatusProdução || (p as any).StatusProducao?.dsStatusProducao || '').trim().toLowerCase();
        const isConcluidoFlag = (p as any).enviado === true && statusGeral === 'concluído';

        if (statusGeral === 'concluído' || statusGeral === 'concluido' || dsStatusPedido === 'concluído' || dsStatusPedido === 'concluido' || statusProd === 'concluído' || statusProd === 'concluido' || isConcluidoFlag) {
            return 'concluidos';
        }

        return descobrirAbaDoPedido(p).idAba;
    }, []);

    const lidarComCliqueAbaPedidos = () => {
        setAbaAtiva('pedidos');
        setTermoBuscaAtivo("");

        if (pedidosFiltradosParaGestao.length > 0) {
            const idsAtuaisDaAba = pedidosFiltradosParaGestao.filter(p => obterAbaDoPedidoEfetiva(p) === 'pedidos').map(p => p.id);
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

    const [pedidoParaDeletar, setPedidoParaDeletar] = useState<Pedido | null>(null);
    const [confirmacaoTexto, setConfirmacaoTexto] = useState("");

    const { cotarFrete } = useFrete(lojistaIdApp, dadosLoja);

    const novosPedidosCount = useMemo(() => {
        const pedidosNaAbaPedidos = pedidosFiltradosParaGestao.filter(p => {
            if (!p) return false;
            return obterAbaDoPedidoEfetiva(p) === 'pedidos';
        });

        const novos = pedidosNaAbaPedidos.filter(p => !idsConhecidos.includes(p.id));
        return novos.length;
    }, [pedidosFiltradosParaGestao, idsConhecidos, obterAbaDoPedidoEfetiva]);

    useEffect(() => {
        if (lojistaIdApp) {
            localStorage.setItem(`contador_novos_pedidos_${lojistaIdApp}`, String(novosPedidosCount));
        }
    }, [novosPedidosCount, lojistaIdApp]);

    const contadoresAbas = useMemo(() => {
        const counts: { [key: string]: number } = {
            pedidos: 0, pendente: 0, producao: 0, cotar: 0, etiquetas: 0, retirada: 0, entregalocal: 0, digital: 0, enviados: 0, concluidos: 0
        };

        pedidosFiltradosParaGestao.forEach(p => {
            if (!p) return;
            const abaInfo = obterAbaDoPedidoEfetiva(p);
            counts[abaInfo] = (counts[abaInfo] || 0) + 1;
        });

        return counts;
    }, [pedidosFiltradosParaGestao, obterAbaDoPedidoEfetiva]);

    const verificarMatchBusca = useCallback((p: Pedido, termo: string): boolean => {
        if (!p) return false;
        const termoBusca = String(termo || "").toLowerCase().trim();
        if (!termoBusca) return false;

        // 1. Número do pedido
        const numPedidoStr = String(
            p.nrNumeroPedido ?? p.numeroPedido ?? p.numero ?? ""
        ).toLowerCase();

        // 2. ID do documento/pedido no Firestore
        const idStr = String(p.id || "").toLowerCase();

        // 3. Nome do cliente
        let clienteNome = "";
        const clienteObj = (p as any).dsCliente;
        if (clienteObj && typeof clienteObj === 'object') {
            clienteNome = String(clienteObj.nmNomeCliente || clienteObj.nome || clienteObj.dsNomeCliente || "").toLowerCase();
        } else if (typeof p.cliente === 'string') {
            clienteNome = String(p.cliente).toLowerCase();
        }

        // 4. Nomes dos produtos (itens)
        const itens = Array.isArray(p.itens) ? p.itens : [];
        const itensNomes = itens.map((i: any) =>
            String(i?.dsNomeProduto || i?.nome || "").toLowerCase()
        );

        // 🔍 Ajustado para .startsWith() para validar se o nome, número ou produto COMEÇAM com o termo digitado
        const bateNumero = numPedidoStr.startsWith(termoBusca);
        const bateId = idStr.startsWith(termoBusca);
        
        // Verifica se o nome do cliente começa com o termo OU se alguma das palavras do nome do cliente começa com o termo
        const palavrasCliente = clienteNome.split(" ");
        const bateCliente = clienteNome.startsWith(termoBusca) || palavrasCliente.some(palavra => palavra.startsWith(termoBusca));

        // Verifica se algum produto começa com o termo
        const bateItem = itensNomes.some(nomeItem => {
            const palavrasItem = nomeItem.split(" ");
            return nomeItem.startsWith(termoBusca) || palavrasItem.some(palavra => palavra.startsWith(termoBusca));
        });

        return bateNumero || bateId || bateCliente || bateItem;
    }, []);

    const resultadosBuscaMenu = useMemo(() => {
        const termo = busca.toLowerCase().trim();
        if (!termo || termo.length < 1) return [];

        return pedidosFiltradosParaGestao.filter(p => {
            if (!p) return false;
            return verificarMatchBusca(p, termo);
        }).slice(0, 8);
    }, [busca, pedidosFiltradosParaGestao, verificarMatchBusca]);

    const selecionarPedidoDoMenu = (pedidoSelecionado: Pedido) => {
        const abaDestino = obterAbaDoPedidoEfetiva(pedidoSelecionado);
        const numPedidoStr = pedidoSelecionado.nrNumeroPedido !== undefined && pedidoSelecionado.nrNumeroPedido !== null
            ? String(pedidoSelecionado.nrNumeroPedido)
            : (pedidoSelecionado.numeroPedido !== undefined && pedidoSelecionado.numeroPedido !== null
                ? String(pedidoSelecionado.numeroPedido)
                : (pedidoSelecionado.numero !== undefined && pedidoSelecionado.numero !== null ? String(pedidoSelecionado.numero) : pedidoSelecionado.id));

        if (abaDestino === 'pedidos') {
            lidarComCliqueAbaPedidos();
        } else {
            setAbaAtiva(abaDestino);
        }
        setTermoBuscaAtivo(numPedidoStr);
        setBusca("");
    };

    const pedidosFiltradosGlobais = useMemo(() => {
        const termoBuscaEfetivo = debouncedBusca.toLowerCase().trim();
        return pedidosFiltradosParaGestao.filter(p => {
            if (!p) return false;

            const abaInfo = obterAbaDoPedidoEfetiva(p);
            if (abaInfo !== abaAtiva) return false;

            if (termoBuscaAtivo) {
                const termo = termoBuscaAtivo.toLowerCase().trim();
                if (!verificarMatchBusca(p, termo)) return false;
            }

            if (termoBuscaEfetivo) {
                if (!verificarMatchBusca(p, termoBuscaEfetivo)) return false;
            }

            return true;
        }).sort((a, b) => {
            const d1 = new Date(a.data || (a.cliente as any)?.data || 0).getTime();
            const d2 = new Date(b.data || (b.cliente as any)?.data || 0).getTime();
            return ordenacao === "recentes" ? d2 - d1 : d1 - d2;
        });
    }, [pedidosFiltradosParaGestao, termoBuscaAtivo, debouncedBusca, ordenacao, abaAtiva, verificarMatchBusca, obterAbaDoPedidoEfetiva]);

    // 📦 Ações em lote ajustadas para a aba Pedidos
    const lidarComMarcarPagoEmLote = async () => {
        if (selecionados.length === 0) return;
        if (!confirm(`Deseja marcar ${selecionados.length} pedido(s) como pago(s) e enviar para pendente?`)) return;
        try {
            const batch = writeBatch(db);
            selecionados.forEach(id => {
                const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", id);
                batch.update(pedidoRef, {
                    "status": "pendente",
                    "StatusProducao.dsStatusProducao": "Pendente",
                    "StatusProducao.isPago": true
                });
            });
            await batch.commit();

            setLocalPedidos(prev =>
                prev.map(p => {
                    if (selecionados.includes(p.id)) {
                        return {
                            ...p,
                            status: "pendente",
                            StatusProducao: {
                                ...(p.StatusProducao || {}),
                                dsStatusProducao: "Pendente",
                                isPago: true
                            }
                        };
                    }
                    return p;
                })
            );

            setSelecionados([]);
            setAbaAtiva('pendente');
        } catch (error) {
            console.error("Erro ao marcar como pago:", error);
            alert("Erro ao atualizar os pedidos.");
        }
    };

    const lidarComMarcarNaoPagoEmLote = async () => {
        if (selecionados.length === 0) return;
        if (!confirm(`Deseja marcar ${selecionados.length} pedido(s) como não pago(s)?`)) return;
        try {
            const batch = writeBatch(db);
            selecionados.forEach(id => {
                const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", id);
                batch.update(pedidoRef, {
                    "status": "pedidos",
                    "StatusProducao.dsStatusProducao": "PEDIDOS",
                    "StatusProducao.isPago": false
                });
            });
            await batch.commit();

            setLocalPedidos(prev =>
                prev.map(p => {
                    if (selecionados.includes(p.id)) {
                        return {
                            ...p,
                            status: "pedidos",
                            StatusProducao: {
                                ...(p.StatusProducao || {}),
                                dsStatusProducao: "PEDIDOS",
                                isPago: false
                            }
                        };
                    }
                    return p;
                })
            );

            setSelecionados([]);
            setAbaAtiva('pedidos');
        } catch (error) {
            console.error("Erro ao marcar como não pago:", error);
            alert("Erro ao atualizar os pedidos.");
        }
    };

    const lidarComEnviarParaProducaoEmLote = async () => {
        if (selecionados.length === 0) return;
        if (!confirm(`Deseja enviar ${selecionados.length} pedido(s) para a Produção?`)) return;
        try {
            const batch = writeBatch(db);
            selecionados.forEach(id => {
                const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", id);
                batch.update(pedidoRef, {
                    "status": "producao",
                    "StatusProducao.dsStatusProducao": "Produção"
                });
            });
            await batch.commit();

            setLocalPedidos(prev =>
                prev.map(p => {
                    if (selecionados.includes(p.id)) {
                        return {
                            ...p,
                            status: "producao",
                            StatusProducao: {
                                ...(p.StatusProducao || {}),
                                dsStatusProducao: "Produção"
                            }
                        };
                    }
                    return p;
                })
            );

            setSelecionados([]);
            setAbaAtiva('producao');
        } catch (error) {
            console.error("Erro ao enviar para produção:", error);
            alert("Erro ao atualizar os pedidos.");
        }
    };

    const lidarComExcluirEmLote = async () => {
        if (selecionados.length === 0) return;
        if (!confirm(`⚠️ ATENÇÃO: Deseja realmente excluir os ${selecionados.length} pedidos selecionados com estorno?`)) return;
        try {
            const pedidosParaExcluir = pedidosFiltradosParaGestao.filter(p => selecionados.includes(p.id));
            for (const p of pedidosParaExcluir) {
                await excluirPedidoComEstorno(p);
            }
            setSelecionados([]);
            alert("Pedidos excluídos e estoque estornado!");
        } catch (error) {
            console.error("Erro ao excluir lote:", error);
            alert("Erro ao excluir pedidos.");
        }
    };

    // 📦 Função otimizada com writeBatch para salvar a embalagem E marcar como Pronto na aba de Produção
    const lidarComSalvarEmbalagemEAvancar = async () => {
        const selecionadosNaAba = pedidosFiltradosGlobais.filter(p => selecionados.includes(p.id));
        if (selecionadosNaAba.length === 0) {
            return alert("Selecione ao menos um pedido na lista para definir a embalagem.");
        }
        if (!embalagemEscolhidaParaLote) {
            return alert("Por favor, selecione uma embalagem antes de prosseguir.");
        }

        const dadosEmbalagemObj = listaEmbalagensLoja.find(e => e.id === embalagemEscolhidaParaLote);
        if (!dadosEmbalagemObj) {
            return alert("Embalagem selecionada inválida.");
        }

        const temDiferenca = selecionadosNaAba.some(pedido => {
            const rec = pedido.Embalagem?.recomendada;
            if (!rec) return false;

            if (rec.id && dadosEmbalagemObj.id) {
                return rec.id !== dadosEmbalagemObj.id;
            }
            const recNome = String(rec.dsModeloEmbalagemRecomendado || rec.nome || "").trim().toLowerCase();
            const escolhidoNome = String(dadosEmbalagemObj.nome || "").trim().toLowerCase();
            return recNome && escolhidoNome && recNome !== escolhidoNome;
        });

        if (temDiferenca) {
            const querMudar = confirm(`⚠️ Atenção: A embalagem escolhida ("${dadosEmbalagemObj.nome}") é diferente da recomendada pelo sistema para um ou mais pedidos.\n\nTem certeza que quer mudar a embalagem desse pedido?`);
            if (!querMudar) return;
        } else {
            if (!confirm(`Deseja definir a embalagem "${dadosEmbalagemObj.nome}" e marcar ${selecionadosNaAba.length} pedido(s) como Pronto(s)?`)) {
                return;
            }
        }

        try {
            const batch = writeBatch(db);

            selecionadosNaAba.forEach(pedido => {
                const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", pedido.id);
                const recomendacaoExistente = pedido.Embalagem?.recomendada || pedido.Embalagem || {};

                batch.update(pedidoRef, {
                    "StatusProducao.dsStatusProducao": "Pronto",
                    "Embalagem": {
                        recomendada: {
                            id: recomendacaoExistente.id || "",
                            dsModeloEmbalagemRecomendado: recomendacaoExistente.dsModeloEmbalagemRecomendado || recomendacaoExistente.nome || "Não calculada",
                            dsTipoEmbalagem: recomendacaoExistente.dsTipoEmbalagem || "envelope_seguranca",
                            vlCustoEmbalagemRecomendado: Number(recomendacaoExistente.vlCustoEmbalagemRecomendado || recomendacaoExistente.custo || 0),
                            altura: Number(recomendacaoExistente.altura ?? 4),
                            comprimento: Number(recomendacaoExistente.comprimento ?? 32),
                            largura: Number(recomendacaoExistente.largura ?? 22),
                            pesoEmbarque: Number(recomendacaoExistente.pesoEmbarque ?? 0),
                        },
                        escolhida: {
                            id: dadosEmbalagemObj.id || "",
                            dsModeloEmbalagemEscolhida: dadosEmbalagemObj.nome || "",
                            dsTipoEmbalagem: (dadosEmbalagemObj as any).tipo || "envelope_seguranca",
                            vlCustoEmbalagemEscolhida: Number(dadosEmbalagemObj.custo || 0),
                            altura: Number(dadosEmbalagemObj.altura || 0),
                            comprimento: Number(dadosEmbalagemObj.comprimento || 0),
                            largura: Number(dadosEmbalagemObj.largura || 0),
                            pesoEmbarque: Number((dadosEmbalagemObj as any).peso || (dadosEmbalagemObj as any).pesoEmbarque || 0),
                            insumosComposicaoEmbalagem: (dadosEmbalagemObj as any).insumosComposicaoEmbalagem || []
                        }
                    }
                });
            });

            await batch.commit();

            setLocalPedidos(prev =>
                prev.map(p => {
                    if (selecionados.includes(p.id)) {
                        return {
                            ...p,
                            StatusProducao: {
                                ...(p.StatusProducao || {}),
                                dsStatusProducao: "Pronto"
                            }
                        };
                    }
                    return p;
                })
            );

            setSelecionados([]);
            setEmbalagemEscolhidaParaLote("");
            alert("Embalagem definida e pedido(s) marcado(s) como Pronto(s) com sucesso! ✅");
        } catch (error) {
            console.error("Erro ao salvar embalagem e marcar pronto:", error);
            alert("Ocorreu um erro ao atualizar os pedidos.");
        }
    };

    useEffect(() => {
        funcaoSalvarEmbalagemProducaoRef.current = lidarComSalvarEmbalagemEAvancar;
    }, [selecionados, pedidosFiltradosGlobais, embalagemEscolhidaParaLote, listaEmbalagensLoja]);

    const executarExclusaoPermanente = async () => {
        if (!db || !lojistaIdApp || !pedidoParaDeletar) return;
        const identificador = pedidoParaDeletar.numeroPedido ? String(pedidoParaDeletar.numeroPedido) : pedidoParaDeletar.id.slice(-4);
        if (confirmacaoTexto !== identificador) return alert("Incorreto.");
        if (!confirm("⚠️ ATENÇÃO: Ação IRREVERSÍVEL. O estoque dos produtos será estornado.")) return;

        const resultado = await excluirPedidoComEstorno(pedidoParaDeletar);
        if (resultado.sucesso) {
            setPedidoParaDeletar(null);
            setConfirmacaoTexto("");
            alert("💥 Pedido excluído e estoque estornado com sucesso!");
        } else {
            alert("Erro ao excluir: " + resultado.erro);
        }
    };

    return (
        <div style={{ ...styles.contentArea, backgroundColor: theme.bgMain, color: theme.textMain }}>
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
                }
            `}</style>

            <div style={{ ...styles.headerFixoContainer, backgroundColor: theme.bgMain, borderColor: theme.border }}>
                <div className="gp-header-topo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '0px' }}>
                    <h2 style={{ fontSize: '20px', color: theme.textMain, margin: 0, fontWeight: 800 }}>📋 Gestão de Pedidos</h2>
                </div>


                {/* 🌟 BARRA DE ABAS PADRÃO (SEMPRE VISÍVEL) */}
                <div style={{ ...styles.tabContainer, borderColor: theme.border }}>
                    <button onClick={lidarComCliqueAbaPedidos} style={{ ...styles.tabStyle, color: theme.textSec, ...(abaAtiva === 'pedidos' ? { ...styles.tabAtiva, color: theme.primary, borderColor: theme.primary } : {}) }}>
                        PEDIDOS
                        {novosPedidosCount > 0 && <span style={styles.badgeNovo}>{novosPedidosCount}</span>}
                        <span style={{ ...styles.badgeTotal, backgroundColor: theme.border, color: theme.textMain }}>({contadoresAbas['pedidos'] || 0})</span>
                    </button>

                    <button onClick={() => { setAbaAtiva('pendente'); setTermoBuscaAtivo(""); }} style={{ ...styles.tabStyle, color: theme.textSec, ...(abaAtiva === 'pendente' ? { ...styles.tabAtiva, color: theme.primary, borderColor: theme.primary } : {}) }}>
                        PENDENTE <span style={{ ...styles.badgeTotal, backgroundColor: theme.border, color: theme.textMain }}>({contadoresAbas['pendente'] || 0})</span>
                    </button>

                    <button onClick={() => { setAbaAtiva('producao'); setTermoBuscaAtivo(""); }} style={{ ...styles.tabStyle, color: theme.textSec, ...(abaAtiva === 'producao' ? { ...styles.tabAtiva, color: theme.primary, borderColor: theme.primary } : {}) }}>
                        PRODUÇÃO <span style={{ ...styles.badgeTotal, backgroundColor: theme.border, color: theme.textMain }}>({contadoresAbas['producao'] || 0})</span>
                    </button>

                    <button onClick={() => { setAbaAtiva('cotar'); setTermoBuscaAtivo(""); }} style={{ ...styles.tabStyle, color: theme.textSec, ...(abaAtiva === 'cotar' ? { ...styles.tabAtiva, color: theme.primary, borderColor: theme.primary } : {}) }}>
                        COTAR FRETE <span style={{ ...styles.badgeTotal, backgroundColor: theme.border, color: theme.textMain }}>({contadoresAbas['cotar'] || 0})</span>
                    </button>

                    <button onClick={() => { setAbaAtiva('etiquetas'); setTermoBuscaAtivo(""); }} style={{ ...styles.tabStyle, color: theme.textSec, ...(abaAtiva === 'etiquetas' ? { ...styles.tabAtiva, color: theme.primary, borderColor: theme.primary } : {}) }}>
                        ETIQUETAS <span style={{ ...styles.badgeTotal, backgroundColor: theme.border, color: theme.textMain }}>({contadoresAbas['etiquetas'] || 0})</span>
                    </button>

                    <button onClick={() => { setAbaAtiva('retirada'); setTermoBuscaAtivo(""); }} style={{ ...styles.tabStyle, color: theme.textSec, ...(abaAtiva === 'retirada' ? { ...styles.tabAtiva, color: theme.primary, borderColor: theme.primary } : {}) }}>
                        RETIRADA <span style={{ ...styles.badgeTotal, backgroundColor: theme.border, color: theme.textMain }}>({contadoresAbas['retirada'] || 0})</span>
                    </button>

                    <button onClick={() => { setAbaAtiva('entregalocal'); setTermoBuscaAtivo(""); }} style={{ ...styles.tabStyle, color: theme.textSec, ...(abaAtiva === 'entregalocal' ? { ...styles.tabAtiva, color: theme.primary, borderColor: theme.primary } : {}) }}>
                        ENTREGA LOCAL <span style={{ ...styles.badgeTotal, backgroundColor: theme.border, color: theme.textMain }}>({contadoresAbas['entregalocal'] || 0})</span>
                    </button>

                    <button onClick={() => { setAbaAtiva('digital'); setTermoBuscaAtivo(""); }} style={{ ...styles.tabStyle, color: theme.textSec, ...(abaAtiva === 'digital' ? { ...styles.tabAtiva, color: theme.primary, borderColor: theme.primary } : {}) }}>
                        DIGITAL <span style={{ ...styles.badgeTotal, backgroundColor: theme.border, color: theme.textMain }}>({contadoresAbas['digital'] || 0})</span>
                    </button>

                    <button onClick={() => { setAbaAtiva('enviados'); setTermoBuscaAtivo(""); }} style={{ ...styles.tabStyle, color: theme.textSec, ...(abaAtiva === 'enviados' ? { ...styles.tabAtiva, color: theme.primary, borderColor: theme.primary } : {}) }}>
                        ENVIADOS <span style={{ ...styles.badgeTotal, backgroundColor: theme.border, color: theme.textMain }}>({contadoresAbas['enviados'] || 0})</span>
                    </button>

                    <button onClick={() => { setAbaAtiva('concluidos'); setTermoBuscaAtivo(""); }} style={{ ...styles.tabStyle, color: theme.textSec, ...(abaAtiva === 'concluidos' ? { ...styles.tabAtivaConcluidos, color: '#059669', borderColor: '#059669' } : {}) }}>
                        CONCLUÍDOS <span style={{ ...styles.badgeTotal, backgroundColor: theme.border, color: theme.textMain }}>({contadoresAbas['concluidos'] || 0})</span>
                    </button>
                </div>

                <div className="gp-filter-bar" style={{ ...styles.filterBar, backgroundColor: theme.bgCard, borderColor: theme.border }}>
                    <select value={ordenacao} onChange={(e) => setOrdenacao(e.target.value)} style={{ ...styles.selectOrdenacaoStyle, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }}>
                        <option value="recentes">📅 Mais Recentes</option>
                        <option value="antigos">⏳ Mais Antigos</option>
                    </select>

                    <div ref={searchContainerRef} style={{ display: 'flex', flex: 1, position: 'relative' }}>
                        <div style={{ display: 'flex', width: '100%', gap: '6px' }}>
                            <input
                                type="text"
                                placeholder="🔍 Digite para buscar (ex: Maria, nº pedido ou Id Pedido)..."
                                value={busca}
                                onChange={(e) => {
                                    setBusca(e.target.value);
                                    if (termoBuscaAtivo) setTermoBuscaAtivo("");
                                }}
                                style={{ ...styles.searchInput, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }}
                            />

                            {termoBuscaAtivo && (
                                <button
                                    onClick={() => {
                                        setTermoBuscaAtivo("");
                                        setBusca("");
                                    }}
                                    style={{
                                        backgroundColor: theme.border,
                                        color: theme.textMain,
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
                            <div style={{ ...styles.dropdownMenu, backgroundColor: theme.bgCard, borderColor: theme.border }}>
                                <div style={{ ...styles.dropdownHeader, backgroundColor: theme.inputBg, color: theme.textSec, borderColor: theme.border }}>
                                    <span>🔍 Total de {resultadosBuscaMenu.length} resultado(s) encontrado(s)</span>
                                </div>
                                <div style={styles.dropdownList}>
                                    {resultadosBuscaMenu.map((p) => {
                                        const numPed = p.nrNumeroPedido !== undefined && p.nrNumeroPedido !== null
                                            ? p.nrNumeroPedido
                                            : (p.numeroPedido !== undefined && p.numeroPedido !== null
                                                ? p.numeroPedido
                                                : (p.numero || p.id.slice(-6)));
                                        const clienteObj = (p as any).dsCliente || (typeof p.cliente === 'object' && p.cliente !== null ? p.cliente : {});
                                        const clienteNome = typeof clienteObj === 'object' ? ((clienteObj as any).nmNomeCliente || (clienteObj as any).nome || (clienteObj as any).dsNomeCliente || "Cliente") : (p.cliente || "Cliente");
                                        const infoAba = obterAbaDoPedidoEfetiva(p);

                                        return (
                                            <div
                                                key={p.id}
                                                onClick={() => selecionarPedidoDoMenu(p)}
                                                style={{ ...styles.dropdownItem, borderColor: theme.border }}
                                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.border)}
                                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.bgCard)}
                                            >
                                                <div style={{ fontWeight: 'bold', color: theme.primary, fontSize: '13px' }}>
                                                    #{numPed} - <span style={{ color: theme.textMain }}>{clienteNome}</span>
                                                </div>
                                                <div style={{ fontSize: '11px', color: theme.textSec, marginTop: '2px' }}>
                                                    Etapa/Aba: <strong style={{ color: '#059669' }}>{infoAba.toUpperCase()}</strong>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* 🌟 RENDERIZAÇÃO CONDICIONAL DA BARRA DE AÇÕES POR ABA */}
                {['pedidos', 'pendente', 'producao'].includes(abaAtiva) ? (
                    <BarraAcoesStatusProducao
                        abaAtiva={abaAtiva}
                        selecionados={selecionados}
                        idsVisiveisDaAba={pedidosFiltradosGlobais.map(p => p.id)}
                        setSelecionados={setSelecionados}
                        onMarcarPago={lidarComMarcarPagoEmLote}
                        onMarcarNaoPago={lidarComMarcarNaoPagoEmLote}
                        onEnviarProducao={lidarComEnviarParaProducaoEmLote}
                        onExcluirLote={lidarComExcluirEmLote}
                        listaEmbalagens={listaEmbalagensLoja}
                        embalagemEscolhida={embalagemEscolhidaParaLote}
                        setEmbalagemEscolhida={setEmbalagemEscolhidaParaLote}
                        onSalvarEmbalagemProducao={() => funcaoSalvarEmbalagemProducaoRef.current()}
                    />
                ) : (
                    <BarraDeAcoes
                        selecionados={selecionados || []}
                        idsVisiveisDaAba={pedidosFiltradosGlobais.map(p => p.id)}
                        localPedidos={pedidosFiltradosParaGestao}
                        lojistaIdApp={lojistaIdApp}
                        db={db}
                        isAutomacaoAtiva={isAutomacaoHabilitada}
                        abaAtiva={abaAtiva}
                        setSelecionados={setSelecionados}
                        alterarStatusPedido={alterarStatusPedido}
                        setLocalPedidos={setLocalPedidos}
                        setAbaAtiva={setAbaAtiva}
                        cotarFrete={cotarFrete}
                        listaEmbalagens={listaEmbalagensLoja}
                        embalagemEscolhida={embalagemEscolhidaParaLote}
                        setEmbalagemEscolhida={setEmbalagemEscolhidaParaLote}
                        onCotarSelecionados={() => funcaoCotarRef.current()}
                        onConcluirRetirada={() => funcaoConcluirRetiradaRef.current()}
                        onConcluirEntregaLocal={() => funcaoConcluirEntregaLocalRef.current()}
                        onConcluirDigital={() => funcaoConcluirDigitalRef.current()}
                        onConfirmarRecebimento={() => funcaoConfirmarRecebimentoRef.current()}
                        onSalvarEmbalagemProducao={() => funcaoSalvarEmbalagemProducaoRef.current()}
                    />
                )}
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
                        registrarFuncaoCotar={(fn) => { funcaoCotarRef.current = fn; }}
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
                        registrarFuncaoConcluirRetirada={(fn) => { funcaoConcluirRetiradaRef.current = fn; }}
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
                        registrarFuncaoConcluirEntregaLocal={(fn) => { funcaoConcluirEntregaLocalRef.current = fn; }}
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
                        registrarFuncaoConcluirDigital={(fn) => { funcaoConcluirDigitalRef.current = fn; }}
                    />
                ) : abaAtiva === 'etiquetas' ? (
                    <TabEmitirEtiquetas
                        pedidos={pedidosFiltradosGlobais}
                        lojistaIdApp={lojistaIdApp}
                        db={db}
                        dadosLoja={dadosLoja}
                        setModalProgresso={() => { }}
                        setLocalPedidos={setLocalPedidos}
                        selecionados={selecionados || []}
                        setSelecionados={setSelecionados}
                        isAutomacaoCompletaMelhorEnvio={isAutomacaoHabilitada}
                    />
                ) : abaAtiva === 'enviados' ? (
                    <TabPedidosEnviados
                        pedidos={pedidosFiltradosGlobais}
                        loading={loading}
                        lojistaIdApp={lojistaIdApp}
                        db={db}
                        mudarStatusDireto={async (p, s) => {
                            await alterarStatusPedido(p.id, s);
                        }}
                        setLocalPedidos={setLocalPedidos}
                        selecionados={selecionados || []}
                        setSelecionados={setSelecionados}
                        registrarFuncaoConfirmarRecebimento={(fn) => { funcaoConfirmarRecebimentoRef.current = fn; }}
                    />
                ) : abaAtiva === 'concluidos' ? (
                    <TabPedidosConcluidos
                        pedidos={pedidosFiltradosParaGestao}
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
                    <div style={{ ...localStyles.modalContentCentroCard, backgroundColor: theme.bgCard, color: theme.textMain, borderTop: '5px solid #ef4444', borderColor: theme.border }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#ef4444' }}>⚠️ EXCLUSÃO DEFINITIVA (COM ESTORNO)</h3>
                        <p style={{ fontSize: '13px', color: theme.textSec, marginBottom: '12px' }}>
                            Ao excluir este pedido, os itens serão devolvidos para o estoque automaticamente.
                        </p>
                        <input
                            type="text"
                            placeholder={`Digite ${pedidoParaDeletar.numeroPedido || pedidoParaDeletar.id.slice(-4)}...`}
                            value={confirmacaoTexto}
                            onChange={(e) => setConfirmacaoTexto(e.target.value)}
                            style={{ width: '100%', marginBottom: '20px', padding: '10px', borderRadius: '6px', border: `1px solid ${theme.border}`, boxSizing: 'border-box', backgroundColor: theme.inputBg, color: theme.textMain }}
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => { setPedidoParaDeletar(null); setConfirmacaoTexto(""); }} style={{ padding: '8px 12px', background: theme.border, color: theme.textMain, border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                            <button onClick={executarExclusaoPermanente} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Confirmar e Excluir</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    contentArea: { padding: '5px 20px 20px 20px', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', boxSizing: 'border-box' },

    headerFixoContainer: {
        position: 'relative',
        paddingTop: '0px',
        paddingBottom: '5px',
        borderBottom: '1px solid',
        zIndex: 10
    },

    filterBar: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '10px', padding: '12px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid' },
    selectOrdenacaoStyle: { padding: '7px 12px', borderRadius: '6px', border: '1px solid', fontSize: '13px', outline: 'none', cursor: 'pointer' },
    searchInput: { padding: '7px 12px', borderRadius: '6px', border: '1px solid', fontSize: '13px', flex: 1 },

    dropdownMenu: {
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: 0,
        right: 0,
        border: '1px solid',
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
        borderBottom: '1px solid'
    },
    dropdownList: {
        display: 'flex',
        flexDirection: 'column'
    },
    dropdownItem: {
        padding: '10px 14px',
        borderBottom: '1px solid',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease'
    },

    tabContainer: {
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        borderBottom: '1px solid',
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
        cursor: 'pointer',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '-1px'
    },
    tabAtiva: {
        fontWeight: 'bold'
    },
    tabAtivaConcluidos: {
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
    modalContentCentroCard: { padding: '24px', borderRadius: '8px', width: '90%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid' }
};