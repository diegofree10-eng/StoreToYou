// app/admin/produtos/_components/ListaProdutos.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { FiDownload, FiMoreVertical } from "react-icons/fi";
import { styles } from "../styles";
import { excluirProdutoCompleto } from "@/utils/exclusao";

// 🌟 Importando o hook do tema global (ThemeContext)
import { useTheme } from "@/context/ThemeContext";

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
    onDuplicar: (p: any) => void;
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
    onEditar,
    onDuplicar
}: ListaProdutosProps) {

    // 🌟 CONSUMINDO O TEMA GLOBALMENTE NO INÍCIO DO COMPONENTE
    const { theme } = useTheme();

    const [modalPrecoMassaAberto, setModalPrecoMassaAberto] = useState(false);
    const [tipoAjustePreco, setTipoAjustePreco] = useState<"fixo" | "soma" | "porcentagem">("porcentagem");
    const [valorAjustePreco, setValorAjustePreco] = useState("");
    const [menuAbertoId, setMenuAbertoId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuAbertoId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const formatarCaixaEletronico = (texto: string) => {
        const apenasDigitos = texto.replace(/\D/g, "");
        if (!apenasDigitos) return "0,00";
        const numero = (parseInt(apenasDigitos, 10) / 100).toFixed(2);
        return numero.replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    };

    const calcularLucro = (venda: any, custo: any) => {
        const v = parseFloat(venda);
        const c = parseFloat(custo);
        if (!v || !c || c === 0) return null;
        return (((v - c) / c) * 100).toFixed(0);
    };

    const handleExcluirIndividual = async (produto: any) => {
        if (!uid) return;
        const nomeProd = produto.dsNome || produto.dsNomeProduto || produto.nome || "Produto";
        const confirmar = window.confirm(`Deseja realmente excluir o produto "${nomeProd}"? Esta ação não pode ser desfeita.`);
        if (!confirmar) return;

        try {
            await excluirProdutoCompleto(uid, produto);
            alert("Produto excluído com sucesso! 🗑️");
        } catch (error) {
            console.error("Erro ao excluir produto:", error);
            alert("Erro ao excluir o produto.");
        }
    };

    const excluirEmMassa = async () => {
        if (!uid || selecionados.length === 0) return;
        const confirmar = window.confirm(`Deseja realmente excluir os ${selecionados.length} produtos selecionados do sistema e do armazenamento?`);
        if (!confirmar) return;

        try {
            for (const id of selecionados) {
                const produto = produtos.find(p => p.id === id) || produtosFiltrados.find(p => p.id === id);
                if (produto) {
                    await excluirProdutoCompleto(uid, produto);
                }
            }
            setSelecionados([]);
            setModoMassa(false);
            alert("Produtos selecionados excluídos com sucesso! 🗑️");
        } catch (error) {
            console.error("Erro ao excluir em massa:", error);
            alert("Erro ao excluir os produtos selecionados.");
        }
    };

    const aplicarPrecoEmMassa = async () => {
        if (!uid || selecionados.length === 0 || !valorAjustePreco) {
            alert("Preencha o valor do ajuste.");
            return;
        }

        let valorTratado = valorAjustePreco;
        if (tipoAjustePreco === "fixo" || tipoAjustePreco === "soma") {
            valorTratado = valorAjustePreco.replace(/\./g, "").replace(",", ".");
        } else {
            valorTratado = valorAjustePreco.replace(",", ".");
        }

        const valorNumerico = parseFloat(valorTratado);
        if (isNaN(valorNumerico)) {
            alert("Informe um número válido.");
            return;
        }

        let tipoTexto = "";
        if (tipoAjustePreco === "fixo") tipoTexto = `padronizar para R$ ${valorNumerico.toFixed(2)}`;
        if (tipoAjustePreco === "soma") tipoTexto = `ajustar em R$ ${valorNumerico > 0 ? '+' : ''}${valorNumerico.toFixed(2)}`;
        if (tipoAjustePreco === "porcentagem") tipoTexto = `ajustar em ${valorNumerico > 0 ? '+' : ''}${valorNumerico}%`;

        const confirmar = window.confirm(`Deseja realmente ${tipoTexto} em ${selecionados.length} produto(s) selecionado(s)?`);
        if (!confirmar) return;

        try {
            for (const id of selecionados) {
                const produtoAtual = produtos.find(p => p.id === id) || produtosFiltrados.find(p => p.id === id);
                if (!produtoAtual) continue;

                const precoAtualBanco = produtoAtual.vlPrecoBasicoProduto !== undefined ? produtoAtual.vlPrecoBasicoProduto : (produtoAtual.vlPrecoBasico !== undefined ? produtoAtual.vlPrecoBasico : (produtoAtual.precoBasico || 0));
                let precoAntigo = parseFloat(String(precoAtualBanco).replace(',', '.')) || 0;
                let novoPrecoCalculado = precoAntigo;

                if (tipoAjustePreco === "fixo") {
                    novoPrecoCalculado = valorNumerico;
                } else if (tipoAjustePreco === "soma") {
                    novoPrecoCalculado = precoAntigo + valorNumerico;
                } else if (tipoAjustePreco === "porcentagem") {
                    novoPrecoCalculado = precoAntigo + (precoAntigo * (valorNumerico / 100));
                }

                if (novoPrecoCalculado < 0) novoPrecoCalculado = 0;

                await updateDoc(doc(db, "lojistas", uid, "produtos", id), {
                    vlPrecoBasicoProduto: Number(novoPrecoCalculado.toFixed(2)),
                    nrUpdatedAt: Date.now()
                });
            }

            setSelecionados([]);
            setModoMassa(false);
            setModalPrecoMassaAberto(false);
            setValorAjustePreco("");
            alert("Preços em massa atualizados com sucesso! 💰");
        } catch (error) {
            console.error("Erro ao atualizar preços em massa:", error);
            alert("Erro ao atualizar os preços.");
        }
    };

    const exportarProdutosCSV = () => {
        if (produtosFiltrados.length === 0) {
            alert("Não há produtos para exportar.");
            return;
        }
        const cabecalho = ["SKU", "ID Produto", "Nome", "Variacao/Grade", "Categoria", "Preco Venda", "Custo", "Status", "Peso(kg)", "Medidas", "Personalizavel"];
        const linhas: any[] = [];
        produtosFiltrados.forEach(p => {
            const sku = p.dsSkuProduto || p.dsSku || p.sku || "SEM-SKU";
            const nomeProd = p.dsNomeProduto || p.dsNome || p.nome || "";
            const catProd = p.dsCategoriaProduto || p.dsCategoria || p.categoria || "";
            const precoProd = p.vlPrecoBasicoProduto ?? p.vlPrecoBasico ?? p.precoBasico ?? 0;
            const custoProd = p.vlCustoUnitarioProduto ?? p.vlCustoUnitario ?? p.custoUnitario ?? 0;
            const ativoProd = p.isAtivoProduto ?? p.isAtivo ?? p.ativo ?? true;
            const pesoProd = p.nrPesoProduto ?? p.nrPeso ?? p.peso ?? 0;
            const compProd = p.nrComprimentoProduto ?? p.nrComprimento ?? p.comprimento ?? 0;
            const largProd = p.nrLarguraProduto ?? p.nrLargura ?? p.largura ?? 0;
            const altProd = p.nrAlturaProduto ?? p.nrAltura ?? p.altura ?? 0;
            const reqProd = p.dsRequisitosProduto || p.dsRequisitos || p.requisitos;

            if (p.variacoes && p.variacoes.length > 0) {
                p.variacoes.forEach((v: any) => {
                    const vNome = v.dsNomeProduto || v.dsNome || v.nome || "";
                    const vPreco = v.vlPrecoProduto ?? v.vlPreco ?? v.preco ?? precoProd;
                    const vCusto = v.vlCustoUnitarioProduto ?? v.vlCustoUnitario ?? v.custo ?? custoProd;
                    linhas.push([sku, p.id, `"${nomeProd.replace(/"/g, '""')}"`, `"${vNome.replace(/"/g, '""')}"`, `"${catProd}"`, vPreco, vCusto, ativoProd ? "Visivel" : "Oculto", pesoProd, `${compProd}x${largProd}x${altProd}`, reqProd ? "Sim" : "Nao"]);
                });
            } else {
                linhas.push([sku, p.id, `"${nomeProd.replace(/"/g, '""')}"`, "Unico", `"${catProd}"`, precoProd, custoProd, ativoProd ? "Visivel" : "Oculto", pesoProd, `${compProd}x${largProd}x${altProd}`, reqProd ? "Sim" : "Nao"]);
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
        <div style={{ color: theme.textMain }}>
            <style jsx>{`
                .menu-item-hover:hover {
                    background-color: ${theme.border} !important;
                }
                .menu-item-hover-danger:hover {
                    background-color: #fee2e2 !important;
                }

                @media (max-width: 768px) {
                    .product-grid-mobile {
                        display: grid !important;
                        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                        gap: 8px !important;
                    }
                    
                    .mobile-filter-row {
                        display: flex !important;
                        flex-direction: row !important;
                        gap: 6px !important;
                        width: 100% !important;
                        align-items: center !important;
                        flex-wrap: wrap !important;
                    }
                    .mobile-filter-row input {
                        flex: 1 1 100% !important;
                        margin-bottom: 2px !important;
                    }
                    .mobile-filter-row select {
                        flex: 1 !important;
                        min-width: calc(50% - 4px) !important;
                        padding: 8px !important;
                        font-size: 12px !important;
                    }
                    .mobile-filter-row button {
                        flex: 1 !important;
                        min-width: calc(50% - 4px) !important;
                        padding: 8px !important;
                        font-size: 12px !important;
                        justify-content: center !important;
                    }

                    .mobile-mass-panel {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 8px !important;
                        background: ${theme.bgCard} !important;
                        border: 1px solid ${theme.border} !important;
                        border-radius: 8px !important;
                        padding: 10px !important;
                        margin-top: 10px !important;
                    }
                    .mobile-mass-panel > div:first-child {
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: center !important;
                        width: 100% !important;
                    }
                    
                    .mobile-mass-actions-container {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 6px !important;
                        width: 100% !important;
                    }
                    .mobile-mass-row-1 {
                        display: grid !important;
                        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                        gap: 6px !important;
                        width: 100% !important;
                    }
                    .mobile-mass-row-2 {
                        display: grid !important;
                        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                        gap: 6px !important;
                        width: 100% !important;
                    }
                    .mobile-mass-panel button {
                        width: 100% !important;
                        justify-content: center !important;
                        padding: 6px 4px !important;
                        font-size: 11px !important;
                    }

                    .menu-flutuante-pos {
                        right: 0 !important;
                        left: auto !important;
                    }
                }
            `}</style>

            {modalPrecoMassaAberto && (
                <div style={styles.modalOverlay}>
                    <div style={{ ...styles.modalContent, width: '400px', background: theme.bgCard, color: theme.textMain, border: `1px solid ${theme.border}` }}>
                        <h3 style={{ marginBottom: '10px', fontSize: '16px', fontWeight: 'bold', color: theme.textMain }}>💰 Ajustar Preços em Massa</h3>
                        <p style={{ fontSize: '12px', color: theme.textSec, marginBottom: '15px' }}>
                            Aplicar alteração para os <b>{selecionados.length}</b> produtos selecionados:
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textMain }}>Tipo de Ajuste:</label>
                            <select
                                value={tipoAjustePreco}
                                onChange={(e: any) => {
                                    const novoTipo = e.target.value;
                                    setTipoAjustePreco(novoTipo);
                                    setValorAjustePreco(novoTipo === "porcentagem" ? "" : "0,00");
                                }}
                                style={{ padding: '8px', borderRadius: '6px', border: `1px solid ${theme.border}`, fontSize: '13px', background: theme.inputBg, color: theme.textMain }}
                            >
                                <option value="porcentagem">📈 Aumentar / Diminuir por Porcentagem (%)</option>
                                <option value="soma">➕ Somar / Subtrair Valor Fixo (R$)</option>
                                <option value="fixo">🎯 Padronizar com Preço Fixo (R$)</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textMain }}>
                                {tipoAjustePreco === "porcentagem" && "Percentual (Ex: 10 para +10% ou -10 para desconto):"}
                                {tipoAjustePreco === "soma" && "Valor a somar/subtrair em Reais (Ex: 5,00 ou -2,50):"}
                                {tipoAjustePreco === "fixo" && "Novo preço fixo para todos (Ex: 49,90):"}
                            </label>
                            <input
                                type="text"
                                placeholder={tipoAjustePreco === "porcentagem" ? "Ex: 10 ou -10" : "0,00"}
                                value={valorAjustePreco}
                                onChange={e => {
                                    if (tipoAjustePreco === "porcentagem") {
                                        const valorDigitado = e.target.value.replace(/[^0-9.,-]/g, "");
                                        setValorAjustePreco(valorDigitado);
                                    } else {
                                        setValorAjustePreco(formatarCaixaEletronico(e.target.value));
                                    }
                                }}
                                style={{ ...styles.searchBar, width: '100%', margin: 0, background: theme.inputBg, color: theme.textMain, borderColor: theme.border }}
                                autoFocus
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setModalPrecoMassaAberto(false)} style={{ ...styles.btnGeneric, background: theme.border, color: theme.textMain }}>
                                Cancelar
                            </button>
                            <button type="button" onClick={aplicarPrecoEmMassa} style={{ ...styles.btnGeneric, background: '#10b981', color: '#fff', border: 'none' }}>
                                Aplicar Alteração
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={styles.topHeader}>
                <div className="mobile-filter-row" style={styles.filterRow}>
                    <input
                        style={{ ...styles.searchBar, background: theme.inputBg, color: theme.textMain, borderColor: theme.border }}
                        placeholder="🔍 Buscar por nome..."
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                    />
                    <select style={{ ...styles.selectTop, background: theme.inputBg, color: theme.textMain, borderColor: theme.border }} value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
                        <option value="Todos">Categorias</option>
                        {listaCategorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                    </select>
                    <select style={{ ...styles.selectStatus, background: theme.inputBg, color: theme.textMain, borderColor: theme.border }} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                        <option value="Todos">Status</option>
                        <option value="Visíveis">✅ Visíveis</option>
                        <option value="Ocultos">🚫 Ocultos</option>
                    </select>
                    <button type="button" onClick={() => setModoMassa(!modoMassa)} style={{ ...styles.btnGeneric, background: modoMassa ? theme.primary : theme.bgCard, color: modoMassa ? '#fff' : theme.textMain, border: `1px solid ${theme.border}` }}>
                        Editar em Massa
                    </button>
                    <button type="button" onClick={exportarProdutosCSV} style={{ ...styles.btnGeneric, background: '#10b981', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <FiDownload /> Exportar
                    </button>
                </div>

                {modoMassa && (
                    <div className="mobile-mass-panel" style={{ ...styles.massPanel, background: theme.bgCard, borderColor: theme.border }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button type="button" onClick={() => setSelecionados(selecionados.length === produtosFiltrados.length ? [] : produtosFiltrados.map(p => p.id))} style={{ ...styles.btnMass, borderColor: theme.border, background: theme.inputBg, color: theme.textMain }}>
                                {selecionados.length === produtosFiltrados.length ? "Desmarcar Todos" : "Selecionar Todos"}
                            </button>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.primary }}>{selecionados.length} itens selecionados</span>
                        </div>
                        <div className="mobile-mass-actions-container" style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            <div className="mobile-mass-row-1" style={{ display: 'contents' }}>
                                <button type="button" onClick={() => { if (selecionados.length === 0 || !uid) return; produtosFiltrados.forEach(p => { if (selecionados.includes(p.id)) updateDoc(doc(db, "lojistas", uid, "produtos", p.id), { isAtivoProduto: true, isAtivo: true }); }); setSelecionados([]); setModoMassa(false); }} style={{ ...styles.btnMass, color: '#059669', background: theme.inputBg, borderColor: theme.border }}>
                                    👁️ Mostrar
                                </button>
                                <button type="button" onClick={() => { if (selecionados.length === 0 || !uid) return; produtosFiltrados.forEach(p => { if (selecionados.includes(p.id)) updateDoc(doc(db, "lojistas", uid, "produtos", p.id), { isAtivoProduto: false, isAtivo: false }); }); setSelecionados([]); setModoMassa(false); }} style={{ ...styles.btnMass, color: theme.textSec, background: theme.inputBg, borderColor: theme.border }}>
                                    🚫 Ocultar
                                </button>
                                <button type="button" onClick={excluirEmMassa} style={{ ...styles.btnMass, color: '#dc2626', background: theme.inputBg, borderColor: theme.border }}>
                                    🗑️ Excluir
                                </button>
                            </div>
                            <div className="mobile-mass-row-2" style={{ display: 'contents' }}>
                                <button 
                                    type="button" 
                                    onClick={() => { 
                                        if (selecionados.length === 0) return alert("Selecione ao menos um produto."); 
                                        setValorAjustePreco(tipoAjustePreco === "porcentagem" ? "" : "0,00"); 
                                        setModalPrecoMassaAberto(true); 
                                    }} 
                                    style={{ ...styles.btnMass, color: theme.primary, background: theme.inputBg, borderColor: theme.border }}
                                >
                                    💰 Preço em Massa
                                </button>
                                <button type="button" onClick={() => { const selecionadosObj = produtos.filter(p => selecionados.includes(p.id)); setListaParaImprimir(selecionadosObj); }} style={{ ...styles.btnMass, color: '#f59e0b', background: theme.inputBg, borderColor: theme.border }}>
                                    🖨️ Imprimir
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div>
                <div className="product-grid-mobile" style={styles.productGrid}>
                    {produtosFiltrados.length === 0 ? (
                        <p style={{ textAlign: 'center', color: theme.textSec, gridColumn: '1 / -1', padding: '30px' }}>Nenhum produto encontrado.</p>
                    ) : (
                        produtosFiltrados.map(p => {
                            const nomeProd = p.dsNomeProduto || p.dsNome || p.nome || "";
                            const precoProd = p.vlPrecoBasicoProduto ?? p.vlPrecoBasico ?? p.precoBasico ?? 0;
                            const custoProd = p.vlCustoUnitarioProduto ?? p.vlCustoUnitario ?? p.custoUnitario ?? 0;
                            const ativoProd = p.isAtivoProduto ?? p.isAtivo ?? p.ativo ?? true;
                            const capaProd = p.dsCapaProduto || p.dsCapa || p.capa || p.dsImagensProduto?.[0] || p.dsImagens?.[0] || p.imagens?.[0] || "";
                            const lucro = calcularLucro(precoProd, custoProd);
                            const isOpen = menuAbertoId === p.id;

                            return (
                                <div
                                    key={p.id}
                                    style={{
                                        ...styles.card,
                                        background: theme.bgCard,
                                        borderColor: theme.border,
                                        color: theme.textMain,
                                        opacity: ativoProd ? 1 : 0.6,
                                        position: 'relative',
                                        zIndex: isOpen ? 50 : 1,
                                        overflow: 'visible'
                                    }}
                                >
                                    {modoMassa && (
                                        <input
                                            type="checkbox"
                                            style={styles.cardCheck}
                                            checked={selecionados.includes(p.id)}
                                            onChange={e => e.target.checked ? setSelecionados([...selecionados, p.id]) : setSelecionados(selecionados.filter(id => id !== p.id))}
                                        />
                                    )}

                                    {p.isDestaque && (
                                        <div
                                            title="Produto em Destaque"
                                            style={{
                                                position: 'absolute',
                                                top: '8px',
                                                left: modoMassa ? '32px' : '8px',
                                                zIndex: 5,
                                                background: '#f59e0b',
                                                border: '1px solid #d97706',
                                                borderRadius: '50%',
                                                width: '26px',
                                                height: '26px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                                fontSize: '12px',
                                                pointerEvents: 'none',
                                                transition: 'left 0.2s ease'
                                            }}
                                        >
                                            ⭐
                                        </div>
                                    )}

                                    <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 100 }}>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMenuAbertoId(isOpen ? null : p.id);
                                            }}
                                            style={{
                                                background: theme.bgCard,
                                                border: `1px solid ${theme.border}`,
                                                borderRadius: '50%',
                                                width: '28px',
                                                height: '28px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                                            }}
                                        >
                                            <FiMoreVertical size={14} color={theme.textMain} />
                                        </button>

                                        {isOpen && (
                                            <div className="menu-flutuante-pos" style={{
                                                position: 'absolute',
                                                top: '32px',
                                                right: 0,
                                                background: theme.bgCard,
                                                border: `1px solid ${theme.border}`,
                                                borderRadius: '8px',
                                                boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                                                width: '160px',
                                                zIndex: 9999,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                padding: '6px 0',
                                                overflow: 'hidden'
                                            }}>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMenuAbertoId(null);
                                                        if (uid) {
                                                            updateDoc(doc(db, "lojistas", uid, "produtos", p.id), { isDestaque: !p.isDestaque });
                                                        }
                                                    }}
                                                    className="menu-item-hover"
                                                    style={{ padding: '9px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '8px', width: '100%', transition: 'background 0.15s ease' }}
                                                >
                                                    {p.isDestaque ? "⭐ Remover Destaque" : "⭐ Destacar"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setMenuAbertoId(null); onEditar(p); }}
                                                    className="menu-item-hover"
                                                    style={{ padding: '9px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', color: theme.primary, display: 'flex', alignItems: 'center', gap: '8px', width: '100%', transition: 'background 0.15s ease' }}
                                                >
                                                    ✏️ Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setMenuAbertoId(null); onDuplicar(p); }}
                                                    className="menu-item-hover"
                                                    style={{ padding: '9px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', color: '#059669', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', transition: 'background 0.15s ease' }}
                                                >
                                                    📋 Duplicar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMenuAbertoId(null);
                                                        if (uid) {
                                                            updateDoc(doc(db, "lojistas", uid, "produtos", p.id), { isAtivoProduto: !ativoProd, isAtivo: !ativoProd });
                                                        }
                                                    }}
                                                    className="menu-item-hover"
                                                    style={{ padding: '9px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', color: theme.textSec, display: 'flex', alignItems: 'center', gap: '8px', width: '100%', transition: 'background 0.15s ease' }}
                                                >
                                                    {ativoProd ? "🚫 Ocultar" : "👁️ Mostrar"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setMenuAbertoId(null); setListaParaImprimir([p]); }}
                                                    className="menu-item-hover"
                                                    style={{ padding: '9px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', color: '#d97706', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', transition: 'background 0.15s ease' }}
                                                >
                                                    🖨️ Etiqueta
                                                </button>
                                                <div style={{ height: '1px', background: theme.border, margin: '3px 0' }} />
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setMenuAbertoId(null); handleExcluirIndividual(p); }}
                                                    className="menu-item-hover-danger"
                                                    style={{ padding: '9px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', transition: 'background 0.15s ease' }}
                                                >
                                                    🗑️ Excluir
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div style={styles.cardImgContainer}>
                                        {capaProd ? (
                                            <img src={capaProd} style={styles.cardImg} alt={nomeProd} />
                                        ) : (
                                            <div style={{ ...styles.cardImg, display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.border, color: theme.textSec, fontSize: '11px' }}>
                                                Sem foto
                                            </div>
                                        )}
                                    </div>

                                    <div style={styles.cardBody}>
                                        <h4 style={{ ...styles.cardTitle, color: theme.textMain }}>{nomeProd}</h4>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 'auto' }}>
                                            <span style={{ ...styles.cardPrice, color: theme.primary }}>R$ {Number(precoProd).toFixed(2).replace('.', ',')}</span>
                                            {lucro && <span style={styles.markupTag}>+{lucro}%</span>}
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