'use client';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useFrete } from "@/hooks/useFrete";
import { useGerenciarPedido } from "@/hooks/useGerenciarPedido";
import BarraDeAcoes from './_tabsGestaoPedidos/BarraAcoesTabEtiquetas';

import { Pedido } from '@/types/pedido';
import { descobrirAbaDoPedido } from '@/utils/classificarPedido';
import { doc, onSnapshot } from 'firebase/firestore';

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

    const [abaAtiva, setAbaAtiva] = useState<string>('pedidos');
    const [selecionados, setSelecionados] = useState<string[]>([]);

    const [busca, setBusca] = useState("");
    const [debouncedBusca, setDebouncedBusca] = useState("");

    const [termoBuscaAtivo, setTermoBuscaAtivo] = useState("");
    const [filtroLogistica, setFiltroLogistica] = useState("todos");
    const [ordenacao, setOrdenacao] = useState("recentes");

    const funcaoCotarRef = useRef<() => void>(() => {});
    const funcaoConcluirRetiradaRef = useRef<() => void>(() => {});
    const funcaoConcluirEntregaLocalRef = useRef<() => void>(() => {});
    const funcaoConcluirDigitalRef = useRef<() => void>(() => {});
    const funcaoConfirmarRecebimentoRef = useRef<() => void>(() => {});

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

    const isAutomacaoHabilitada = useMemo(() =>
        Boolean(dadosLoja?.sistema?.isAutomacaoCompletaMelhorEnvio),
        [dadosLoja?.sistema?.isAutomacaoCompletaMelhorEnvio]
    );

    const [localPedidos, setLocalPedidos] = useState<Pedido[]>(pedidos);
    useEffect(() => { setLocalPedidos(pedidos); }, [pedidos]);

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
        const statusProd = String((p as any).StatusProducao?.dsStatusProdução || '').trim().toLowerCase();
        const isConcluidoFlag = (p as any).enviado === true && statusGeral === 'concluído';

        if (statusGeral === 'concluído' || statusGeral === 'concluido' || statusProd === 'concluído' || statusProd === 'concluido' || isConcluidoFlag) {
            return 'concluidos';
        }

        return descobrirAbaDoPedido(p).idAba;
    }, []);

    const lidarComCliqueAbaPedidos = () => {
        setAbaAtiva('pedidos');
        setTermoBuscaAtivo("");

        if (localPedidos.length > 0) {
            const idsAtuaisDaAba = localPedidos.filter(p => obterAbaDoPedidoEfetiva(p) === 'pedidos').map(p => p.id);
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
        const pedidosNaAbaPedidos = localPedidos.filter(p => {
            if (!p) return false;
            return obterAbaDoPedidoEfetiva(p) === 'pedidos';
        });

        const novos = pedidosNaAbaPedidos.filter(p => !idsConhecidos.includes(p.id));
        return novos.length;
    }, [localPedidos, idsConhecidos, obterAbaDoPedidoEfetiva]);

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
            const abaInfo = obterAbaDoPedidoEfetiva(p);
            counts[abaInfo] = (counts[abaInfo] || 0) + 1;
        });

        return counts;
    }, [localPedidos, obterAbaDoPedidoEfetiva]);

    const verificarMatchBusca = useCallback((p: Pedido, termo: string): boolean => {
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
    }, []);

    const resultadosBuscaMenu = useMemo(() => {
        const termo = busca.toLowerCase().trim();
        if (!termo || termo.length < 2) return [];

        return localPedidos.filter(p => {
            if (!p) return false;
            return verificarMatchBusca(p, termo);
        }).slice(0, 8);
    }, [busca, localPedidos, verificarMatchBusca]);

    const selecionarPedidoDoMenu = (pedidoSelecionado: Pedido) => {
        const abaDestino = obterAbaDoPedidoEfetiva(pedidoSelecionado);
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
        const termoBuscaEfetivo = debouncedBusca.toLowerCase().trim();
        return localPedidos.filter(p => {
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
    }, [localPedidos, termoBuscaAtivo, debouncedBusca, filtroLogistica, ordenacao, abaAtiva, verificarMatchBusca, obterAbaDoPedidoEfetiva]);

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
                }
            `}</style>

            <div style={styles.headerFixoContainer}>
                <div className="gp-header-topo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '0px' }}>
                    <h2 style={{ fontSize: '20px', color: '#1e293b', margin: 0, fontWeight: 800 }}>📋 Gestão de Pedidos</h2>
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
                                        const infoAba = obterAbaDoPedidoEfetiva(p);

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
                        produção <span style={styles.badgeTotal}>({contadoresAbas['producao'] || 0})</span>
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

                <BarraDeAcoes
                    selecionados={selecionados || []}
                    idsVisiveisDaAba={pedidosFiltradosGlobais.map(p => p.id)}
                    localPedidos={localPedidos}
                    lojistaIdApp={lojistaIdApp}
                    db={db}
                    isAutomacaoAtiva={isAutomacaoHabilitada}
                    abaAtiva={abaAtiva}
                    setSelecionados={setSelecionados}
                    alterarStatusPedido={alterarStatusPedido}
                    setLocalPedidos={setLocalPedidos}
                    setAbaAtiva={setAbaAtiva}
                    cotarFrete={cotarFrete}
                    onCotarSelecionados={() => funcaoCotarRef.current()}
                    onConcluirRetirada={() => funcaoConcluirRetiradaRef.current()}
                    onConcluirEntregaLocal={() => funcaoConcluirEntregaLocalRef.current()}
                    onConcluirDigital={() => funcaoConcluirDigitalRef.current()}
                    onConfirmarRecebimento={() => funcaoConfirmarRecebimentoRef.current()}
                />
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
                        pedidos={localPedidos}
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
    selectLogistica: { padding: '7px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', cursor: 'pointer', backgroundColor: '#fff' },
    selectOrdenacaoStyle: { padding: '7px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', cursor: 'pointer', backgroundColor: '#fff' },
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