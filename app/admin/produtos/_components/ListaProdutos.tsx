// app/admin/produtos/_components/ListaProdutos.tsx
"use client";

import React from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { FiDownload } from "react-icons/fi";
import { styles } from "../styles"; // Ajuste o caminho do import de estilos se necessário

interface ListaProdutosProps {
    produtos: any[];
    produtosFiltrados: any[];
    busca: string;
    setBusca: (v: string) => void;
    filtroCategoria: string;
    setFiltroCategoria: (v: string) => void;
    filtroStatus: string;
    setFiltroStatus: (v: string) => void;
    modoMassa: boolean;
    setModoMassa: (v: boolean) => void;
    selecionados: string[];
    setSelecionados: React.Dispatch<React.SetStateAction<string[]>>;
    listaCategorias: any[];
    uid: string | null;
    setListaParaImprimir: (v: any[]) => void;
    onEditar: (p: any) => void;
}

export default function ListaProdutos({
    produtos,
    produtosFiltrados,
    busca, setBusca,
    filtroCategoria, setFiltroCategoria,
    filtroStatus, setFiltroStatus,
    modoMassa, setModoMassa,
    selecionados, setSelecionados,
    listaCategorias,
    uid,
    setListaParaImprimir,
    onEditar
}: ListaProdutosProps) {

    const calcularLucro = (venda: string, custo: string) => {
        const v = parseFloat(venda);
        const c = parseFloat(custo);
        if (!v || !c || c === 0) return null;
        return (((v - c) / c) * 100).toFixed(0);
    };

    const exportarProdutosCSV = () => {
        if (produtosFiltrados.length === 0) {
            alert("Não há produtos para exportar.");
            return;
        }
        const cabecalho = ["SKU", "ID Produto", "Nome", "Variacao/Grade", "Categoria", "Preco Venda", "Custo", "Status", "Peso(kg)", "Medidas", "Personalizavel"];
        const linhas: any[] = [];
        produtosFiltrados.forEach(p => {
            const sku = p.sku || "SEM-SKU";
            if (p.temVariacoes && p.variacoes && p.variacoes.length > 0) {
                p.variacoes.forEach((v: any) => {
                    linhas.push([sku, p.id, `"${p.nome?.replace(/"/g, '""')}"`, `"${v.nome?.replace(/"/g, '""')}"`, `"${p.categoria || ""}"`, v.preco || p.precoBasico, v.custo || p.custoUnitario || "0.00", p.ativo ? "Visivel" : "Oculto", p.peso || "0", `${p.comprimento || 0}x${p.largura || 0}x${p.altura || 0}`, p.requisitos ? "Sim" : "Nao"]);
                });
            } else {
                linhas.push([sku, p.id, `"${p.nome?.replace(/"/g, '""')}"`, "Unico", `"${p.categoria || ""}"`, p.precoBasico, p.custoUnitario || "0.00", p.ativo ? "Visivel" : "Oculto", p.peso || "0", `${p.comprimento || 0}x${p.largura || 0}x${p.altura || 0}`, p.requisitos ? "Sim" : "Nao"]);
            }
        });
        const csvContent = "\ufeff" + [cabecalho.join(";"), ...linhas.map(l => l.join(";"))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `relatorio_produtos_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
        link.click();
    };

    return (
        <div>

            <div style={styles.topHeader}>
                <div style={styles.filterRow}>
                    <input
                        style={styles.searchBar}
                        placeholder="🔍 Buscar por nome..."
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                    />
                    <select
                        style={styles.selectTop}
                        value={filtroCategoria}
                        onChange={e => setFiltroCategoria(e.target.value)}
                    >
                        <option value="Todos">Categorias</option>
                        {listaCategorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                    </select>
                    <select
                        style={styles.selectStatus}
                        value={filtroStatus}
                        onChange={e => setFiltroStatus(e.target.value)}
                    >
                        <option value="Todos">Status</option>
                        <option value="Visíveis">✅ Visíveis</option>
                        <option value="Ocultos">🚫 Ocultos</option>
                    </select>
                    <button
                        type="button"
                        onClick={() => setModoMassa(!modoMassa)}
                        style={{ ...styles.btnGeneric, background: modoMassa ? '#3b82f6' : '#fff', color: modoMassa ? '#fff' : '#3b82f6' }}
                    >
                        Massa
                    </button>
                    <button
                        type="button"
                        onClick={exportarProdutosCSV}
                        style={{ ...styles.btnGeneric, background: '#10b981', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                        <FiDownload /> Exportar
                    </button>
                </div>

                {modoMassa && (
                    <div style={styles.massPanel}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={() => setSelecionados(selecionados.length === produtosFiltrados.length ? [] : produtosFiltrados.map(p => p.id))}
                                style={{ ...styles.btnMass, borderColor: '#cbd5e1' }}
                            >
                                {selecionados.length === produtosFiltrados.length ? "Desmarcar Todos" : "Selecionar Todos"}
                            </button>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e40af' }}>{selecionados.length} itens selecionados</span>
                        </div>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    if (selecionados.length === 0 || !uid) return;
                                    produtosFiltrados.forEach(p => {
                                        if (selecionados.includes(p.id)) updateDoc(doc(db, "lojistas", uid, "produtos", p.id), { ativo: true });
                                    });
                                    setSelecionados([]); setModoMassa(false);
                                }}
                                style={{ ...styles.btnMass, color: '#059669' }}
                            >
                                👁️ Mostrar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (selecionados.length === 0 || !uid) return;
                                    produtosFiltrados.forEach(p => {
                                        if (selecionados.includes(p.id)) updateDoc(doc(db, "lojistas", uid, "produtos", p.id), { ativo: false });
                                    });
                                    setSelecionados([]); setModoMassa(false);
                                }}
                                style={{ ...styles.btnMass, color: '#64748b' }}
                            >
                                🚫 Ocultar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const selecionadosObj = produtos.filter(p => selecionados.includes(p.id));
                                    setListaParaImprimir(selecionadosObj);
                                }}
                                style={{ ...styles.btnMass, color: '#f59e0b' }}
                            >
                                🖨️ Imprimir Selecionados
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Grid de Produtos */}
            <div>
                {/* Regra responsiva embutida para forçar exatamente 4 colunas no mobile sem conflitos */}
                <style dangerouslySetInnerHTML={{
                    __html: `
        @media (max-width: 768px) {
            .product-grid-responsivo {
                display: grid !important;
                grid-template-columns: repeat(4, 1fr) !important;
                gap: 4px !important;
            }
            .product-grid-responsivo > div {
                height: 180px !important;
                max-height: 180px !important;
                padding: 3px !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
            }
            .product-grid-responsivo div[style*="width: 120px"] {
                width: 100% !important;
                height: 50px !important;
                min-height: 50px !important;
            }
            .product-grid-responsivo h4 {
                font-size: 8px !important;
                height: 16px !important;
                line-height: 8px !important;
                overflow: hidden !important;
            }
            .product-grid-responsivo span {
                font-size: 8px !important;
            }
            .product-grid-responsivo .markupTag {
                font-size: 6px !important;
                padding: 0 2px !important;
            }
            .product-grid-responsivo button {
                padding: 1px !important;
                font-size: 7px !important;
                border-radius: 2px !important;
                height: 13px !important;
            }
        }
    `}} />

                <div style={styles.productGrid} className="product-grid-responsivo">
                    {produtosFiltrados.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#64748b', gridColumn: '1 / -1', padding: '30px' }}>Nenhum produto encontrado.</p>
                    ) : (
                        produtosFiltrados.map(p => {
                            const lucro = calcularLucro(p.precoBasico, p.custoUnitario);
                            return (
                                <div key={p.id} style={{ ...styles.card, opacity: p.ativo ? 1 : 0.6 }}>
                                    {p.destaque && <span style={styles.starBadge}>⭐</span>}
                                    {modoMassa && (
                                        <input
                                            type="checkbox"
                                            style={styles.cardCheck}
                                            checked={selecionados.includes(p.id)}
                                            onChange={e => e.target.checked ? setSelecionados([...selecionados, p.id]) : setSelecionados(selecionados.filter(id => id !== p.id))}
                                        />
                                    )}

                                    {/* QUADRO / MOLDURA DA FOTO (CORRIGIDO PARA CONTER PERFEITAMENTE) */}
                                    <div style={styles.cardImgContainer}>
                                        <img
                                            src={p.capa || p.imagens?.[0] || ""}
                                            style={styles.cardImg}
                                            alt={p.nome}
                                        />
                                    </div>

                                    <div style={styles.cardBody}>
                                        <h4 style={styles.cardTitle}>{p.nome}</h4>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '4px' }}>
                                            <span style={styles.cardPrice}>R$ {p.precoBasico || "0,00"}</span>
                                            {lucro && <span style={styles.markupTag}>+{lucro}%</span>}
                                        </div>

                                        <div style={styles.cardActions}>
                                            <button
                                                type="button"
                                                onClick={() => uid && updateDoc(doc(db, "lojistas", uid, "produtos", p.id), { destaque: !p.destaque })}
                                                style={styles.btnSlim}
                                            >
                                                {p.destaque ? "⭐ Destacado" : "☆ Destacar"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onEditar(p)}
                                                style={styles.btnSlim}
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => uid && updateDoc(doc(db, "lojistas", uid, "produtos", p.id), { ativo: !p.ativo })}
                                                style={styles.btnSlim}
                                            >
                                                {p.ativo ? "🚫 Ocultar" : "👁️ Mostrar"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setListaParaImprimir([p])}
                                                style={{ ...styles.btnSlim, background: '#f59e0b', color: '#fff', fontWeight: 'bold' }}
                                            >
                                                🖨️ Etiqueta
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}