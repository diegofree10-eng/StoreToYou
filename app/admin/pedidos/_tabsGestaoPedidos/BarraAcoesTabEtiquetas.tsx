// components/_tabsGestaoPedidos/BarraAcoesTabEtiquetas.tsx
'use client';
import React, { useState } from 'react';
import ModalProcessamento from '../ModalProcessamento';
import AlertaErrosMelhorEnvio from './AlertaErrosMelhorEnvio';
import { doc, updateDoc } from 'firebase/firestore';

// 🌟 Importando o hook do tema global (ThemeContext)
import { useTheme } from "@/context/ThemeContext";

interface BarraAcoesProps {
    selecionados: string[];
    idsVisiveisDaAba: string[];
    localPedidos: any[];
    lojistaIdApp: string;
    db: any;
    isAutomacaoAtiva: boolean;
    abaAtiva: string;
    setSelecionados: React.Dispatch<React.SetStateAction<string[]>>;
    alterarStatusPedido: (pedidoId: string, novoStatus: string, dadosExtras?: any) => Promise<any>;
    setLocalPedidos: React.Dispatch<React.SetStateAction<any[]>>;
    setAbaAtiva: (aba: string) => void;
    cotarFrete?: (p: any) => Promise<any[]>;
    onCotarSelecionados?: () => void;
    onConcluirRetirada?: () => void;
    onConcluirEntregaLocal?: () => void;
    onConcluirDigital?: () => void;
    onConfirmarRecebimento?: () => void;
    listaEmbalagens?: any[];
    embalagemEscolhida?: string;
    setEmbalagemEscolhida?: (id: string) => void;
    onSalvarEmbalagemProducao?: () => void;
}

