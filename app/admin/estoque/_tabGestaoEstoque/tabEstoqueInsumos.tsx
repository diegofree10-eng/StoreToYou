// app/admin/estoque/_tabGestaoEstoque/tabEstoqueInsumos.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { FiCheck, FiPlus, FiEdit2, FiTrash2, FiChevronDown, FiChevronUp, FiPackage } from "react-icons/fi";
import { useTheme } from "@/context/ThemeContext";
import { ModalCriarInsumos } from "../_components/ModalCriarInsumos";

export function TabEstoqueInsumos({ uid, buscaExterna, filtroRapidoExterno }: { uid: string, buscaExterna: string, filtroRapidoExterno: string }) {
    const { theme } = useTheme();
    const [insumos, setInsumos] = useState<any[]>([]);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [valorEditado, setValorEditado] = useState("");

    // Estado para controle das linhas expandidas na tabela
    const [insumosExpandidos, setInsumosExpandidos] = useState<{ [key: string]: boolean }>({});

    // Estados para controle do Modal de Insumos
    const [modalAberto, setModalAberto] = useState(false);
    const [insumoSelecionado, setInsumoSelecionado] = useState<any>(null);

    useEffect(() => {
        if (!uid) return;
        const q = query(collection(db, "lojistas", uid, "insumos_composicao"), orderBy("dsNomeInsumo", "asc"));
        const unsub = onSnapshot(q, (snap) => {
            setInsumos(snap.docs.map(d => {
                const data = d.data();

                // Tratamento seguro para evitar NaN caso o campo venha vazio, string vazia ou undefined
                const rawEstoque = data.nrEstoqueAtualInsumo ?? data.nrEstoqueAtual ?? data.estoqueAtual ?? 0;
                const estoqueAtual = !isNaN(Number(rawEstoque)) ? Number(rawEstoque) : 0;

                const rawCusto = data.vlCustoUnitarioInsumo ?? data.vlCustoUnitario ?? data.custoUnitario ?? 0;
                const custoUnitario = !isNaN(Number(rawCusto)) ? Number(rawCusto) : 0;

                const rawMinimo = data.nrEstoqueMinimoInsumo ?? data.nrEstoqueMinimo ?? data.estoqueMinimo ?? 10;
                const estoqueMinimo = !isNaN(Number(rawMinimo)) ? Number(rawMinimo) : 10;

                return {
                    id: d.id,
                    ...data,
                    nome: data.dsNomeInsumo || data.nome || "Sem Nome",
                    unidade: data.dsUnidadeConsumoInsumo || data.dsUnidadeMedida || data.unidadeMedida || "un",
                    custo: custoUnitario,
                    estoque: estoqueAtual,
                    estoqueMinimo: estoqueMinimo,
                    isComposicao: data.isComposicaoInsumo ?? data.isComposicao ?? data.usaNaComposicao ?? true,
                    valorTotal: estoqueAtual * custoUnitario,
                };
            }));
        });
        return () => unsub();
    }, [uid]);

    const alternarExpandirInsumo = (insumoId: string) => {
        setInsumosExpandidos(prev => ({
            ...prev,
            [insumoId]: !prev[insumoId]
        }));
    };

    const itensFiltrados = useMemo(() => {
        return insumos.filter(item => {
            const nomeP = String(item.nome || "").toLowerCase();
            const unidadeP = String(item.unidade || "").toLowerCase();
            const termoBusca = String(buscaExterna || "").toLowerCase();

            const matchBusca = nomeP.includes(termoBusca) || unidadeP.includes(termoBusca);
            if (!matchBusca) return false;

            const minDesejado = Number(item.estoqueMinimo ?? 10);
            if (filtroRapidoExterno === "baixo") return item.estoque > 0 && item.estoque <= minDesejado;
            if (filtroRapidoExterno === "zerado") return item.estoque === 0;

            return true;
        });
    }, [insumos, buscaExterna, filtroRapidoExterno]);

    const salvarEstoqueInline = async (item: any) => {
        if (!uid) return;

        // 1. Substitui vírgula por ponto para evitar erros de digitação brasileiros
        const valorTratado = String(valorEditado).trim().replace(",", ".");
        const novoValor = parseFloat(valorTratado);

        // 2. Proteção contra valores vazios, letras ou símbolos inválidos
        if (isNaN(novoValor)) {
            alert("Por favor, digite um número válido para o estoque.");
            return;
        }

        // 3. Proteção contra estoque negativo (opcional, remova se permitir negativo)
        if (novoValor < 0) {
            alert("O estoque não pode ficar com valor negativo.");
            return;
        }

        // 4. Alerta de confirmação se a mudança for muito drástica (ex: alteração brusca)
        // (Opcional, mas ajuda a evitar que o lojista digite "1000" em vez de "10" sem querer)

        setLoadingId(item.id);
        try {
            await updateDoc(doc(db, "lojistas", uid, "insumos_composicao", item.id), {
                nrEstoqueAtualInsumo: Number(novoValor),
                updatedAt: new Date().toISOString()
            });
            setEditandoId(null);
            setValorEditado("");
        } catch (e: any) {
            alert("Erro ao atualizar estoque: " + e.message);
        } finally {
            setLoadingId(null);
        }
    };

    const excluirInsumo = async (id: string) => {
        if (!uid) return;
        if (!confirm("Tem certeza que deseja excluir este insumo?")) return;
        try {
            await deleteDoc(doc(db, "lojistas", uid, "insumos_composicao", id));
        } catch (error: any) {
            alert("Erro ao excluir: " + error.message);
        }
    };

    const abrirCriacao = () => {
        setEditandoId(null);
        setInsumoSelecionado(null);
        setModalAberto(true);
    };

    const abrirEdicaoModal = (item: any) => {
        setInsumoSelecionado(item);
        setModalAberto(true);
    };

    return (
        <div style={{ padding: '0px', fontFamily: 'system-ui, sans-serif', backgroundColor: theme.bgApp, color: theme.textMain, minHeight: '100vh', boxSizing: 'border-box' }}>
            <style jsx>{`
                @media (max-width: 768px) {
                    .desktop-table { display: none !important; }
                    .mobile-card-list { display: flex !important; flex-direction: column !important; gap: 12px !important; }
                }
                @media (min-width: 769px) {
                    .desktop-table { display: block !important; }
                    .mobile-card-list { display: none !important; }
                }
            `}</style>

            {/* BOTÃO DE ADICIONAR NO TOPO DA ABA */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                <button
                    onClick={abrirCriacao}
                    style={{ backgroundColor: theme.primary, color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    <FiPlus size={16} /> Novo Insumo
                </button>
            </div>

            {/* TABELA DESKTOP COM LARGURAS FIXAS E LINHAS EXPANSÍVEIS */}
            <div className="desktop-table" style={{ background: theme.bgCard, borderRadius: '8px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', tableLayout: 'fixed' }}>
                        <thead>
                            <tr style={{ background: theme.bgApp, borderBottom: `1px solid ${theme.border}`, color: theme.textSec }}>
                                <th style={{ padding: '12px 16px', width: '40px' }}></th>
                                <th style={{ padding: '12px 16px', width: '28%' }}>Insumo / Material</th>
                                <th style={{ padding: '12px 16px', width: '15%' }}>Estoque Atual</th>
                                <th style={{ padding: '12px 16px', width: '12%' }}>Estoque Mín</th>
                                <th style={{ padding: '12px 16px', width: '14%' }}>Custo Unitário</th>
                                <th style={{ padding: '12px 16px', width: '14%' }}>Valor Total</th>
                                <th style={{ padding: '12px 16px', width: '15%', textAlign: 'center' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itensFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: theme.textSec }}>
                                        Nenhum insumo encontrado com os filtros atuais. 🔍
                                    </td>
                                </tr>
                            ) : (
                                itensFiltrados.map((item) => {
                                    const estoqueMinDesejado = Number(item.estoqueMinimo ?? 10);
                                    const isBaixo = item.estoque > 0 && item.estoque <= estoqueMinDesejado;
                                    const isZerado = item.estoque === 0;
                                    const estaEditando = editandoId === item.id;
                                    const carregandoEste = loadingId === item.id;
                                    const estaExpandido = !!insumosExpandidos[item.id];

                                    return (
                                        <React.Fragment key={item.id}>
                                            <tr style={{ borderBottom: `1px solid ${theme.border}`, background: estaExpandido ? theme.bgCard : 'transparent', transition: 'background 0.2s' }}>
                                                <td
                                                    onClick={() => alternarExpandirInsumo(item.id)}
                                                    style={{ padding: '12px 16px', textAlign: 'center', color: theme.primary, cursor: 'pointer' }}
                                                >
                                                    {estaExpandido ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                                                </td>
                                                <td
                                                    onClick={() => alternarExpandirInsumo(item.id)}
                                                    style={{ padding: '12px 16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                                                >
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span style={{ fontWeight: 'bold', color: theme.textMain, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nome}</span>
                                                        <span style={{ background: theme.bgApp, padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', border: `1px solid ${theme.border}`, width: 'fit-content', color: theme.textSec, textTransform: 'uppercase' }}>
                                                            📏 {item.unidade} {item.isComposicao ? "| 🔗 Composição Ativa" : ""}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    {estaEditando ? (
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            value={valorEditado}
                                                            onChange={(e) => setValorEditado(e.target.value)}
                                                            disabled={carregandoEste}
                                                            autoFocus
                                                            style={{ width: '70px', padding: '4px 8px', borderRadius: '4px', border: `1px solid ${theme.primary}`, outline: 'none', fontWeight: 'bold', background: theme.inputBg, color: theme.textMain }}
                                                        />
                                                    ) : (
                                                        <span style={{
                                                            display: 'inline-block', minWidth: '70px', textAlign: 'center',
                                                            fontWeight: 'bold', padding: '3px 6px', borderRadius: '12px', fontSize: '12px',
                                                            backgroundColor: isZerado ? '#fee2e2' : isBaixo ? '#fef3c7' : '#ecfdf5',
                                                            color: isZerado ? '#991b1b' : isBaixo ? '#b45309' : '#065f46'
                                                        }}>
                                                            {item.estoque} {item.unidade}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontWeight: 'bold', color: theme.textMain }}>
                                                    {estoqueMinDesejado} {item.unidade}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontWeight: '600', color: theme.primary }}>
                                                    R$ {Number(item.custo).toFixed(4).replace('.', ',')} / {item.unidade}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontWeight: 'bold', color: theme.textMain }}>
                                                    R$ {Number(item.estoque * item.custo).toFixed(2).replace('.', ',')}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    {estaEditando ? (
                                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                            <button onClick={() => salvarEstoqueInline(item)} disabled={carregandoEste} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}><FiCheck /></button>
                                                            <button onClick={() => setEditandoId(null)} disabled={carregandoEste} style={{ background: theme.border, color: theme.textMain, border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>✕</button>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                            <button onClick={() => { setEditandoId(item.id); setValorEditado(String(item.estoque)); }} style={{ background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}`, padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }} title="Ajustar Estoque">
                                                                ✏️ Ajustar
                                                            </button>
                                                            <button onClick={() => abrirEdicaoModal(item)} style={{ background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}`, padding: '5px', borderRadius: '4px', cursor: 'pointer' }} title="Editar Insumo">
                                                                <FiEdit2 size={12} />
                                                            </button>
                                                            <button onClick={() => excluirInsumo(item.id)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer' }} title="Excluir">
                                                                <FiTrash2 size={12} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>

                                            {/* Linha Expandida com os Detalhes Completos */}
                                            {estaExpandido && (
                                                <tr style={{ background: theme.bgCard, borderBottom: `1px solid ${theme.border}` }}>
                                                    <td colSpan={7} style={{ padding: '16px 24px' }}>
                                                        <div style={{ background: theme.bgApp, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                            <h4 style={{ fontSize: '13px', margin: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', color: theme.primary }}>
                                                                <FiPackage size={14} /> Detalhes Completos do Insumo
                                                            </h4>

                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', fontSize: '12px' }}>
                                                                <div>
                                                                    <span style={{ color: theme.textSec, display: 'block' }}>Nome do Insumo:</span>
                                                                    <strong style={{ color: theme.textMain }}>{item.nome}</strong>
                                                                </div>
                                                                <div>
                                                                    <span style={{ color: theme.textSec, display: 'block' }}>Marca:</span>
                                                                    <strong style={{ color: theme.textMain }}>{item.dsMarcaInsumo || 'Não informada'}</strong>
                                                                </div>
                                                                <div>
                                                                    <span style={{ color: theme.textSec, display: 'block' }}>Fabricante:</span>
                                                                    <strong style={{ color: theme.textMain }}>{item.dsFabricanteInsumo || 'Não informado'}</strong>
                                                                </div>
                                                                <div>
                                                                    <span style={{ color: theme.textSec, display: 'block' }}>Unidade de Consumo:</span>
                                                                    <strong style={{ color: theme.textMain }}>{item.unidade}</strong>
                                                                </div>
                                                                <div>
                                                                    <span style={{ color: theme.textSec, display: 'block' }}>Estoque Mínimo (Alerta):</span>
                                                                    <strong style={{ color: theme.textMain }}>{estoqueMinDesejado} {item.unidade}</strong>
                                                                </div>
                                                                <div>
                                                                    <span style={{ color: theme.textSec, display: 'block' }}>Composição Automática:</span>
                                                                    <strong style={{ color: item.isComposicao !== false ? '#10b981' : '#ef4444' }}>
                                                                        {item.isComposicao !== false ? 'Habilitado (Baixa na Venda)' : 'Desabilitado'}
                                                                    </strong>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* LISTA MOBILE COM COLUNAS DE TAMANHO FIXO */}
            <div className="mobile-card-list">
                {itensFiltrados.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: theme.textSec, background: theme.bgCard, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                        Nenhum insumo encontrado com os filtros atuais. 🔍
                    </div>
                ) : (
                    itensFiltrados.map((item) => {
                        const estoqueMinDesejado = Number(item.estoqueMinimo ?? 10);
                        const isBaixo = item.estoque > 0 && item.estoque <= estoqueMinDesejado;
                        const isZerado = item.estoque === 0;
                        const estaEditando = editandoId === item.id;
                        const carregandoEste = loadingId === item.id;

                        return (
                            <div key={item.id} style={{ background: theme.bgCard, borderRadius: '8px', border: `1px solid ${theme.border}`, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                            <span style={{ fontWeight: 'bold', color: theme.textMain, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nome}</span>
                                            <span style={{ background: theme.bgApp, padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', border: `1px solid ${theme.border}`, width: 'fit-content', color: theme.textSec, textTransform: 'uppercase' }}>
                                                📏 {item.unidade} {item.dsMarcaInsumo ? `| Marca: ${item.dsMarcaInsumo}` : ""}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        {estaEditando ? (
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button onClick={() => salvarEstoqueInline(item)} disabled={carregandoEste} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}><FiCheck /></button>
                                                <button onClick={() => setEditandoId(null)} disabled={carregandoEste} style={{ background: theme.border, color: theme.textMain, border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>✕</button>
                                            </div>
                                        ) : (
                                            <>
                                                <button onClick={() => { setEditandoId(item.id); setValorEditado(String(item.estoque)); }} style={{ background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}`, padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                                                    ✏️ Ajustar
                                                </button>
                                                <button onClick={() => abrirEdicaoModal(item)} style={{ background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}`, padding: '5px', borderRadius: '4px', cursor: 'pointer' }} title="Editar">
                                                    <FiEdit2 size={12} />
                                                </button>
                                                <button onClick={() => excluirInsumo(item.id)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer' }} title="Excluir">
                                                    <FiTrash2 size={12} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <hr style={{ border: '0', borderTop: `1px solid ${theme.border}`, margin: '2px 0' }} />

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', textAlign: 'center', background: theme.bgApp, padding: '8px', borderRadius: '6px' }}>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: theme.textSec }}>ATUAL</span>
                                        {estaEditando ? (
                                            <input
                                                type="number"
                                                step="any"
                                                value={valorEditado}
                                                onChange={(e) => setValorEditado(e.target.value)}
                                                disabled={carregandoEste}
                                                autoFocus
                                                style={{ width: '45px', padding: '2px', textAlign: 'center', borderRadius: '4px', border: `1px solid ${theme.primary}`, outline: 'none', fontSize: '12px', fontWeight: 'bold', marginTop: '2px', background: theme.inputBg, color: theme.textMain }}
                                            />
                                        ) : (
                                            <span style={{
                                                display: 'inline-block', fontWeight: 'bold', padding: '2px 6px', borderRadius: '8px', fontSize: '11px', marginTop: '2px',
                                                backgroundColor: isZerado ? '#fee2e2' : isBaixo ? '#fef3c7' : '#ecfdf5',
                                                color: isZerado ? '#991b1b' : isBaixo ? '#b45309' : '#065f46'
                                            }}>
                                                {item.estoque} {item.unidade}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: theme.textSec }}>MÍNIMO</span>
                                        <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: theme.textMain, marginTop: '3px' }}>
                                            {estoqueMinDesejado} {item.unidade}
                                        </span>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: theme.textSec }}>UNITÁRIO</span>
                                        <span style={{ display: 'block', fontSize: '10px', fontWeight: '600', color: theme.primary, marginTop: '3px' }}>
                                            R$ {Number(item.custo).toFixed(2).replace('.', ',')}
                                        </span>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: theme.textSec }}>TOTAL</span>
                                        <span style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: theme.textMain, marginTop: '3px' }}>
                                            R$ {Number(item.estoque * item.custo).toFixed(2).replace('.', ',')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* MODAL CRIAR/EDITAR INSUMOS */}
            <ModalCriarInsumos
                uid={uid}
                modalAberto={modalAberto}
                editandoId={insumoSelecionado?.id || null}
                insumoParaEditar={insumoSelecionado}
                onClose={() => {
                    setModalAberto(false);
                    setInsumoSelecionado(null);
                }}
            />
        </div>
    );
}