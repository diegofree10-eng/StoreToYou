// components/_tabsGestaoPedidos/BarraAcoesTabEtiquetas.tsx
'use client';
import React, { useState } from 'react';
import ModalProcessamento from '../ModalProcessamento';
import { doc, updateDoc } from 'firebase/firestore';

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
    onConfirmarRecebimento
}: BarraAcoesProps) {
    const [carregandoAcao, setCarregandoAcao] = useState(false);
    const [modalProgresso, setModalProgresso] = useState<{
        aberto: boolean;
        titulo: string;
        itens: { id: string; numero: string; status: 'processando' | 'sucesso' | 'erro'; mensagem?: string }[];
    }>({ aberto: false, titulo: "", itens: [] });

    // 🛡️ Se estiver na aba de concluídos, bloqueia completamente seleções e ações em massa
    const isAbaConcluidos = abaAtiva === 'concluidos';

    // 🎯 Filtra os selecionados para considerar estritamente apenas os que pertencem aos IDs visíveis da aba atual
    const selecionadosNestaAba = isAbaConcluidos ? [] : selecionados.filter(id => idsVisiveisDaAba.includes(id));
    const selecionadosCount = selecionadosNestaAba.length;
    const temSelecionados = selecionadosCount > 0;

    const todosVisiveisSelecionados = !isAbaConcluidos && idsVisiveisDaAba.length > 0 && idsVisiveisDaAba.every(id => selecionados.includes(id));

    // 🔍 Filtro 1: Pedidos sem etiqueta gerada (exclui os que deram erro ou pendência de saldo)
    const pedidosSelecionadosObj = selecionadosNestaAba
        .map(id => localPedidos.find(p => p.id === id))
        .filter(Boolean);

    const pedidosPendentesDeEtiqueta = pedidosSelecionadosObj.filter(
        p => p?.Etiqueta?.isEtiquetaGerada !== true &&
            p?.Etiqueta?.statusEtiqueta !== 'erro' &&
            p?.Etiqueta?.statusEtiqueta !== 'pendente_saldo' &&
            p?.statusEtiqueta !== 'pendente_saldo'
    );
    const qtdPendentes = pedidosPendentesDeEtiqueta.length;

    // 🔍 Filtro 2: Pedidos com erro de pagamento ou pendência de saldo (para o botão Tentar Pagamento)
    const pedidosComErroPagamento = pedidosSelecionadosObj.filter(p => {
        const statusEtq = String(p?.Etiqueta?.statusEtiqueta || p?.statusEtiqueta || "").toLowerCase();
        const temErroMsg = !!p?.erroPagamento || !!p?.Etiqueta?.erroPagamento || !!p?.mensagemErro;
        return statusEtq === 'erro' || statusEtq === 'pendente_saldo' || temErroMsg;
    });
    const qtdComErro = pedidosComErroPagamento.length;

    const toggleSelecionarTodos = () => {
        if (isAbaConcluidos) return;
        if (todosVisiveisSelecionados) {
            setSelecionados(prev => prev.filter(id => !idsVisiveisDaAba.includes(id)));
        } else {
            setSelecionados(prev => Array.from(new Set([...prev, ...idsVisiveisDaAba])));
        }
    };

    // ⚡ 1. Emitir Etiquetas em Massa
    const emitirEtiquetasEmMassa = async () => {
        if (isAbaConcluidos) return;
        if (selecionadosCount === 0) return alert("Selecione ao menos um pedido.");
        if (qtdPendentes === 0) return;

        setCarregandoAcao(true);
        setModalProgresso({
            aberto: true,
            titulo: "Emitindo Etiquetas em Massa",
            itens: pedidosPendentesDeEtiqueta.map(ped => {
                const num = ped?.numeroPedido ? String(ped.numeroPedido) : ped.id.slice(-4);
                return { id: ped.id, numero: num, status: 'processando', mensagem: 'Aguardando...' };
            })
        });

        try {
            const res = await fetch("/api/frete/gerar-massa", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    lojistaId: lojistaIdApp,
                    orders: pedidosPendentesDeEtiqueta
                })
            });
            const data = await res.json();

            setModalProgresso(prev => ({
                ...prev,
                itens: prev.itens.map(item => {
                    const resultadoItem = data.results?.find((r: any) => r.pedido === item.id || r.pedidoId === item.id);
                    if (resultadoItem && (resultadoItem.status === 'sucesso' || resultadoItem.sucesso)) {
                        return { ...item, status: 'sucesso', mensagem: 'Etiqueta emitida com sucesso!' };
                    }
                    const erroItem = data.errors?.find((err: any) => err.pedido === item.id);
                    return { ...item, status: 'erro', mensagem: erroItem?.message || resultadoItem?.erro || data.error || 'Falha ao emitir' };
                })
            }));
        } catch (e: any) {
            alert("Erro ao emitir etiquetas: " + e.message);
            setModalProgresso(prev => ({ ...prev, aberto: false }));
        } finally {
            setCarregandoAcao(false);
        }
    };

    // 💳 1.2 Tentar Pagamento Novamente (Exclusivo para Automático)
    const tentarPagamentoEmMassa = async () => {
        if (isAbaConcluidos || qtdComErro === 0) return;

        setCarregandoAcao(true);
        setModalProgresso({
            aberto: true,
            titulo: "Reprocessando Pagamento de Etiquetas",
            itens: pedidosComErroPagamento.map(ped => {
                const num = ped?.numeroPedido ? String(ped.numeroPedido) : ped.id.slice(-4);
                return { id: ped.id, numero: num, status: 'processando', mensagem: 'Tentando pagar...' };
            })
        });

        try {
            const res = await fetch("/api/frete/tentar-pagamento", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    lojistaId: lojistaIdApp,
                    orders: pedidosCompletosOuErro(pedidosComErroPagamento)
                })
            });
            const data = await res.json();

            setModalProgresso(prev => ({
                ...prev,
                itens: prev.itens.map(item => {
                    const resultadoItem = data.results?.find((r: any) => r.pedido === item.id || r.pedidoId === item.id);
                    if (resultadoItem && (resultadoItem.status === 'sucesso' || resultadoItem.sucesso)) {
                        return { ...item, status: 'sucesso', mensagem: 'Pagamento aprovado e etiqueta gerada!' };
                    }
                    const erroItem = data.errors?.find((err: any) => err.pedido === item.id);
                    return { ...item, status: 'erro', mensagem: erroItem?.message || 'Saldo ainda insuficiente ou falha' };
                })
            }));
        } catch (e: any) {
            alert("Erro ao tentar pagamento: " + e.message);
            setModalProgresso(prev => ({ ...prev, aberto: false }));
        } finally {
            setCarregandoAcao(false);
        }
    };

    const pedidosCompletosOuErro = (lista: any[]) => {
        return lista.map(idObj => {
            const id = typeof idObj === 'string' ? idObj : idObj.id;
            return localPedidos.find(p => p.id === id);
        }).filter(Boolean);
    };

    // 🖨️ 2. Imprimir Etiquetas em Massa
    const imprimirEtiquetasEmMassa = async () => {
        if (isAbaConcluidos || selecionadosCount === 0) return alert("Selecione ao menos um pedido.");

        setCarregandoAcao(true);
        try {
            const pedidosCompletos = selecionadosNestaAba
                .map(id => localPedidos.find(p => p.id === id))
                .filter(Boolean);

            const res = await fetch("/api/melhor-envio/etiquetas/imprimir", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lojistaId: lojistaIdApp, orders: pedidosCompletos })
            });
            const data = await res.json();
            if (data.url) {
                window.open(data.url, '_blank');
            } else {
                alert(data.erro || "Não foi possível gerar o PDF de impressão.");
            }
        } catch (e: any) {
            alert("Erro ao imprimir etiquetas: " + e.message);
        } finally {
            setCarregandoAcao(false);
        }
    };

    // 🚀 3. Enviar Pedidos em Massa
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
            alert(`❌ Operação bloqueada! Há ${pedidosComEtiquetaIncompleta.length} pedido(s) selecionado(s) sem etiqueta gerada, sem URL ou sem número de rastreio.`);
            return;
        }

        if (!confirm(`Deseja mover ${validos.length} pedido(s) selecionado(s) para a aba de Enviados?`)) return;

        setCarregandoAcao(true);
        try {
            for (const pedido of validos) {
                await alterarStatusPedido(pedido.id, 'enviado', {
                    "enviado": true,
                    "dataEnvio": new Date().toISOString()
                });
            }
            setSelecionados(prev => prev.filter(id => !validos.some(v => v.id === id)));
            alert("✅ Pedidos movidos para a aba de Enviados com sucesso!");
        } catch (e: any) {
            alert("Erro ao enviar pedidos: " + e.message);
        } finally {
            setCarregandoAcao(false);
        }
    };

    // ✨ 4. Forçar Status Concluído
    const marcarComoConcluidoEmLote = async () => {
        if (isAbaConcluidos) return;
        if (selecionadosCount === 0) return alert("Selecione ao menos um pedido.");
        if (!db || !lojistaIdApp) return;

        if (!confirm(`Deseja marcar ${selecionadosCount} pedido(s) selecionado(s) como Concluído?`)) return;

        setCarregandoAcao(true);
        try {
            for (const pedidoId of selecionadosNestaAba) {
                const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", pedidoId);
                const dadosAtualizacao = {
                    status: 'Concluído',
                    enviado: true,
                    "StatusProducao.dsStatusProdução": 'Concluído',
                    "StatusProducao.isConcluido": true
                };

                await updateDoc(pedidoRef, dadosAtualizacao);
            }

            setLocalPedidos(prev => prev.map(p => {
                if (selecionadosNestaAba.includes(p.id)) {
                    return {
                        ...p,
                        status: 'Concluído',
                        enviado: true,
                        StatusProducao: {
                            ...(p as any).StatusProducao,
                            dsStatusProdução: 'Concluído',
                            isConcluido: true
                        }
                    };
                }
                return p;
            }));

            setSelecionados(prev => prev.filter(id => !idsVisiveisDaAba.includes(id)));
            alert(`✅ ${selecionadosCount} pedido(s) atualizados para Concluído com sucesso!`);
        } catch (e: any) {
            alert("Erro ao atualizar pedidos: " + e.message);
        } finally {
            setCarregandoAcao(false);
        }
    };

    // 🔄 5. Sincronizar Pagamentos / Dados da Etiqueta
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

    // 🔄 6. Resetar / Liberar Status da Etiqueta em Massa
    const resetarEtiquetasEmMassa = async () => {
        if (isAbaConcluidos || selecionadosCount === 0) return alert("Selecione ao menos um pedido.");
        if (!db || !lojistaIdApp) return;

        if (!confirm(`⚠️ Deseja resetar o status da etiqueta de ${selecionadosCount} pedido(s) selecionado(s)?`)) return;

        setCarregandoAcao(true);
        try {
            for (const pedidoId of selecionadosNestaAba) {
                const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", pedidoId);
                await updateDoc(pedidoRef, {
                    "Etiqueta.isEtiquetaGerada": false,
                    "Etiqueta.statusEtiqueta": "pendente",
                    "Etiqueta.urlEtiqueta": null,
                    "Etiqueta.IdEtiqueta": null,
                    "Etiqueta.codigoEnvio": null,
                    "Etiqueta.dsNumRastreio": null,
                    "statusEtiqueta": "pendente",
                    "dsNumRastreio": ""
                });
            }

            setLocalPedidos(prev => prev.map(p => {
                if (selecionadosNestaAba.includes(p.id)) {
                    return {
                        ...p,
                        statusEtiqueta: "pendente",
                        dsNumRastreio: "",
                        Etiqueta: {
                            ...(p as any).Etiqueta,
                            isEtiquetaGerada: false,
                            statusEtiqueta: "pendente",
                            urlEtiqueta: null,
                            IdEtiqueta: null,
                            codigoEnvio: null,
                            dsNumRastreio: null
                        }
                    };
                }
                return p;
            }));

            setSelecionados(prev => prev.filter(id => !idsVisiveisDaAba.includes(id)));
            alert(`✅ ${selecionadosCount} etiqueta(s) resetada(s) com sucesso!`);
        } catch (e: any) {
            alert("Erro ao resetar etiquetas: " + e.message);
        } finally {
            setCarregandoAcao(false);
        }
    };

    // ⚙️ 7. Mudar Status em Massa (Select)
    const alterarStatusMassa = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (isAbaConcluidos) return;
        const valorAcao = e.target.value;
        if (!valorAcao) return;

        if (selecionadosCount === 0) {
            alert("Selecione ao menos um pedido.");
            e.target.value = "";
            return;
        }

        if (valorAcao === 'resetar_etiqueta') {
            e.target.value = "";
            await resetarEtiquetasEmMassa();
            return;
        }

        if (valorAcao !== 'pago' && valorAcao !== 'nao_pago') {
            const pedidosNaoPagos = selecionadosNestaAba
                .map(id => localPedidos.find(p => p.id === id))
                .filter(p => {
                    if (!p) return false;
                    const isPagoReal = p.pago === true || p.StatusProducao?.isPago === true || p.statusPagamento === 'pago';
                    return !isPagoReal;
                });

            if (pedidosNaoPagos.length > 0) {
                alert(`❌ Operação bloqueada! Há ${pedidosNaoPagos.length} pedido(s) que não estão PAGOS.`);
                e.target.value = "";
                return;
            }
        }

        setCarregandoAcao(true);
        try {
            if (valorAcao === 'pago' || valorAcao === 'nao_pago') {
                const novoPago = valorAcao === 'pago';
                for (const pedidoId of selecionadosNestaAba) {
                    await alterarStatusPedido(pedidoId, 'pendente', {
                        "StatusProducao.isPago": novoPago
                    });
                }
                setSelecionados(prev => prev.filter(id => !idsVisiveisDaAba.includes(id)));
                alert(`✅ ${selecionadosCount} pedido(s) atualizado(s) para ${novoPago ? 'PAGO' : 'NÃO PAGO'}!`);
                if (novoPago) setAbaAtiva('pendente');
            } else {
                if (!confirm(`Deseja alterar o status de produção para "${valorAcao.toUpperCase()}"?`)) {
                    e.target.value = "";
                    return;
                }
                for (const pedidoId of selecionadosNestaAba) {
                    await alterarStatusPedido(pedidoId, valorAcao.toLowerCase());
                }
                setSelecionados(prev => prev.filter(id => !idsVisiveisDaAba.includes(id)));
                alert("✅ Status atualizado com sucesso!");
            }
        } catch (e: any) {
            alert("Erro ao atualizar em massa: " + e.message);
        } finally {
            setCarregandoAcao(false);
            e.target.value = "";
        }
    };

    // 🛡️ Se estiver na aba de concluídos, não exibe nenhuma barra de ação ou controle de massa
    if (isAbaConcluidos) {
        return null; 
    }

    return (
        <>
            <div style={styles.selectionBarTop}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                        type="checkbox"
                        checked={todosVisiveisSelecionados && idsVisiveisDaAba.length > 0}
                        onChange={toggleSelecionarTodos}
                        style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                        title="Selecionar todos os pedidos visíveis desta aba"
                    />
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>
                        {temSelecionados ? `${selecionadosCount} selecionado(s)` : 'Nenhum selecionado'}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <select
                        onChange={alterarStatusMassa}
                        defaultValue=""
                        style={styles.selectAcaoMassa}
                        disabled={carregandoAcao}
                    >
                        <option value="" disabled>⚙️ Mudar Status / Ações...</option>
                        <option value="pago">✅ Marcar como Pago</option>
                        <option value="nao_pago">❌ Marcar como Não Pago</option>
                        <option value="pendente">⏳ Status: Pendente</option>
                        <option value="produção">⚙️ Status: Produção</option>
                        <option value="pronto">✅ Status: Pronto</option>
                        {abaAtiva === 'etiquetas' && (
                            <option value="resetar_etiqueta">🔄 Resetar Etiqueta (Reemitir)</option>
                        )}
                    </select>

                    <div style={{ width: '55px', display: 'flex', justifyContent: 'center' }}>
                        {temSelecionados ? (
                            <button
                                onClick={() => setSelecionados(prev => prev.filter(id => !idsVisiveisDaAba.includes(id)))}
                                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', padding: '4px 8px' }}
                            >
                                Limpar
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>

            <div style={styles.selectionBarBottom}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end', width: '100%' }}>
                    {abaAtiva === 'cotar' && temSelecionados && (
                        <button
                            disabled={carregandoAcao}
                            onClick={onCotarSelecionados}
                            style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            ⚡ Cotar Frete Selecionados ({selecionadosCount})
                        </button>
                    )}

                    {abaAtiva === 'retirada' && temSelecionados && onConcluirRetirada && (
                        <button
                            disabled={carregandoAcao}
                            onClick={onConcluirRetirada}
                            style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            ✅ Confirmar Retirada ({selecionadosCount})
                        </button>
                    )}

                    {abaAtiva === 'entregalocal' && temSelecionados && onConcluirEntregaLocal && (
                        <button
                            disabled={carregandoAcao}
                            onClick={onConcluirEntregaLocal}
                            style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            ✅ Confirmar Entrega Local ({selecionadosCount})
                        </button>
                    )}

                    {abaAtiva === 'digital' && temSelecionados && onConcluirDigital && (
                        <button
                            disabled={carregandoAcao}
                            onClick={onConcluirDigital}
                            style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            ✅ Concluir Envio ({selecionadosCount})
                        </button>
                    )}

                    {abaAtiva === 'enviados' && temSelecionados && onConfirmarRecebimento && (
                        <button
                            disabled={carregandoAcao}
                            onClick={onConfirmarRecebimento}
                            style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            ✅ Confirmar Recebimento ({selecionadosCount})
                        </button>
                    )}

                    {abaAtiva === 'etiquetas' && temSelecionados && (
                        <>
                            {qtdPendentes > 0 && (
                                <button
                                    disabled={carregandoAcao}
                                    onClick={emitirEtiquetasEmMassa}
                                    style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    ⚡ Emitir Etiquetas ({qtdPendentes})
                                </button>
                            )}

                            {isAutomacaoAtiva && qtdComErro > 0 && (
                                <button
                                    disabled={carregandoAcao}
                                    onClick={tentarPagamentoEmMassa}
                                    style={{ backgroundColor: '#f59e0b', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    💳 Tentar Pagamento ({qtdComErro})
                                </button>
                            )}

                            {isAutomacaoAtiva && (
                                <button
                                    disabled={carregandoAcao}
                                    onClick={imprimirEtiquetasEmMassa}
                                    style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    🖨️ Imprimir Etiquetas ({selecionadosCount})
                                </button>
                            )}

                            <button
                                disabled={carregandoAcao}
                                onClick={enviarPedidosEmMassa}
                                style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                🚀 Enviar Pedidos ({selecionadosCount})
                            </button>
                        </>
                    )}

                    {abaAtiva === 'etiquetas' && (
                        <button
                            disabled={carregandoAcao}
                            onClick={sincronizarPagamentos}
                            style={{ backgroundColor: '#8b5cf6', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            🔄 Sincronizar Dados da Etiqueta {temSelecionados ? `(${selecionadosCount})` : ''}
                        </button>
                    )}
                </div>
            </div>

            <ModalProcessamento
                aberto={modalProgresso.aberto}
                titulo={modalProgresso.titulo}
                itens={modalProgresso.itens}
                onFechar={() => {
                    setModalProgresso(prev => ({ ...prev, aberto: false }));
                    window.location.reload();
                }}
            />
        </>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    selectionBarTop: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '10px',
        backgroundColor: '#fff',
        padding: '0 16px',
        height: '52px',
        width: '100%',
        boxSizing: 'border-box',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
        border: '1px solid #e2e8f0',
        borderBottom: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        position: 'sticky',
        top: '10px',
        zIndex: 50
    },
    selectionBarBottom: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: '10px 16px',
        minHeight: '55px',
        width: '100%',
        boxSizing: 'border-box',
        borderBottomLeftRadius: '8px',
        borderBottomRightRadius: '8px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        position: 'sticky',
        top: '62px',
        zIndex: 49
    },
    selectAcaoMassa: {
        padding: '7px 12px',
        borderRadius: '6px',
        border: '1px solid #cbd5e1',
        fontSize: '13px',
        outline: 'none',
        cursor: 'pointer',
        backgroundColor: '#f8fafc',
        fontWeight: '600',
        color: '#1e293b'
    }
};

// Barra de acoes controla toda a logica do select de Status produção e botoes de Etiquetas na TabEmitirEtiquetas.tsx
//⚡ Emitir (Emitir Etiquetas) — Para gerar as etiquetas em lote na API do Melhor Envio.

//🖨️ Imprimir — Para abrir o PDF consolidado de impressão das etiquetas geradas.

//🚀 Enviar — Para mover os pedidos selecionados diretamente para a aba de Enviados.

//⚙️ Mudar Status / Ações... (Menu Suspenso / Select) — O botão/seletor de ações em massa
// para alterar status de produção, marcar como pago/não pago ou excluir.