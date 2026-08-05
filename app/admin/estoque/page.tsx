// app/admin/estoque/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { FiPackage, FiAlertTriangle, FiXCircle, FiSearch, FiCheck, FiDollarSign } from "react-icons/fi";

export default function PaginaEstoque() {
    const [uid, setUid] = useState<string | null>(null);
    const [produtos, setProdutos] = useState<any[]>([]);
    const [busca, setBusca] = useState("");
    const [filtroRapido, setFiltroRapido] = useState<"todos" | "baixo" | "zerado">("todos");
    const [loadingId, setLoadingId] = useState<string | null>(null);

    // Estados para edição rápida inline
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [valorEditado, setValorEditado] = useState("");

    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (user) => {
            if (user) setUid(user.uid);
            else setUid(null);
        });
        return () => unsubAuth();
    }, []);

    useEffect(() => {
        if (!uid) return;
        const qProdutos = query(collection(db, "lojistas", uid, "produtos"), orderBy("createdAt", "desc"));
        const unsubProdutos = onSnapshot(qProdutos, (snap) => {
            setProdutos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsubProdutos();
    }, [uid]);

    // Achatando os produtos e variações para facilitar o controle de estoque item a item
    const itensEstoque = useMemo(() => {
        const lista: any[] = [];
        produtos.forEach(p => {
            const estoqueMinProduto = Number(p.estoqueMinimo ?? 3);
            if (p.variacoes && Array.isArray(p.variacoes) && p.variacoes.length > 0) {
                p.variacoes.forEach((v: any, index: number) => {
                    const qtd = Number(v.estoque !== "" && v.estoque !== undefined ? v.estoque : 0);
                    const precoItem = Number(v.preco || p.precoBasico || 0);
                    lista.push({
                        uniqueKey: `${p.id}_var_${index}`,
                        produtoId: p.id,
                        isVariacao: true,
                        nomeProduto: p.nome,
                        nomeVariacao: v.nome,
                        sku: v.sku || p.sku || "SEM-SKU",
                        preco: precoItem,
                        estoque: qtd,
                        estoqueMinimo: estoqueMinProduto,
                        valorTotal: qtd * precoItem,
                        foto: v.foto || p.capa || ""
                    });
                });
            } else {
                const qtd = Number(p.estoque !== "" && p.estoque !== undefined ? p.estoque : 0);
                const precoItem = Number(p.precoBasico || 0);
                lista.push({
                    uniqueKey: `${p.id}_simples`,
                    produtoId: p.id,
                    isVariacao: false,
                    nomeProduto: p.nome,
                    nomeVariacao: "Produto Único",
                    sku: p.sku || "SEM-SKU",
                    preco: precoItem,
                    estoque: qtd,
                    estoqueMinimo: estoqueMinProduto,
                    valorTotal: qtd * precoItem,
                    foto: p.capa || ""
                });
            }
        });
        return lista;
    }, [produtos]);

    // Métricas para os Cards do Topo
    const metricas = useMemo(() => {
        let totalItens = itensEstoque.length;
        let estoqueBaixo = 0;
        let zerados = 0;
        let valorTotalEstoque = 0;

        itensEstoque.forEach(item => {
            const minDesejado = Number(item.estoqueMinimo ?? 3);
            if (item.estoque === 0) zerados++;
            else if (item.estoque <= minDesejado) estoqueBaixo++;
            valorTotalEstoque += Number(item.valorTotal || 0);
        });

        return { totalItens, estoqueBaixo, zerados, valorTotalEstoque };
    }, [itensEstoque]);

    // Filtragem por busca e abas rápidas
    const itensFiltrados = useMemo(() => {
        return itensEstoque.filter(item => {
            const matchBusca = 
                item.nomeProduto.toLowerCase().includes(busca.toLowerCase()) ||
                item.nomeVariacao.toLowerCase().includes(busca.toLowerCase()) ||
                item.sku.toLowerCase().includes(busca.toLowerCase());

            if (!matchBusca) return false;

            const minDesejado = Number(item.estoqueMinimo ?? 3);
            if (filtroRapido === "baixo") return item.estoque > 0 && item.estoque <= minDesejado;
            if (filtroRapido === "zerado") return item.estoque === 0;

            return true;
        });
    }, [itensEstoque, busca, filtroRapido]);

    // Função para salvar a alteração rápida de estoque
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
                // Atualiza a variação específica dentro do array
                const novasVariacoes = produtoOriginal.variacoes.map((v: any) => {
                    if (v.nome === item.nomeVariacao) {
                        return { ...v, estoque: String(novoValor) };
                    }
                    return v;
                });
                await updateDoc(prodRef, { variacoes: novasVariacoes });
            } else {
                // Atualiza o estoque do produto simples
                await updateDoc(prodRef, { estoque: String(novoValor) });
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
        <div style={{ padding: '15px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
            
            <style jsx>{`
                @media (max-width: 768px) {
                    .desktop-table {
                        display: none !important;
                    }
                    .mobile-card-list {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 12px !important;
                    }
                }
                @media (min-width: 769px) {
                    .desktop-table {
                        display: block !important;
                    }
                    .mobile-card-list {
                        display: none !important;
                    }
                }
            `}</style>

            {/* TÍTULO DA PÁGINA */}
            <div style={{ marginBottom: '15px' }}>
                <h2 style={{ fontSize: '18px', color: '#1e293b', margin: 0, fontWeight: 800 }}>📦 Controle de Estoque</h2>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>Monitore os níveis de estoque e faça ajustes rápidos em produtos e variações.</p>
            </div>

            {/* CARDS DE VISUALIZAÇÃO NO TOPO */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                
                <div onClick={() => setFiltroRapido("todos")} style={{ ...styles.cardMetrica, borderLeft: '4px solid #3b82f6', cursor: 'pointer', background: filtroRapido === 'todos' ? '#eff6ff' : '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>TOTAL CADASTRADO</span>
                            <h3 style={{ fontSize: '20px', margin: '4px 0 0 0', color: '#1e293b' }}>{metricas.totalItens}</h3>
                        </div>
                        <FiPackage size={24} color="#3b82f6" />
                    </div>
                </div>

                <div onClick={() => setFiltroRapido("baixo")} style={{ ...styles.cardMetrica, borderLeft: '4px solid #f59e0b', cursor: 'pointer', background: filtroRapido === 'baixo' ? '#fef3c7' : '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#d97706' }}>ESTOQUE BAIXO</span>
                            <h3 style={{ fontSize: '20px', margin: '4px 0 0 0', color: '#b45309' }}>{metricas.estoqueBaixo}</h3>
                        </div>
                        <FiAlertTriangle size={24} color="#f59e0b" />
                    </div>
                </div>

                <div onClick={() => setFiltroRapido("zerado")} style={{ ...styles.cardMetrica, borderLeft: '4px solid #ef4444', cursor: 'pointer', background: filtroRapido === 'zerado' ? '#fee2e2' : '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#dc2626' }}>ESGOTADOS (ZERADOS)</span>
                            <h3 style={{ fontSize: '20px', margin: '4px 0 0 0', color: '#991b1b' }}>{metricas.zerados}</h3>
                        </div>
                        <FiXCircle size={24} color="#ef4444" />
                    </div>
                </div>

                <div style={{ ...styles.cardMetrica, borderLeft: '4px solid #10b981', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#059669' }}>VALOR TOTAL EM ESTOQUE</span>
                            <h3 style={{ fontSize: '18px', margin: '4px 0 0 0', color: '#047857' }}>
                                R$ {metricas.valorTotalEstoque.toFixed(2).replace('.', ',')}
                            </h3>
                        </div>
                        <FiDollarSign size={24} color="#10b981" />
                    </div>
                </div>

            </div>

            {/* BARRA DE BUSCA E FILTROS */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <FiSearch color="#64748b" />
                    <input 
                        type="text" 
                        placeholder="Buscar por nome, variação ou SKU..." 
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '6px', width: '100%', justifyContent: 'space-between' }}>
                    <button 
                        onClick={() => setFiltroRapido("todos")}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', border: '1px solid #cbd5e1', background: filtroRapido === 'todos' ? '#334155' : '#fff', color: filtroRapido === 'todos' ? '#fff' : '#475569' }}
                    >
                        Todos
                    </button>
                    <button 
                        onClick={() => setFiltroRapido("baixo")}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', border: '1px solid #cbd5e1', background: filtroRapido === 'baixo' ? '#f59e0b' : '#fff', color: filtroRapido === 'baixo' ? '#fff' : '#475569' }}
                    >
                        Estoque Baixo
                    </button>
                    <button 
                        onClick={() => setFiltroRapido("zerado")}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', border: '1px solid #cbd5e1', background: filtroRapido === 'zerado' ? '#ef4444' : '#fff', color: filtroRapido === 'zerado' ? '#fff' : '#475569' }}
                    >
                        Zerados
                    </button>
                </div>
            </div>

            {/* VERSÃO DESKTOP (TABELA TRADICIONAL) */}
            <div className="desktop-table" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                                <th style={{ padding: '12px 16px' }}>Produto</th>
                                <th style={{ padding: '12px 16px' }}>Estoque Atual</th>
                                <th style={{ padding: '12px 16px' }}>Estoque Míni</th>
                                <th style={{ padding: '12px 16px' }}>Valor Unitário</th>
                                <th style={{ padding: '12px 16px' }}>Valor Total</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itensFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
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
                                        <tr key={item.uniqueKey} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <img 
                                                        src={item.foto || "https://placehold.co/40x40?text=Prod"} 
                                                        alt="" 
                                                        style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #e2e8f0' }} 
                                                    />
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{item.nomeProduto}</span>
                                                        {item.nomeVariacao !== "Produto Único" ? (
                                                            <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', border: '1px solid #cbd5e1', width: 'fit-content', color: '#475569' }}>
                                                                {item.nomeVariacao}
                                                            </span>
                                                        ) : (
                                                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>SKU: {item.sku}</span>
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
                                                        style={{ width: '70px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #3b82f6', outline: 'none', fontWeight: 'bold' }}
                                                    />
                                                ) : (
                                                    <span style={{ 
                                                        fontWeight: 'bold', 
                                                        padding: '3px 10px', 
                                                        borderRadius: '12px', 
                                                        fontSize: '12px',
                                                        backgroundColor: isZerado ? '#fee2e2' : isBaixo ? '#fef3c7' : '#ecfdf5',
                                                        color: isZerado ? '#991b1b' : isBaixo ? '#b45309' : '#065f46'
                                                    }}>
                                                        {item.estoque} un.
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#16a34a' }}>
                                                {estoqueMinDesejado}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontWeight: '600', color: '#059669' }}>
                                                R$ {Number(item.preco).toFixed(2).replace('.', ',')}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#1e293b' }}>
                                                R$ {Number(item.estoque * item.preco).toFixed(2).replace('.', ',')}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                {estaEditando ? (
                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                        <button 
                                                            onClick={() => salvarEstoqueInline(item)}
                                                            disabled={loadingId === item.uniqueKey}
                                                            style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                                                        >
                                                            <FiCheck />
                                                        </button>
                                                        <button 
                                                            onClick={() => setEditandoId(null)}
                                                            style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => {
                                                            setEditandoId(item.uniqueKey);
                                                            setValorEditado(String(item.estoque));
                                                        }}
                                                        style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                                                    >
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

            {/* VERSÃO MOBILE (CARDS INDIVIDUAIS OTIMIZADOS) */}
            <div className="mobile-card-list">
                {itensFiltrados.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        Nenhum item encontrado com os filtros atuais. 🔍
                    </div>
                ) : (
                    itensFiltrados.map((item) => {
                        const estoqueMinDesejado = Number(item.estoqueMinimo ?? 3);
                        const isBaixo = item.estoque > 0 && item.estoque <= estoqueMinDesejado;
                        const isZerado = item.estoque === 0;
                        const estaEditando = editandoId === item.uniqueKey;

                        return (
                            <div key={item.uniqueKey} style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                {/* Topo do Card: Foto, Nome, Variação e Ação rápida */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                        <img 
                                            src={item.foto || "https://placehold.co/40x40?text=Prod"} 
                                            alt="" 
                                            style={{ width: '42px', height: '42px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #e2e8f0', flexShrink: 0 }} 
                                        />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                            <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nomeProduto}</span>
                                            {item.nomeVariacao !== "Produto Único" ? (
                                                <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', border: '1px solid #cbd5e1', width: 'fit-content', color: '#475569' }}>
                                                    {item.nomeVariacao}
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>SKU: {item.sku}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Botão de Ajustar / Salvar no topo direito */}
                                    <div>
                                        {estaEditando ? (
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button 
                                                    onClick={() => salvarEstoqueInline(item)}
                                                    disabled={loadingId === item.uniqueKey}
                                                    style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                                                >
                                                    <FiCheck />
                                                </button>
                                                <button 
                                                    onClick={() => setEditandoId(null)}
                                                    style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => {
                                                    setEditandoId(item.uniqueKey);
                                                    setValorEditado(String(item.estoque));
                                                }}
                                                style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                                            >
                                                ✏️ Ajustar
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <hr style={{ border: '0', borderTop: '1px solid #f1f5f9', margin: '2px 0' }} />

                                {/* Grade de Informações Financeiras e de Estoque */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', textAlign: 'center', background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>ATUAL</span>
                                        {estaEditando ? (
                                            <input 
                                                type="number"
                                                value={valorEditado}
                                                onChange={(e) => setValorEditado(e.target.value)}
                                                autoFocus
                                                style={{ width: '45px', padding: '2px', textAlign: 'center', borderRadius: '4px', border: '1px solid #3b82f6', outline: 'none', fontSize: '12px', fontWeight: 'bold', marginTop: '2px' }}
                                            />
                                        ) : (
                                            <span style={{ 
                                                display: 'inline-block',
                                                fontWeight: 'bold', 
                                                padding: '2px 6px', 
                                                borderRadius: '8px', 
                                                fontSize: '11px',
                                                marginTop: '2px',
                                                backgroundColor: isZerado ? '#fee2e2' : isBaixo ? '#fef3c7' : '#ecfdf5',
                                                color: isZerado ? '#991b1b' : isBaixo ? '#b45309' : '#065f46'
                                            }}>
                                                {item.estoque}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>MÍNIMO</span>
                                        <span style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#16a34a', marginTop: '3px' }}>
                                            {estoqueMinDesejado}
                                        </span>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>UNITÁRIO</span>
                                        <span style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#059669', marginTop: '3px' }}>
                                            R$ {Number(item.preco).toFixed(2).replace('.', ',')}
                                        </span>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>TOTAL</span>
                                        <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#1e293b', marginTop: '3px' }}>
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

const styles: { [key: string]: React.CSSProperties } = {
    cardMetrica: {
        background: '#fff',
        padding: '12px 14px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'transform 0.15s ease'
    }
};