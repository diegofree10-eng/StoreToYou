// app/admin/estoque/_tabGestaoEstoque/tabEmbalagens.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { FiPlus, FiTrash2, FiEdit2, FiCheck, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { useTheme } from "@/context/ThemeContext";
import { ModalCriarEmbalagens } from "../_components/ModalCriarEmbalagens";

export function TabEmbalagens({ uid, buscaExterna, filtroRapidoExterno }: { uid: string, buscaExterna: string, filtroRapidoExterno: string }) {
    const { theme } = useTheme();
    const [embalagens, setEmbalagens] = useState<any[]>([]);
    const [insumosDisponiveis, setInsumosDisponiveis] = useState<any[]>([]);
    const [modalAberto, setModalAberto] = useState(false);
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [embalagemSelecionada, setEmbalagemSelecionada] = useState<any>(null);

    // Estados para controle de expansão de linhas da tabela e cards
    const [linhasExpandidas, setLinhasExpandidas] = useState<Record<string, boolean>>({});

    // Estados para edição inline
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [editandoInlineId, setEditandoInlineId] = useState<string | null>(null);
    const [valorEditado, setValorEditado] = useState("");

    const toggleExpandirLinha = (id: string) => {
        setLinhasExpandidas(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Carregar Embalagens da coleção "embalagem"
    useEffect(() => {
        if (!uid) return;
        const q = query(collection(db, "lojistas", uid, "embalagem"), orderBy("dsNomeEmbalagem", "asc"));
        const unsub = onSnapshot(q, (snap) => {
            setEmbalagens(snap.docs.map(d => {
                const data = d.data();
                const estoqueAtual = Number(data.nrEstoqueAtualEmbalagem ?? data.nrEstoqueAtual ?? data.estoqueAtual ?? 0);
                const custoUnitario = Number(data.vlCustoUnitarioEmbalagem ?? data.vlCustoUnitario ?? data.custoUnitario ?? 0);
                const estoqueMinimo = Number(data.nrEstoqueMinimoEmbalagem ?? data.nrEstoqueMinimo ?? data.estoqueMinimo ?? 10);

                return {
                    id: d.id,
                    ...data,
                    nome: data.dsNomeEmbalagem || data.nome || "",
                    unidade: data.dsUnidadeMedida || data.unidadeMedida || "unidade",
                    tipo: data.dsTipoEmbalagem || "envelope_seguranca",
                    custo: custoUnitario,
                    estoque: estoqueAtual,
                    estoqueMinimo: estoqueMinimo,
                    largura: Number(data.nrLarguraMaxInsumo || 0),
                    comprimento: Number(data.nrComprimentoMaxInsumo || 0),
                    altura: Number(data.nrAlturaMaxInsumo || 0),
                    volume: Number(data.nrVolumeMaxInsumo || 0),
                    composicaoAtiva: data.isComposicaoEmbalagem ?? data.isComposicao ?? true,
                    itensComposicao: data.itensComposicao || [],
                    valorTotal: estoqueAtual * custoUnitario
                };
            }));
        });
        return () => unsub();
    }, [uid]);

    // Carregar Insumos Disponíveis para Composição
    useEffect(() => {
        if (!uid) return;
        const q = query(collection(db, "lojistas", uid, "insumos_composicao"), orderBy("dsNomeInsumo", "asc"));
        const unsub = onSnapshot(q, (snap) => {
            const lista = snap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    nome: data.dsNomeInsumo || data.nome || "Sem Nome",
                    unidade: data.dsUnidadeMedida || data.unidadeMedida || "unidade",
                    custoUnitario: Number(data.vlCustoUnitarioInsumo ?? data.vlCustoUnitario ?? data.custoUnitario ?? 0),
                    isComposicao: data.isComposicaoInsumo ?? data.isComposicao ?? true
                };
            }).filter(i => i.isComposicao);
            setInsumosDisponiveis(lista);
        });
        return () => unsub();
    }, [uid]);

    const abrirEdicao = (emb: any) => {
        setEditandoId(emb.id);
        setEmbalagemSelecionada(emb);
        setModalAberto(true);
    };

    const abrirCriacao = () => {
        setEditandoId(null);
        setEmbalagemSelecionada(null);
        setModalAberto(true);
    };

    const excluirEmbalagem = async (id: string) => {
        if (!uid) return;
        if (!confirm("Tem certeza que deseja excluir esta embalagem?")) return;
        try {
            await deleteDoc(doc(db, "lojistas", uid, "embalagem", id));
        } catch (error: any) {
            alert("Erro ao excluir: " + error.message);
        }
    };

    const salvarEstoqueInline = async (item: any) => {
        if (!uid) return;
        const novoValor = parseInt(valorEditado);
        if (isNaN(novoValor) || novoValor < 0) {
            alert("Informe um valor de estoque válido.");
            return;
        }

        setLoadingId(item.id);
        try {
            await updateDoc(doc(db, "lojistas", uid, "embalagem", item.id), {
                nrEstoqueAtualEmbalagem: Number(novoValor),
                updatedAt: new Date().toISOString()
            });
            setEditandoInlineId(null);
            setValorEditado("");
        } catch (e: any) {
            alert("Erro ao atualizar estoque: " + e.message);
        } finally {
            setLoadingId(null);
        }
    };

    const itensFiltrados = useMemo(() => {
        return embalagens.filter(item => {
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
    }, [embalagens, buscaExterna, filtroRapidoExterno]);

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
                    <FiPlus size={16} /> Nova Embalagem
                </button>
            </div>

            {/* TABELA DESKTOP */}
            <div className="desktop-table" style={{ background: theme.bgCard, borderRadius: '8px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', tableLayout: 'fixed' }}>
                        <thead>
                            <tr style={{ background: theme.bgApp, borderBottom: `1px solid ${theme.border}`, color: theme.textSec }}>
                                <th style={{ padding: '12px 16px', width: '32%' }}>Embalagem / Caixa</th>
                                <th style={{ padding: '12px 16px', width: '14%' }}>Estoque Atual</th>
                                <th style={{ padding: '12px 16px', width: '11%' }}>Estoque Mín</th>
                                <th style={{ padding: '12px 16px', width: '13%' }}>Custo Unitário</th>
                                <th style={{ padding: '12px 16px', width: '13%' }}>Valor Total</th>
                                <th style={{ padding: '12px 16px', width: '17%', textAlign: 'center' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itensFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: theme.textSec }}>
                                        Nenhuma embalagem encontrada com os filtros atuais. 🔍
                                    </td>
                                </tr>
                            ) : (
                                itensFiltrados.map((item) => {
                                    const estoqueMinDesejado = Number(item.estoqueMinimo ?? 10);
                                    const isBaixo = item.estoque > 0 && item.estoque <= estoqueMinDesejado;
                                    const isZerado = item.estoque === 0;
                                    const estaEditandoInline = editandoInlineId === item.id;
                                    const carregandoEste = loadingId === item.id;
                                    const expandido = linhasExpandidas[item.id] || false;

                                    return (
                                        <React.Fragment key={item.id}>
                                            <tr style={{ borderBottom: `1px solid ${theme.border}`, background: expandido ? theme.bgApp : 'transparent' }}>
                                                <td style={{ padding: '12px 16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <button 
                                                            onClick={() => toggleExpandirLinha(item.id)}
                                                            style={{ background: 'transparent', border: 'none', color: theme.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                                                            title={expandido ? "Recolher detalhes" : "Expandir detalhes"}
                                                        >
                                                            {expandido ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                                                        </button>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                                            <span style={{ fontWeight: 'bold', color: theme.textMain, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nome}</span>
                                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                                <span style={{ background: theme.bgApp, padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', border: `1px solid ${theme.border}`, color: theme.textSec, textTransform: 'capitalize' }}>
                                                                    📏 {item.unidade}
                                                                </span>
                                                                <span style={{ background: theme.bgApp, padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', border: `1px solid ${theme.border}`, color: theme.textSec }}>
                                                                    {item.tipo === 'caixa_papelao' ? '📦 Caixa Rígida' : '✉️ Envelope'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    {estaEditandoInline ? (
                                                        <input 
                                                            type="number"
                                                            value={valorEditado}
                                                            onChange={(e) => setValorEditado(e.target.value)}
                                                            disabled={carregandoEste}
                                                            autoFocus
                                                            style={{ width: '70px', padding: '4px 8px', borderRadius: '4px', border: `1px solid ${theme.primary}`, outline: 'none', fontWeight: 'bold', background: theme.inputBg, color: theme.textMain }}
                                                        />
                                                    ) : (
                                                        <span style={{ 
                                                            display: 'inline-block', width: '70px', textAlign: 'center',
                                                            fontWeight: 'bold', padding: '3px 0', borderRadius: '12px', fontSize: '12px',
                                                            backgroundColor: isZerado ? '#fee2e2' : isBaixo ? '#fef3c7' : '#ecfdf5',
                                                            color: isZerado ? '#991b1b' : isBaixo ? '#b45309' : '#065f46'
                                                        }}>
                                                            {item.estoque} {item.unidade === 'metro' ? 'm' : 'un.'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontWeight: 'bold', color: theme.textMain }}>
                                                    {estoqueMinDesejado}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontWeight: '600', color: theme.primary }}>
                                                    R$ {Number(item.custo).toFixed(2).replace('.', ',')}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontWeight: 'bold', color: theme.textMain }}>
                                                    R$ {Number(item.estoque * item.custo).toFixed(2).replace('.', ',')}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    {estaEditandoInline ? (
                                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                            <button onClick={() => salvarEstoqueInline(item)} disabled={carregandoEste} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}><FiCheck /></button>
                                                            <button onClick={() => setEditandoInlineId(null)} disabled={carregandoEste} style={{ background: theme.border, color: theme.textMain, border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>✕</button>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                            <button onClick={() => { setEditandoInlineId(item.id); setValorEditado(String(item.estoque)); }} style={{ background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}`, padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }} title="Ajustar Estoque">
                                                                ✏️ Ajustar
                                                            </button>
                                                            <button onClick={() => abrirEdicao(item)} style={{ background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}`, padding: '5px', borderRadius: '4px', cursor: 'pointer' }} title="Editar Dados">
                                                                <FiEdit2 size={12} />
                                                            </button>
                                                            <button onClick={() => excluirEmbalagem(item.id)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer' }} title="Excluir">
                                                                <FiTrash2 size={12} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>

                                            {/* LINHA EXPANDIDA DE DETALHES DA EMBALAGEM */}
                                            {expandido && (
                                                <tr style={{ background: theme.bgApp, borderBottom: `2px solid ${theme.border}` }}>
                                                    <td colSpan={6} style={{ padding: '16px 24px' }}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                                            
                                                            {/* COLUNA 1: DIMENSÕES E CUBAGEM */}
                                                            <div style={{ background: theme.bgCard, padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                                                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, display: 'block', marginBottom: '8px' }}>
                                                                    📏 DIMENSÕES MÁXIMAS ÚTEIS E CUBAGEM
                                                                </span>
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
                                                                    <div style={{ background: theme.bgApp, padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                                                                        <span style={{ fontSize: '9px', fontWeight: 'bold', color: theme.textSec, display: 'block' }}>LARGURA</span>
                                                                        <strong style={{ fontSize: '12px', color: theme.textMain }}>{item.largura} cm</strong>
                                                                    </div>
                                                                    <div style={{ background: theme.bgApp, padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                                                                        <span style={{ fontSize: '9px', fontWeight: 'bold', color: theme.textSec, display: 'block' }}>COMPRIMENTO</span>
                                                                        <strong style={{ fontSize: '12px', color: theme.textMain }}>{item.comprimento} cm</strong>
                                                                    </div>
                                                                    <div style={{ background: theme.bgApp, padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                                                                        <span style={{ fontSize: '9px', fontWeight: 'bold', color: theme.textSec, display: 'block' }}>ALTURA MÁX</span>
                                                                        <strong style={{ fontSize: '12px', color: theme.textMain }}>{item.altura} cm</strong>
                                                                    </div>
                                                                </div>
                                                                <div style={{ fontSize: '11px', color: theme.textSec, display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span>Volume Total Útil:</span>
                                                                    <strong style={{ color: theme.textMain }}>{item.volume.toLocaleString('pt-BR')} cm³ ({(item.volume / 1000).toFixed(2)} Litros)</strong>
                                                                </div>
                                                            </div>

                                                            {/* COLUNA 2: COMPOSIÇÃO DE INSUMOS */}
                                                            <div style={{ background: theme.bgCard, padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec }}>
                                                                        🔗 INSUMOS DA COMPOSIÇÃO
                                                                    </span>
                                                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.primary }}>
                                                                        Custo Total: R$ {item.custo.toFixed(2).replace('.', ',')}
                                                                    </span>
                                                                </div>
                                                                
                                                                {item.itensComposicao.length === 0 ? (
                                                                    <p style={{ fontSize: '11px', color: theme.textSec, fontStyle: 'italic', margin: '10px 0' }}>Nenhum insumo vinculado a esta embalagem.</p>
                                                                ) : (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '110px', overflowY: 'auto' }}>
                                                                        {item.itensComposicao.map((sub: any, idx: number) => (
                                                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: theme.bgApp, padding: '5px 8px', borderRadius: '4px', fontSize: '11px' }}>
                                                                                <span style={{ color: theme.textMain, fontWeight: '500' }}>
                                                                                    <b>{sub.quantidade}x</b> {sub.nome}
                                                                                </span>
                                                                                <span style={{ color: theme.textSec, fontWeight: 'bold' }}>
                                                                                    R$ {(sub.quantidade * sub.custoUnitario).toFixed(2).replace('.', ',')}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
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

            {/* LISTA MOBILE COM CARDS EXPANSÍVEIS */}
            <div className="mobile-card-list">
                {itensFiltrados.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: theme.textSec, background: theme.bgCard, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                        Nenhuma embalagem encontrada com os filtros atuais. 🔍
                    </div>
                ) : (
                    itensFiltrados.map((item) => {
                        const estoqueMinDesejado = Number(item.estoqueMinimo ?? 10);
                        const isBaixo = item.estoque > 0 && item.estoque <= estoqueMinDesejado;
                        const isZerado = item.estoque === 0;
                        const estaEditandoInline = editandoInlineId === item.id;
                        const carregandoEste = loadingId === item.id;
                        const expandido = linhasExpandidas[item.id] || false;

                        return (
                            <div key={item.id} style={{ background: theme.bgCard, borderRadius: '8px', border: `1px solid ${theme.border}`, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                        <button 
                                            onClick={() => toggleExpandirLinha(item.id)}
                                            style={{ background: 'transparent', border: 'none', color: theme.primary, cursor: 'pointer', padding: 0 }}
                                        >
                                            {expandido ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                                        </button>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                            <span style={{ fontWeight: 'bold', color: theme.textMain, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nome}</span>
                                            <span style={{ background: theme.bgApp, padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', border: `1px solid ${theme.border}`, width: 'fit-content', color: theme.textSec }}>
                                                📏 {item.unidade} | {item.tipo === 'caixa_papelao' ? 'Caixa' : 'Envelope'}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        {estaEditandoInline ? (
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button onClick={() => salvarEstoqueInline(item)} disabled={carregandoEste} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}><FiCheck /></button>
                                                <button onClick={() => setEditandoInlineId(null)} disabled={carregandoEste} style={{ background: theme.border, color: theme.textMain, border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>✕</button>
                                            </div>
                                        ) : (
                                            <>
                                                <button onClick={() => { setEditandoInlineId(item.id); setValorEditado(String(item.estoque)); }} style={{ background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}`, padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                                                    ✏️ Ajustar
                                                </button>
                                                <button onClick={() => abrirEdicao(item)} style={{ background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}`, padding: '5px', borderRadius: '4px', cursor: 'pointer' }} title="Editar">
                                                    <FiEdit2 size={12} />
                                                </button>
                                                <button onClick={() => excluirEmbalagem(item.id)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer' }} title="Excluir">
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
                                        {estaEditandoInline ? (
                                            <input 
                                                type="number"
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
                                                {item.estoque}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: theme.textSec }}>MÍNIMO</span>
                                        <span style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: theme.textMain, marginTop: '3px' }}>
                                            {estoqueMinDesejado}
                                        </span>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: theme.textSec }}>UNITÁRIO</span>
                                        <span style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: theme.primary, marginTop: '3px' }}>
                                            R$ {Number(item.custo).toFixed(2).replace('.', ',')}
                                        </span>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: theme.textSec }}>TOTAL</span>
                                        <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: theme.textMain, marginTop: '3px' }}>
                                            R$ {Number(item.estoque * item.custo).toFixed(2).replace('.', ',')}
                                        </span>
                                    </div>
                                </div>

                                {/* CONTEÚDO EXPANDIDO NO MOBILE */}
                                {expandido && (
                                    <div style={{ background: theme.bgApp, padding: '10px', borderRadius: '6px', border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                                        <div>
                                            <span style={{ fontWeight: 'bold', color: theme.textSec, display: 'block', marginBottom: '4px' }}>📏 Dimensões e Cubagem:</span>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.textMain }}>
                                                <span>L: {item.largura}cm | C: {item.comprimento}cm | A: {item.altura}cm</span>
                                                <strong>{item.volume.toLocaleString('pt-BR')} cm³</strong>
                                            </div>
                                        </div>

                                        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '6px' }}>
                                            <span style={{ fontWeight: 'bold', color: theme.textSec, display: 'block', marginBottom: '4px' }}>🔗 Insumos da Composição:</span>
                                            {item.itensComposicao.length === 0 ? (
                                                <span style={{ fontStyle: 'italic', color: theme.textSec }}>Nenhum insumo vinculado.</span>
                                            ) : (
                                                item.itensComposicao.map((sub: any, i: number) => (
                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                                                        <span>{sub.quantidade}x {sub.nome}</span>
                                                        <strong>R$ {(sub.quantidade * sub.custoUnitario).toFixed(2).replace('.', ',')}</strong>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* MODAL ISOLADO */}
            <ModalCriarEmbalagens 
                uid={uid}
                modalAberto={modalAberto}
                editandoId={editandoId}
                embalagemParaEditar={embalagemSelecionada}
                insumosDisponiveis={insumosDisponiveis}
                onClose={() => setModalAberto(false)}
            />
        </div>
    );
}