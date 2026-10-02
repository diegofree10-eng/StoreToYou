// app/admin/estoque/_tabGestaoEstoque/tabHistoricoMovimentacoes.tsx
"use client";
import React, { useEffect, useState } from "react";
import { collection, query, orderBy, limit, startAfter, endBefore, limitToLast, getDocs, where, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FiClock, FiFilter, FiCalendar, FiChevronLeft, FiChevronRight } from "react-icons/fi";

export function tabHistoricoMovimentacoes({ uid, theme, buscaExterna }: any) {
    const [historico, setHistorico] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Estados de Paginação e Limite
    const [itensPorPagina, setItensPorPagina] = useState<number>(20);
    const [paginaAtual, setPaginaAtual] = useState<number>(1);
    const [primeiroDoc, setPrimeiroDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [ultimoDoc, setUltimoDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [temMaisPaginas, setTemMaisPaginas] = useState<boolean>(true);

    // Estados locais para os filtros
    const [tipoFiltro, setTipoFiltro] = useState<"todos" | "produto" | "insumo" | "embalagem">("todos");
    const [movimentacaoFiltro, setMovimentacaoFiltro] = useState<"todos" | "ENTRADA" | "SAIDA">("todos"); // 🌟 Novo filtro de Entrada/Saída
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");

    // Função Otimizada para Buscar Dados com Filtros e Cursor do Firestore
    const carregarMovimentacoes = async (direcao: "inicial" | "proxima" | "anterior", docRefState: any = null) => {
        if (!uid) return;
        setLoading(true);

        try {
            const colRef = collection(db, "lojistas", uid, "movimentacoes_estoque");
            let constraints: any[] = [orderBy("dataMovimentacao", "desc")];

            // 🔍 Filtro por Tipo de Item no Banco
            if (tipoFiltro !== "todos") {
                constraints.push(where("tipoItem", "==", tipoFiltro));
            }

            // 🔍 Filtro por Tipo de Movimentação no Banco (ENTRADA / SAIDA)
            if (movimentacaoFiltro !== "todos") {
                constraints.push(where("tipoMovimentacao", "==", movimentacaoFiltro));
            }

            // 📅 Filtro por Data Início (ISO String format)
            if (dataInicio) {
                const isoInicio = new Date(`${dataInicio}T00:00:00.000Z`).toISOString();
                constraints.push(where("dataMovimentacao", ">=", isoInicio));
            }

            // 📅 Filtro por Data Fim (ISO String format)
            if (dataFim) {
                const isoFim = new Date(`${dataFim}T23:59:59.999Z`).toISOString();
                constraints.push(where("dataMovimentacao", "<=", isoFim));
            }

            // 📄 Controle de Paginação (Cursores)
            if (direcao === "proxima" && docRefState) {
                constraints.push(startAfter(docRefState));
            } else if (direcao === "anterior" && docRefState) {
                constraints.push(endBefore(docRefState));
                constraints.push(limitToLast(itensPorPagina));
            } else {
                constraints.push(limit(itensPorPagina));
            }

            // Se não usou limitToLast, aplica o limit normal
            if (direcao !== "anterior") {
                constraints.push(limit(itensPorPagina));
            }

            const q = query(colRef, ...constraints);
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setHistorico(docs);
                setPrimeiroDoc(snapshot.docs[0]);
                setUltimoDoc(snapshot.docs[snapshot.docs.length - 1]);
                setTemMaisPaginas(snapshot.docs.length === itensPorPagina);
            } else {
                if (direcao === "inicial") {
                    setHistorico([]);
                }
                setTemMaisPaginas(false);
            }
        } catch (error) {
            console.error("Erro ao carregar histórico paginado:", error);
        } finally {
            setLoading(false);
        }
    };

    // Recarrega sempre que mudar itens por página, filtros ou UID
    useEffect(() => {
        setPaginaAtual(1);
        setPrimeiroDoc(null);
        setUltimoDoc(null);
        carregarMovimentacoes("inicial");
    }, [uid, itensPorPagina, tipoFiltro, movimentacaoFiltro, dataInicio, dataFim]);

    const proximaPagina = () => {
        if (!ultimoDoc) return;
        setPaginaAtual(prev => prev + 1);
        carregarMovimentacoes("proxima", ultimoDoc);
    };

    const paginaAnterior = () => {
        if (!primeiroDoc || paginaAtual <= 1) return;
        setPaginaAtual(prev => prev - 1);
        carregarMovimentacoes("anterior", primeiroDoc);
    };

    // Filtro global rápido de texto sobre os dados da página carregada
    const historicoFiltrado = historico.filter((item) => {
        const termoGlobal = (buscaExterna || "").toLowerCase();
        if (!termoGlobal) return true;

        const nome = String(item.nomeItem || "").toLowerCase();
        const origem = String(item.origem || "").toLowerCase();
        const operador = String(item.operador || "").toLowerCase();
        return nome.includes(termoGlobal) || origem.includes(termoGlobal) || operador.includes(termoGlobal);
    });

    return (
        <div style={{ background: theme.bgCard, padding: "16px", borderRadius: "10px", border: `1px solid ${theme.border}` }}>

            {/* CABEÇALHO E FILTROS AUXILIARES */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <FiClock size={18} color={theme.primary} />
                    <h3 style={{ fontSize: "15px", margin: 0, color: theme.textMain }}>Extrato e Auditoria de Movimentações de Estoque</h3>
                </div>

                {/* CONTROLES EXTRAS: Limite, Tipo, Movimentação e Período */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>

                    {/* Seletor de Registros por Página */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: theme.inputBg, padding: '5px 8px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                        <span style={{ fontSize: '11px', color: theme.textSec }}>Exibir:</span>
                        <select
                            value={itensPorPagina}
                            onChange={(e) => setItensPorPagina(Number(e.target.value))}
                            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11px', color: theme.textMain, cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            <option value={20} style={{ background: theme.bgCard }}>20</option>
                            <option value={40} style={{ background: theme.bgCard }}>40</option>
                            <option value={60} style={{ background: theme.bgCard }}>60</option>
                        </select>
                    </div>

                    {/* Select de Categoria (Produto, Insumo, Embalagem) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: theme.inputBg, padding: '5px 8px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                        <FiFilter color={theme.textSec} size={13} />
                        <select
                            value={tipoFiltro}
                            onChange={(e: any) => setTipoFiltro(e.target.value)}
                            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11px', color: theme.textMain, cursor: 'pointer' }}
                        >
                            <option value="todos" style={{ background: theme.bgCard }}>Todos os Itens</option>
                            <option value="produto" style={{ background: theme.bgCard }}>Produtos</option>
                            <option value="insumo" style={{ background: theme.bgCard }}>Insumos</option>
                            <option value="embalagem" style={{ background: theme.bgCard }}>Embalagens</option>
                        </select>
                    </div>

                    {/* 🌟 Select de Movimentação (Entrada / Saída) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: theme.inputBg, padding: '5px 8px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                        <select
                            value={movimentacaoFiltro}
                            onChange={(e: any) => setMovimentacaoFiltro(e.target.value)}
                            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11px', color: theme.textMain, cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            <option value="todos" style={{ background: theme.bgCard }}>Entradas e Saídas</option>
                            <option value="ENTRADA" style={{ background: theme.bgCard }}>Apenas Entradas</option>
                            <option value="SAIDA" style={{ background: theme.bgCard }}>Apenas Saídas</option>
                        </select>
                    </div>

                    {/* Data Início */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: theme.inputBg, padding: '5px 8px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                        <FiCalendar color={theme.textSec} size={13} />
                        <span style={{ fontSize: '10px', color: theme.textSec }}>De:</span>
                        <input
                            type="date"
                            value={dataInicio}
                            onChange={(e) => setDataInicio(e.target.value)}
                            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11px', color: theme.textMain }}
                        />
                    </div>

                    {/* Data Fim */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: theme.inputBg, padding: '5px 8px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                        <FiCalendar color={theme.textSec} size={13} />
                        <span style={{ fontSize: '10px', color: theme.textSec }}>Até:</span>
                        <input
                            type="date"
                            value={dataFim}
                            onChange={(e) => setDataFim(e.target.value)}
                            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11px', color: theme.textMain }}
                        />
                    </div>

                </div>

            </div>

            {/* TABELA DE RESULTADOS */}
            {loading ? (
                <div style={{ padding: "30px", textAlign: "center", color: theme.textSec, fontSize: "13px" }}>Carregando dados do extrato...</div>
            ) : historicoFiltrado.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: theme.textSec, fontSize: "13px" }}>
                    Nenhuma movimentação encontrada com os filtros aplicados.
                </div>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                        <thead>
                            <tr style={{ borderBottom: `1px solid ${theme.border}`, color: theme.textSec }}>
                                <th style={{ padding: "10px" }}>Data / Hora</th>
                                <th style={{ padding: "10px" }}>Item Movimentado</th>
                                <th style={{ padding: "10px" }}>Tipo</th>
                                <th style={{ padding: "10px" }}>Origem</th>
                                <th style={{ padding: "10px" }}>Qtd</th>
                                <th style={{ padding: "10px" }}>Saldo Anterior</th>
                                <th style={{ padding: "10px" }}>Novo Saldo</th>
                                <th style={{ padding: "10px" }}>Responsável</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historicoFiltrado.map((item) => {
                                const isEntrada = item.tipoMovimentacao === "ENTRADA";
                                return (
                                    <tr key={item.id} style={{ borderBottom: `1px solid ${theme.border}`, color: theme.textMain }}>
                                        <td style={{ padding: "10px", whiteSpace: "nowrap", color: theme.textSec }}>
                                            {item.dataMovimentacao ? new Date(item.dataMovimentacao).toLocaleString("pt-BR") : "-"}
                                        </td>
                                        <td style={{ padding: "10px" }}>
                                            <strong style={{ display: "block" }}>{item.nomeItem || "Item sem nome"}</strong>
                                            {item.variacao && <span style={{ fontSize: "10px", color: theme.primary }}>Variação: {item.variacao}</span>}
                                            <span style={{ fontSize: "10px", color: theme.textSec, display: "block", textTransform: "uppercase" }}>Tipo: {item.tipoItem}</span>
                                        </td>
                                        <td style={{ padding: "10px" }}>
                                            <span style={{
                                                padding: "3px 8px",
                                                borderRadius: "4px",
                                                fontWeight: "bold",
                                                fontSize: "10px",
                                                color: "#fff",
                                                background: isEntrada ? "#10b981" : "#ef4444"
                                            }}>
                                                {item.tipoMovimentacao}
                                            </span>
                                        </td>
                                        <td style={{ padding: "10px", fontWeight: "600" }}>
                                            {item.origem} {item.pedidoId ? `(Pedido #${item.pedidoId.substring(0, 6)})` : ""}
                                        </td>
                                        <td style={{ padding: "10px", fontWeight: "bold", color: isEntrada ? "#10b981" : "#ef4444" }}>
                                            {isEntrada ? `+${item.quantidade}` : `-${item.quantidade}`}
                                        </td>
                                        <td style={{ padding: "10px", color: theme.textSec }}>
                                            {typeof item.estoqueAnterior === 'number' && !isNaN(item.estoqueAnterior) ? item.estoqueAnterior : "-"}
                                        </td>
                                        <td style={{ padding: "10px", fontWeight: "bold" }}>
                                            {typeof item.estoqueAtual === 'number' && !isNaN(item.estoqueAtual) ? item.estoqueAtual : "-"}
                                        </td>
                                        <td style={{ padding: "10px", color: theme.textSec }}>{item.operador || "Sistema"}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* CONTROLES DE PAGINAÇÃO RODAPÉ */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "12px", borderTop: `1px solid ${theme.border}`, fontSize: "12px" }}>
                <span style={{ color: theme.textSec }}>Página atual: <strong>{paginaAtual}</strong></span>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button
                        onClick={paginaAnterior}
                        disabled={paginaAtual === 1 || loading}
                        style={{
                            background: paginaAtual === 1 ? theme.bgApp : theme.primary,
                            color: paginaAtual === 1 ? theme.textSec : "#fff",
                            border: `1px solid ${theme.border}`,
                            padding: "6px 12px",
                            borderRadius: "6px",
                            cursor: paginaAtual === 1 ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontWeight: "bold",
                            opacity: paginaAtual === 1 ? 0.6 : 1
                        }}
                    >
                        <FiChevronLeft size={14} /> Anterior
                    </button>
                    <button
                        onClick={proximaPagina}
                        disabled={!temMaisPaginas || loading}
                        style={{
                            background: !temMaisPaginas ? theme.bgApp : theme.primary,
                            color: !temMaisPaginas ? theme.textSec : "#fff",
                            border: `1px solid ${theme.border}`,
                            padding: "6px 12px",
                            borderRadius: "6px",
                            cursor: !temMaisPaginas ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontWeight: "bold",
                            opacity: !temMaisPaginas ? 0.6 : 1
                        }}
                    >
                        Próxima <FiChevronRight size={14} />
                    </button>
                </div>
            </div>

        </div>
    );
}