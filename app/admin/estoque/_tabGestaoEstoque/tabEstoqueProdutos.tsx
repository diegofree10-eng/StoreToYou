// app/admin/estoque/_tabGestaoEstoque/tabEstoqueProdutos.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { FiCheck } from "react-icons/fi";
import { useTheme } from "@/context/ThemeContext";

export function TabEstoqueProdutos({ uid, buscaExterna, filtroRapidoExterno }: { uid: string, buscaExterna: string, filtroRapidoExterno: string }) {
    const { theme } = useTheme();
    const [produtos, setProdutos] = useState<any[]>([]);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [valorEditado, setValorEditado] = useState("");

    useEffect(() => {
        if (!uid) return;
        const q = query(collection(db, "lojistas", uid, "produtos"), orderBy("nrCreatedAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setProdutos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [uid]);

    const itensEstoque = useMemo(() => {
        const lista: any[] = [];
        produtos.forEach(p => {
            const estoqueMinProduto = Number(p.nrEstoqueMinimoProduto ?? p.nrEstoqueMinimo ?? p.estoqueMinimo ?? 3);
            const nomeProduto = p.dsNomeProduto || p.dsNome || p.nome || "Produto Sem Nome";
            const capaProduto = p.dsCapaProduto || p.dsCapa || (p.dsImagensProduto?.[0]) || (p.dsImagens?.[0]) || "";
            const variacoesArr = p.variacoes || [];

            if (Array.isArray(variacoesArr) && variacoesArr.length > 0) {
                variacoesArr.forEach((v: any, index: number) => {
                    const qtd = Number(v.nrEstoqueProduto !== undefined ? v.nrEstoqueProduto : (v.nrEstoque !== undefined ? v.nrEstoque : 0));
                    const precoItem = Number(v.vlPrecoProduto ?? v.vlPreco ?? p.vlPrecoBasicoProduto ?? p.vlPrecoBasico ?? 0);
                    const nomeVar = v.dsNomeProduto || v.dsModeloProduto || v.dsNome || v.nome || `Variação ${index + 1}`;
                    const skuItem = v.dsSkuProduto || v.dsSku || p.dsSkuProduto || p.dsSku || "SEM-SKU";

                    lista.push({
                        uniqueKey: `${p.id}_var_${index}`,
                        produtoId: p.id,
                        isVariacao: true,
                        nomeProduto,
                        nomeVariacao: nomeVar,
                        sku: skuItem,
                        preco: precoItem,
                        estoque: isNaN(qtd) ? 0 : qtd,
                        estoqueMinimo: estoqueMinProduto,
                        valorTotal: (isNaN(qtd) ? 0 : qtd) * precoItem,
                        foto: v.dsFotoProduto || v.dsFoto || capaProduto
                    });
                });
            } else {
                const qtd = Number(p.nrEstoqueProduto !== undefined ? p.nrEstoqueProduto : (p.nrEstoque !== undefined ? p.nrEstoque : 0));
                const precoItem = Number(p.vlPrecoBasicoProduto ?? p.vlPrecoBasico ?? 0);
                const skuItem = p.dsSkuProduto || p.dsSku || "SEM-SKU";

                lista.push({
                    uniqueKey: `${p.id}_simples`,
                    produtoId: p.id,
                    isVariacao: false,
                    nomeProduto,
                    nomeVariacao: "Produto Único",
                    sku: skuItem,
                    preco: precoItem,
                    estoque: isNaN(qtd) ? 0 : qtd,
                    estoqueMinimo: estoqueMinProduto,
                    valorTotal: (isNaN(qtd) ? 0 : qtd) * precoItem,
                    foto: capaProduto
                });
            }
        });
        return lista;
    }, [produtos]);

    const itensFiltrados = useMemo(() => {
        return itensEstoque.filter(item => {
            const nomeP = String(item.nomeProduto || "").toLowerCase();
            const nomeV = String(item.nomeVariacao || "").toLowerCase();
            const skuP = String(item.sku || "").toLowerCase();
            const termoBusca = String(buscaExterna || "").toLowerCase();

            const matchBusca = nomeP.includes(termoBusca) || nomeV.includes(termoBusca) || skuP.includes(termoBusca);
            if (!matchBusca) return false;

            const minDesejado = Number(item.estoqueMinimo ?? 3);
            if (filtroRapidoExterno === "baixo") return item.estoque > 0 && item.estoque <= minDesejado;
            if (filtroRapidoExterno === "zerado") return item.estoque === 0;

            return true;
        });
    }, [itensEstoque, buscaExterna, filtroRapidoExterno]);

    const salvarEstoqueInline = async (item: any) => {
        if (!uid) return;
        const novoValor = parseInt(valorEditado);
        if (isNaN(novoValor) || novoValor < 0) {
            alert("Informe um valor de estoque válido.");
            return;
        }

        setLoadingId(item.uniqueKey);
        try {
            const prodRef = doc(db, "lojistas", uid, "produtos", item.produtoId);
            const produtoOriginal = produtos.find(p => p.id === item.produtoId);

            if (!produtoOriginal) return;

            if (item.isVariacao) {
                const variacoesAtuais = produtoOriginal.variacoes || [];
                const novasVariacoes = variacoesAtuais.map((v: any) => {
                    const nomeVarBanco = v.dsNomeProduto || v.dsModeloProduto || v.dsNome || v.nome;
                    if (nomeVarBanco === item.nomeVariacao) {
                        return { 
                            ...v, 
                            nrEstoqueProduto: Number(novoValor),
                            nrEstoque: Number(novoValor) 
                        };
                    }
                    return v;
                });
                await updateDoc(prodRef, { variacoes: novasVariacoes });
            } else {
                await updateDoc(prodRef, { 
                    nrEstoqueProduto: Number(novoValor),
                    nrEstoque: Number(novoValor) 
                });
            }

            setEditandoId(null);
            setValorEditado("");
        } catch (e: any) {
            alert("Erro ao atualizar estoque: " + e.message);
        } finally {
            setLoadingId(null);
        }
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

            {/* TABELA DESKTOP COM LARGURAS FIXAS */}
            <div className="desktop-table" style={{ background: theme.bgCard, borderRadius: '8px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', tableLayout: 'fixed' }}>
                        <thead>
                            <tr style={{ background: theme.bgApp, borderBottom: `1px solid ${theme.border}`, color: theme.textSec }}>
                                <th style={{ padding: '12px 16px', width: '35%' }}>Produto</th>
                                <th style={{ padding: '12px 16px', width: '15%' }}>Estoque Atual</th>
                                <th style={{ padding: '12px 16px', width: '12%' }}>Estoque Míni</th>
                                <th style={{ padding: '12px 16px', width: '14%' }}>Valor Unitário</th>
                                <th style={{ padding: '12px 16px', width: '14%' }}>Valor Total</th>
                                <th style={{ padding: '12px 16px', width: '10%', textAlign: 'center' }}>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itensFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: theme.textSec }}>
                                        Nenhum item encontrado com os filtros atuais. 🔍
                                    </td>
                                </tr>
                            ) : (
                                itensFiltrados.map((item) => {
                                    const estoqueMinDesejado = Number(item.estoqueMinimo ?? 3);
                                    const isBaixo = item.estoque > 0 && item.estoque <= estoqueMinDesejado;
                                    const isZerado = item.estoque === 0;
                                    const estaEditando = editandoId === item.uniqueKey;

                                    return (
                                        <tr key={item.uniqueKey} style={{ borderBottom: `1px solid ${theme.border}` }}>
                                            <td style={{ padding: '12px 16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <img src={item.foto || "https://placehold.co/40x40?text=Prod"} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: `1px solid ${theme.border}`, flexShrink: 0 }} />
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                                        <span style={{ fontWeight: 'bold', color: theme.textMain, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nomeProduto}</span>
                                                        {item.nomeVariacao !== "Produto Único" ? (
                                                            <span style={{ background: theme.bgApp, padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', border: `1px solid ${theme.border}`, width: 'fit-content', color: theme.textSec }}>
                                                                {item.nomeVariacao}
                                                            </span>
                                                        ) : (
                                                            <span style={{ fontSize: '11px', color: theme.textSec }}>SKU: {item.sku}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                {estaEditando ? (
                                                    <input 
                                                        type="number"
                                                        value={valorEditado}
                                                        onChange={(e) => setValorEditado(e.target.value)}
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
                                                        {item.estoque} un.
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontWeight: 'bold', color: theme.textMain }}>
                                                {estoqueMinDesejado}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontWeight: '600', color: theme.primary }}>
                                                R$ {Number(item.preco).toFixed(2).replace('.', ',')}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontWeight: 'bold', color: theme.textMain }}>
                                                R$ {Number(item.estoque * item.preco).toFixed(2).replace('.', ',')}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                {estaEditando ? (
                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                        <button onClick={() => salvarEstoqueInline(item)} disabled={loadingId === item.uniqueKey} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}><FiCheck /></button>
                                                        <button onClick={() => setEditandoId(null)} style={{ background: theme.border, color: theme.textMain, border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>✕</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => { setEditandoId(item.uniqueKey); setValorEditado(String(item.estoque)); }} style={{ background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}`, padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                                                        ✏️ Ajustar
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
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
                        Nenhum item encontrado com os filtros atuais. 🔍
                    </div>
                ) : (
                    itensFiltrados.map((item) => {
                        const estoqueMinDesejado = Number(item.estoqueMinimo ?? 3);
                        const isBaixo = item.estoque > 0 && item.estoque <= estoqueMinDesejado;
                        const isZerado = item.estoque === 0;
                        const estaEditando = editandoId === item.uniqueKey;

                        return (
                            <div key={item.uniqueKey} style={{ background: theme.bgCard, borderRadius: '8px', border: `1px solid ${theme.border}`, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                        <img src={item.foto || "https://placehold.co/40x40?text=Prod"} alt="" style={{ width: '42px', height: '42px', borderRadius: '6px', objectFit: 'cover', border: `1px solid ${theme.border}`, flexShrink: 0 }} />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                            <span style={{ fontWeight: 'bold', color: theme.textMain, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nomeProduto}</span>
                                            {item.nomeVariacao !== "Produto Único" ? (
                                                <span style={{ background: theme.bgApp, padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', border: `1px solid ${theme.border}`, width: 'fit-content', color: theme.textSec }}>
                                                    {item.nomeVariacao}
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '11px', color: theme.textSec }}>SKU: {item.sku}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        {estaEditando ? (
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button onClick={() => salvarEstoqueInline(item)} disabled={loadingId === item.uniqueKey} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}><FiCheck /></button>
                                                <button onClick={() => setEditandoId(null)} style={{ background: theme.border, color: theme.textMain, border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>✕</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => { setEditandoId(item.uniqueKey); setValorEditado(String(item.estoque)); }} style={{ background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}`, padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                                                ✏️ Ajustar
                                            </button>
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
                                                value={valorEditado}
                                                onChange={(e) => setValorEditado(e.target.value)}
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
                                            R$ {Number(item.preco).toFixed(2).replace('.', ',')}
                                        </span>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: theme.textSec }}>TOTAL</span>
                                        <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: theme.textMain, marginTop: '3px' }}>
                                            R$ {Number(item.estoque * item.preco).toFixed(2).replace('.', ',')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}