export default function BarraAcoesTabEtiquetas({
    selecionados = [],
    idsVisiveisDaAba = [],
    localPedidos = [],
    lojistaIdApp,
    db,
    isAutomacaoAtiva,
    abaAtiva,
    setSelecionados,
    alterarStatusPedido,
    setLocalPedidos,
    setAbaAtiva,
    cotarFrete,
    onCotarSelecionados,
    onConcluirRetirada,
    onConcluirEntregaLocal,
    onConcluirDigital,
    onConfirmarRecebimento,
    listaEmbalagens = [],
    embalagemEscolhida = "",
    setEmbalagemEscolhida,
    onSalvarEmbalagemProducao
}: BarraAcoesProps) {
    const { theme } = useTheme();

    const [carregandoAcao, setCarregandoAcao] = useState(false);
    const [modalProgresso, setModalProgresso] = useState<{
        aberto: boolean;
        titulo: string;
        itens: { id: string; numero: string; status: 'processando' | 'sucesso' | 'erro'; mensagem?: string }[];
    }>({ aberto: false, titulo: "", itens: [] });

    const [erroModalMelhorEnvio, setErroModalMelhorEnvio] = useState<string | null>(null);
    const [modalQuitacaoAberto, setModalQuitacaoAberto] = useState(false);
    const [formaPgtoRestante, setFormaPgtoRestante] = useState<string>("PIX");

    const isAbaConcluidos = abaAtiva === 'concluidos';
    const selecionadosNestaAba = isAbaConcluidos ? [] : selecionados.filter(id => idsVisiveisDaAba.includes(id));
    const selecionadosCount = selecionadosNestaAba.length;
    const temSelecionados = selecionadosCount > 0;

    const todosVisiveisSelecionados = !isAbaConcluidos && idsVisiveisDaAba.length > 0 && idsVisiveisDaAba.every(id => selecionados.includes(id));

    const pedidosSelecionadosObj = selecionadosNestaAba
        .map(id => localPedidos.find(p => p.id === id))
        .filter(Boolean);

    const resumoFinanceiroSelecionados = pedidosSelecionadosObj.reduce((acc, p) => {
        const fin = p?.financeiro || {};
        const subtotal = Number(fin.vlSubtotal ?? fin.subtotal ?? 0);
        const frete = Number(fin.vlFrete ?? fin.valorFrete ?? 0);
        const desconto = Number(fin.vlDesconto ?? fin.desconto ?? 0);
        const total = Number(fin.vlTotal ?? fin.total ?? (subtotal + frete - desconto));
        const entrada = Number(fin.vlEntrada ?? 0);
        const restante = Number(fin.vlRestante ?? Math.max(0, total - entrada));

        acc.totalGeral += total;
        acc.entradaGeral += entrada;
        acc.restanteGeral += restante;
        return acc;
    }, { totalGeral: 0, entradaGeral: 0, restanteGeral: 0 });

    const infoPedidoModal = selecionadosCount === 1 && pedidosSelecionadosObj.length === 1
        ? `Pedido #${pedidosSelecionadosObj[0]?.numeroPedido || pedidosSelecionadosObj[0]?.id.slice(-4)} de ${pedidosSelecionadosObj[0]?.cliente?.nome || pedidosSelecionadosObj[0]?.nomeCliente || 'Cliente'}`
        : `${selecionadosCount} pedidos selecionados`;

    const pedidosPendentesDeEtiqueta = pedidosSelecionadosObj.filter(p => {
        const idEtq = p?.Etiqueta?.IdEtiqueta;
        const codEnv = p?.Etiqueta?.codigoEnvio;
        const statusEtq = String(p?.Etiqueta?.statusEtiqueta || p?.statusEtiqueta || '').toLowerCase();
        if (idEtq && codEnv) return false;
        return statusEtq === 'pendente' || statusEtq === 'erro' || !statusEtq;
    });
    const qtdPendentes = pedidosPendentesDeEtiqueta.length;

    const pedidosComErroPagamento = pedidosSelecionadosObj.filter(p => {
        const statusEtq = String(p?.Etiqueta?.statusEtiqueta || p?.statusEtiqueta || "").toLowerCase();
        const temErroMsg = !!p?.erroPagamento || !!p?.Etiqueta?.erroPagamento || !!p?.mensagemErro;
        return statusEtq === 'pendente_saldo' || temErroMsg;
    });
    const qtdComErro = pedidosComErroPagamento.length;

    const possuiSaldoPendenteSelecionados = pedidosSelecionadosObj.some(p => {
        const vlRestante = Number(p?.financeiro?.vlRestante || 0);
        const statusPgto = p?.financeiro?.statusPagamento;
        return vlRestante > 0 && statusPgto !== 'pago';
    });

    const toggleSelecionarTodos = () => {
        if (isAbaConcluidos) return;
        if (todosVisiveisSelecionados) {
            setSelecionados(prev => prev.filter(id => !idsVisiveisDaAba.includes(id)));
        } else {
            setSelecionados(prev => Array.from(new Set([...prev, ...idsVisiveisDaAba])));
        }
    };

    const executarQuitacaoEmMassa = async () => {
        if (selecionadosCount === 0 || !db || !lojistaIdApp) return;

        setCarregandoAcao(true);
        try {
            for (const pedidoId of selecionadosNestaAba) {
                const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", pedidoId);
                const pedidoObj = localPedidos.find(p => p.id === pedidoId);
                const fin = pedidoObj?.financeiro || {};
                const subtotalVal = Number(fin.vlSubtotal ?? fin.subtotal ?? 0);
                const freteVal = Number(fin.vlFrete ?? fin.valorFrete ?? 0);
                const descontoVal = Number(fin.vlDesconto ?? fin.desconto ?? 0);
                const totalVal = Number(fin.vlTotal ?? fin.total ?? (subtotalVal + freteVal - descontoVal));

                await updateDoc(pedidoRef, {
                    dsStatusPedido: "Concluído",
                    enviado: true,
                    "StatusProducao.dsStatusProducao": "Concluído",
                    "StatusProducao.isPago": true,
                    "financeiro.vlEntrada": totalVal,
                    "financeiro.vlRestante": 0,
                    "financeiro.statusPagamento": "pago",
                    "financeiro.formaPagamentoQuitacao": formaPgtoRestante,
                    pago: true
                });
            }

            setLocalPedidos(prev => prev.map(p => {
                if (selecionadosNestaAba.includes(p.id)) {
                    const fin = p.financeiro || {};
                    const totalVal = Number(fin.vlTotal ?? fin.total ?? 0);
                    return {
                        ...p,
                        dsStatusPedido: "Concluído",
                        enviado: true,
                        pago: true,
                        financeiro: {
                            ...fin,
                            vlEntrada: totalVal,
                            vlRestante: 0,
                            statusPagamento: 'pago',
                            formaPagamentoQuitacao: formaPgtoRestante
                        }
                    };
                }
                return p;
            }));

            setSelecionados(prev => prev.filter(id => !idsVisiveisDaAba.includes(id)));
            setModalQuitacaoAberto(false);
            alert("✅ Pedidos quitados e concluídos com sucesso!");
        } catch (e: any) {
            alert("Erro ao quitar pedidos: " + e.message);
        } finally {
            setCarregandoAcao(false);
        }
    };

    const emitirEtiquetasEmMassa = async () => {
        if (isAbaConcluidos || selecionadosCount === 0) return alert("Selecione ao menos um pedido.");

        const pedidosParaProcessar = pedidosPendentesDeEtiqueta.filter(p => {
            const jaPossui = !!p?.Etiqueta?.codigoEnvio || !!p?.Etiqueta?.IdEtiqueta;
            return !jaPossui || p?.Etiqueta?.statusEtiqueta === 'erro' || !!p?.mensagemError;
        });

        if (pedidosParaProcessar.length === 0) {
            return alert("Nenhum pedido elegível para emissão (os selecionados já possuem etiqueta válida).");
        }

        setCarregandoAcao(true);
        setModalProgresso({
            aberto: true,
            titulo: "Emitindo Etiquetas em Massa",
            itens: pedidosParaProcessar.map(ped => ({
                id: ped.id,
                numero: ped?.numeroPedido ? String(ped.numeroPedido) : ped.id.slice(-4),
                status: 'processando',
                mensagem: 'Limpando dados antigos e emitindo...'
            }))
        });

        try {
            for (const ped of pedidosParaProcessar) {
                if (db && lojistaIdApp) {
                    const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", ped.id);
                    await updateDoc(pedidoRef, {
                        "Etiqueta": {
                            isEtiquetaGerada: false,
                            statusEtiqueta: "processando",
                            urlEtiqueta: null,
                            IdEtiqueta: null,
                            codigoEnvio: null,
                            dsNumRastreio: null,
                            mensagemErro: null
                        },
                        "statusEtiqueta": "processando",
                        "dsNumRastreio": null,
                        "mensagemErro": null
                    }).catch(() => { });
                }
            }

            const res = await fetch("/api/frete/gerar-massa", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lojistaId: lojistaIdApp, orders: pedidosParaProcessar })
            });
            const data = await res.json();

            const traduzirErroMelhorEnvio = (msgBruta: string) => {
                const m = (msgBruta || "").toLowerCase();
                if (m.includes("unauthenticated") || m.includes("token")) return "Token expirado. Reconecte a integração.";
                if (m.includes("cep")) return "CEP de origem ou destino inválido.";
                if (m.includes("balance") || m.includes("saldo")) return "Saldo insuficiente no Melhor Envio.";
                return msgBruta || "Erro ao processar etiqueta.";
            };

            const novosItensProgresso = await Promise.all(pedidosParaProcessar.map(async (ped) => {
                const num = ped?.numeroPedido ? String(ped.numeroPedido) : ped.id.slice(-4);
                const resultadoItem = data.results?.find((r: any) => r.pedido === ped.id || r.pedidoId === ped.id);
                const erroItem = data.errors?.find((err: any) => err.pedido === ped.id);
                const isSucesso = resultadoItem && (resultadoItem.status === 'sucesso' || resultadoItem.sucesso);
                const mensagemErroBruta = erroItem?.message || resultadoItem?.erro || (isSucesso ? null : data.error);

                if (db && lojistaIdApp) {
                    const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", ped.id);
                    if (isSucesso) {
                        await updateDoc(pedidoRef, {
                            "Etiqueta.isEtiquetaGerada": true,
                            "Etiqueta.statusEtiqueta": "gerada",
                            "Etiqueta.IdEtiqueta": resultadoItem.id || resultadoItem.IdEtiqueta,
                            "Etiqueta.codigoEnvio": resultadoItem.codigoEnvio,
                            "Etiqueta.urlEtiqueta": resultadoItem.url,
                            "Etiqueta.mensagemErro": null,
                            "statusEtiqueta": "gerada",
                            "dsNumRastreio": resultadoItem.dsNumRastreio || resultadoItem.codigoEnvio,
                            "mensagemErro": null
                        }).catch(() => { });
                    } else if (mensagemErroBruta) {
                        const mensagemAmigavel = traduzirErroMelhorEnvio(mensagemErroBruta);
                        await updateDoc(pedidoRef, {
                            "Etiqueta.statusEtiqueta": "erro",
                            "Etiqueta.mensagemErro": mensagemAmigavel,
                            "statusEtiqueta": "erro",
                            "mensagemErro": mensagemAmigavel
                        }).catch(() => { });
                    }
                }

                if (isSucesso) {
                    return { id: ped.id, numero: num, status: 'sucesso' as const, mensagem: 'Etiqueta emitida com sucesso!' };
                }
                return { id: ped.id, numero: num, status: 'erro' as const, mensagem: traduzirErroMelhorEnvio(mensagemErroBruta) };
            }));

            setModalProgresso(prev => ({ ...prev, itens: novosItensProgresso }));
        } catch (e: any) {
            alert("Erro de conexão ao emitir etiquetas: " + e.message);
            setModalProgresso(prev => ({ ...prev, aberto: false }));
        } finally {
            setCarregandoAcao(false);
        }
    };

    const tentarPagamentoEmMassa = async () => {
        if (isAbaConcluidos || qtdComErro === 0) return;
        setCarregandoAcao(true);
        setModalProgresso({
            aberto: true,
            titulo: "Reprocessando Pagamento de Etiquetas",
            itens: pedidosComErroPagamento.map(ped => ({
                id: ped.id,
                numero: ped?.numeroPedido ? String(ped.numeroPedido) : ped.id.slice(-4),
                status: 'processando',
                mensagem: 'Tentando pagar...'
            }))
        });

        try {
            const res = await fetch("/api/frete/tentar-pagamento", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lojistaId: lojistaIdApp, orders: pedidosComErroPagamento.map(idObj => localPedidos.find(p => p.id === (typeof idObj === 'string' ? idObj : idObj.id))).filter(Boolean) })
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                setModalProgresso(prev => ({ ...prev, aberto: false }));
                setErroModalMelhorEnvio(data.error || "Falha ao reprocessar pagamento.");
                return;
            }
            setModalProgresso(prev => ({
                ...prev,
                itens: prev.itens.map(item => {
                    const resultadoItem = data.results?.find((r: any) => r.pedido === item.id || r.pedidoId === item.id);
                    if (resultadoItem && (resultadoItem.status === 'sucesso' || resultadoItem.sucesso)) {
                        return { ...item, status: 'sucesso', mensagem: 'Pagamento aprovado!' };
                    }
                    const erroItem = data.errors?.find((err: any) => err.pedido === item.id);
                    return { ...item, status: 'erro', mensagem: erroItem?.message || 'Saldo ainda insuficiente' };
                })
            }));
        } catch (e: any) {
            setModalProgresso(prev => ({ ...prev, aberto: false }));
            setErroModalMelhorEnvio("Erro ao tentar pagamento: " + e.message);
        } finally {
            setCarregandoAcao(false);
        }
    };

    const imprimirEtiquetasEmMassa = async () => {
        if (isAbaConcluidos || selecionadosCount === 0) return alert("Selecione ao menos um pedido.");
        setCarregandoAcao(true);
        try {
            const pedidosCompletos = selecionadosNestaAba.map(id => localPedidos.find(p => p.id === id)).filter(Boolean);
            const res = await fetch("/api/melhor-envio/etiquetas/imprimir", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lojistaId: lojistaIdApp, orders: pedidosCompletos })
            });
            const data = await res.json();
            if (data.url) window.open(data.url, '_blank');
            else setErroModalMelhorEnvio(data.erro || "Não foi possível gerar o PDF.");
        } catch (e: any) {
            setErroModalMelhorEnvio("Erro ao imprimir: " + e.message);
        } finally {
            setCarregandoAcao(false);
        }
    };

    const enviarPedidosEmMassa = async () => {
        if (isAbaConcluidos || selecionadosCount === 0) return alert("Selecione ao menos um pedido.");
        const validos = localPedidos.filter(p => selecionadosNestaAba.includes(p.id));
        if (validos.length === 0) return;

        const pedidosComEtiquetaIncompleta = validos.filter(p => {
            const etq = p?.Etiqueta || {};
            const isGerada = etq.isEtiquetaGerada === true || p?.etiquetaGerada === true;
            const temUrl = !!etq.urlEtiqueta || !!p?.urlEtiqueta;
            const temRastreio = !!etq.dsNumRastreio || !!p?.dsNumRastreio;
            return !isGerada || !temUrl || !temRastreio;
        });

        if (pedidosComEtiquetaIncompleta.length > 0) {
            return alert(`❌ Operação bloqueada! Há ${pedidosComEtiquetaIncompleta.length} pedido(s) sem etiqueta gerada, URL ou rastreio.`);
        }

        if (!confirm(`Deseja mover ${validos.length} pedido(s) para a aba de Enviados?`)) return;

        setCarregandoAcao(true);
        try {
            for (const pedido of validos) {
                await alterarStatusPedido(pedido.id, 'enviado', { "enviado": true, "dataEnvio": new Date().toISOString() });
            }
            setSelecionados(prev => prev.filter(id => !validos.some(v => v.id === id)));
            alert("✅ Pedidos movidos para Enviados com sucesso!");
        } catch (e: any) {
            alert("Erro ao enviar pedidos: " + e.message);
        } finally {
            setCarregandoAcao(false);
        }
    };

    const sincronizarPagamentos = async () => {
        if (isAbaConcluidos) return;
        setCarregandoAcao(true);
        try {
            const res = await fetch("/api/frete/sincronizar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lojistaId: lojistaIdApp })
            });
            const data = await res.json();
            alert(`Sincronização concluída: ${data.atualizados || 0} pedidos atualizados.`);
            window.location.reload();
        } catch (e: any) {
            alert("Erro ao sincronizar: " + e.message);
        } finally {
            setCarregandoAcao(false);
        }
    };

    if (isAbaConcluidos) return null;

    return (
        <>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: theme.bgCard,
                border: `1px solid ${theme.border}`,
                padding: '8px 14px',
                borderRadius: '8px',
                marginTop: '10px',
                minHeight: '42px',
                boxSizing: 'border-box',
                flexWrap: 'wrap',
                gap: '10px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                        type="checkbox"
                        checked={todosVisiveisSelecionados && idsVisiveisDaAba.length > 0}
                        onChange={toggleSelecionarTodos}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: theme.primary }}
                        title="Selecionar/Desselecionar visíveis da aba"
                    />
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: theme.textMain }}>
                        {selecionadosCount} selecionado(s)
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minHeight: '30px' }}>
                    {temSelecionados ? (
                        <>
                            {abaAtiva === 'cotar' && onCotarSelecionados && (
                                <button
                                    disabled={carregandoAcao}
                                    onClick={onCotarSelecionados}
                                    style={{ backgroundColor: theme.primary, color: '#fff', borderWidth: '0px', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    ⚡ Cotar Frete Selecionados ({selecionadosCount})
                                </button>
                            )}

                            {abaAtiva === 'retirada' && onConcluirRetirada && (
                                <button
                                    disabled={carregandoAcao}
                                    onClick={() => {
                                        if (possuiSaldoPendenteSelecionados) setModalQuitacaoAberto(true);
                                        else onConcluirRetirada();
                                    }}
                                    style={{ backgroundColor: '#10b981', color: '#fff', borderWidth: '0px', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    ✅ Confirmar Retirada ({selecionadosCount})
                                </button>
                            )}

                            {abaAtiva === 'entregalocal' && onConcluirEntregaLocal && (
                                <button
                                    disabled={carregandoAcao}
                                    onClick={() => {
                                        if (possuiSaldoPendenteSelecionados) setModalQuitacaoAberto(true);
                                        else onConcluirEntregaLocal();
                                    }}
                                    style={{ backgroundColor: '#10b981', color: '#fff', borderWidth: '0px', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    ✅ Confirmar Entrega Local ({selecionadosCount})
                                </button>
                            )}

                            {abaAtiva === 'digital' && onConcluirDigital && (
                                <button
                                    disabled={carregandoAcao}
                                    onClick={onConcluirDigital}
                                    style={{ backgroundColor: '#10b981', color: '#fff', borderWidth: '0px', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    ✅ Concluir Envio ({selecionadosCount})
                                </button>
                            )}

                            {abaAtiva === 'enviados' && onConfirmarRecebimento && (
                                <button
                                    disabled={carregandoAcao}
                                    onClick={onConfirmarRecebimento}
                                    style={{ backgroundColor: '#10b981', color: '#fff', borderWidth: '0px', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    ✅ Confirmar Recebimento ({selecionadosCount})
                                </button>
                            )}

                            {abaAtiva === 'etiquetas' && (
                                <>
                                    {qtdPendentes > 0 && (
                                        <button
                                            disabled={carregandoAcao}
                                            onClick={emitirEtiquetasEmMassa}
                                            style={{ backgroundColor: '#10b981', color: '#fff', borderWidth: '0px', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            ⚡ Emitir Etiquetas ({qtdPendentes})
                                        </button>
                                    )}

                                    {isAutomacaoAtiva && qtdComErro > 0 && (
                                        <button
                                            disabled={carregandoAcao}
                                            onClick={tentarPagamentoEmMassa}
                                            style={{ backgroundColor: '#f59e0b', color: '#fff', borderWidth: '0px', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            💳 Tentar Pagamento ({qtdComErro})
                                        </button>
                                    )}

                                    {isAutomacaoAtiva && (
                                        <button
                                            disabled={carregandoAcao}
                                            onClick={imprimirEtiquetasEmMassa}
                                            style={{ backgroundColor: theme.primary, color: '#fff', borderWidth: '0px', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            🖨️ Imprimir ({selecionadosCount})
                                        </button>
                                    )}

                                    <button
                                        disabled={carregandoAcao}
                                        onClick={enviarPedidosEmMassa}
                                        style={{ backgroundColor: '#10b981', color: '#fff', borderWidth: '0px', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        🚀 Enviar ({selecionadosCount})
                                    </button>
                                </>
                            )}

                            {abaAtiva === 'etiquetas' && (
                                <button
                                    disabled={carregandoAcao}
                                    onClick={sincronizarPagamentos}
                                    style={{ backgroundColor: '#8b5cf6', color: '#fff', borderWidth: '0px', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    🔄 Sincronizar
                                </button>
                            )}

                            <button
                                onClick={() => setSelecionados(prev => prev.filter(id => !idsVisiveisDaAba.includes(id)))}
                                style={{
                                    background: 'transparent',
                                    color: '#ef4444',
                                    border: `1px solid #ef4444`,
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                Limpar
                            </button>
                        </>
                    ) : null}
                </div>
            </div>

            {modalQuitacaoAberto && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
                    <div style={{ background: theme.bgCard, color: theme.textMain, padding: '22px', borderRadius: '12px', width: '420px', maxWidth: '90%', border: `1px solid ${theme.border}`, boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
                        <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: theme.textMain, fontWeight: 'bold' }}>Quitar Saldo Restante</h3>
                        <p style={{ fontSize: '12px', color: theme.textSec, margin: '0 0 16px 0' }}>{infoPedidoModal}</p>

                        <div style={{ background: theme.inputBg, padding: '12px 14px', borderRadius: '8px', marginBottom: '16px', border: `1px solid ${theme.border}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: theme.textMain }}>
                                <span>Total do Pedido:</span>
                                <span style={{ fontWeight: 'bold' }}>R$ {resumoFinanceiroSelecionados.totalGeral.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: '#10b981' }}>
                                <span>Já Pago (Entrada):</span>
                                <span style={{ fontWeight: 'bold' }}>R$ {resumoFinanceiroSelecionados.entradaGeral.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', borderTop: `1px solid ${theme.border}`, paddingTop: '8px', marginTop: '4px', color: '#ef4444' }}>
                                <span>Valor Restante:</span>
                                <span>R$ {resumoFinanceiroSelecionados.restanteGeral.toFixed(2).replace('.', ',')}</span>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, display: 'block', marginBottom: '6px' }}>Forma de Recebimento do Restante:</label>
                            <select
                                value={formaPgtoRestante}
                                onChange={(e) => setFormaPgtoRestante(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}`, fontSize: '13px', outline: 'none', fontWeight: '600', cursor: 'pointer' }}
                            >
                                <option value="PIX">PIX</option>
                                <option value="DINHEIRO">Dinheiro</option>
                                <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                                <option value="CARTAO_DEBITO">Cartão de Débito</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={() => setModalQuitacaoAberto(false)}
                                style={{ flex: 1, padding: '10px', background: theme.border, borderWidth: '0px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', color: theme.textMain, fontSize: '13px' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={carregandoAcao}
                                onClick={executarQuitacaoEmMassa}
                                style={{ flex: 1, padding: '10px', background: '#10b981', borderWidth: '0px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', color: '#fff', fontSize: '13px' }}
                            >
                                {carregandoAcao ? "Processando..." : "Confirmar e Concluir"}
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

            <AlertaErrosMelhorEnvio
                erroMensagem={erroModalMelhorEnvio}
                onLimparErro={() => setErroModalMelhorEnvio(null)}
            />
        </>
    );
}
// Barra de acoes controla toda a logica do select de Status produção e botoes de Etiquetas na TabEmitirEtiquetas.tsx
//⚡ Emitir (Emitir Etiquetas) — Para gerar as etiquetas em lote na API do Melhor Envio.

//🖨️ Imprimir — Para abrir o PDF consolidado de impressão das etiquetas geradas.

//🚀 Enviar — Para mover os pedidos selecionados diretamente para a aba de Enviados.

//⚙️ Mudar Status / Ações... (Menu Suspenso / Select) — O botão/seletor de ações em massa
// para alterar status de produção, marcar como pago/não pago ou excluir.