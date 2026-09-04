// app/admin/estoque/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useTheme } from "@/context/ThemeContext";
import { FiBox, FiLayers, FiPackage, FiSearch, FiAlertTriangle, FiXCircle, FiDollarSign } from "react-icons/fi";

import { TabEstoqueProdutos } from "./_tabGestaoEstoque/tabEstoqueProdutos";
import { TabEstoqueInsumos } from "./_tabGestaoEstoque/tabEstoqueInsumos";
import { TabEmbalagens } from "./_tabGestaoEstoque/tabEmbalagens";

export default function PaginaEstoqueContainer() {
    const { theme } = useTheme();
    const [uid, setUid] = useState<string | null>(null);
    const [abaAtiva, setAbaAtiva] = useState<"produtos" | "insumos" | "embalagens">("produtos");
    const [loadingAuth, setLoadingAuth] = useState(true);

    // Estados globais para alimentar os cards de topo e o filtro de busca unificado
    const [produtos, setProdutos] = useState<any[]>([]);
    const [insumos, setInsumos] = useState<any[]>([]);
    const [embalagens, setEmbalagens] = useState<any[]>([]);
    const [busca, setBusca] = useState("");
    const [filtroRapido, setFiltroRapido] = useState<"todos" | "baixo" | "zerado">("todos");

    useEffect(() => {
        const operadorSalvo = localStorage.getItem("operadorAtivoPdv");
        if (operadorSalvo) {
            try {
                const colab = JSON.parse(operadorSalvo);
                if (!colab.permissoes || colab.permissoes.estoque !== true) {
                    alert("⚠️ Você não tem permissão para acessar o Estoque!");
                    window.location.href = "/admin/pdv";
                    return;
                }
            } catch (e) {
                console.error("Erro ao validar operador:", e);
            }
        }

        const unsubAuth = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setUid(null);
                setLoadingAuth(false);
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, "usuarios", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUid(userData.lojaId || user.uid);
                } else {
                    setUid(user.uid);
                }
            } catch (error) {
                console.error("Erro ao carregar dados do usuário:", error);
                setUid(user.uid);
            } finally {
                setLoadingAuth(false);
            }
        });

        return () => unsubAuth();
    }, []);

    // Escuta em tempo real as coleções para alimentar as métricas globais do topo
    useEffect(() => {
        if (!uid) return;

        const unsubProd = onSnapshot(query(collection(db, "lojistas", uid, "produtos"), orderBy("nrCreatedAt", "desc")), (snap) => {
            setProdutos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const unsubInsumos = onSnapshot(query(collection(db, "lojistas", uid, "insumos_composicao"), orderBy("dsNomeInsumo", "asc")), (snap) => {
            setInsumos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // CORRIGIDO: Agora aponta para a coleção correta "embalagem"
        const unsubEmb = onSnapshot(query(collection(db, "lojistas", uid, "embalagem"), orderBy("dsNomeEmbalagem", "asc")), (snap) => {
            setEmbalagens(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubProd();
            unsubInsumos();
            unsubEmb();
        };
    }, [uid]);

    // Cálculo unificado de métricas com base na aba ativa atual
    const metricas = useMemo(() => {
        if (abaAtiva === "produtos") {
            let totalItens = 0;
            let estoqueBaixo = 0;
            let zerados = 0;
            let valorTotalEstoque = 0;

            produtos.forEach(p => {
                const minDesejado = Number(p.nrEstoqueMinimoProduto ?? p.nrEstoqueMinimo ?? 3);
                const variacoesArr = p.variacoes || [];

                if (Array.isArray(variacoesArr) && variacoesArr.length > 0) {
                    variacoesArr.forEach((v: any) => {
                        const qtd = Number(v.nrEstoqueProduto ?? v.nrEstoque ?? 0);
                        const preco = Number(v.vlPrecoProduto ?? v.vlPreco ?? p.vlPrecoBasicoProduto ?? 0);
                        totalItens++;
                        if (qtd === 0) zerados++;
                        else if (qtd <= minDesejado) estoqueBaixo++;
                        valorTotalEstoque += qtd * preco;
                    });
                } else {
                    const qtd = Number(p.nrEstoqueProduto ?? p.nrEstoque ?? 0);
                    const preco = Number(p.vlPrecoBasicoProduto ?? p.vlPrecoBasico ?? 0);
                    totalItens++;
                    if (qtd === 0) zerados++;
                    else if (qtd <= minDesejado) estoqueBaixo++;
                    valorTotalEstoque += qtd * preco;
                }
            });
            return { totalItens, estoqueBaixo, zerados, valorTotalEstoque, labelValor: "VALOR TOTAL EM ESTOQUE" };
        } else if (abaAtiva === "insumos") {
            let totalItens = insumos.length;
            let estoqueBaixo = 0;
            let zerados = 0;
            let valorTotalEstoque = 0;

            insumos.forEach(item => {
                const qtd = Number(item.nrEstoqueAtualInsumo ?? item.nrEstoqueAtual ?? item.estoque ?? 0);
                const min = Number(item.nrEstoqueMinimoInsumo ?? item.nrEstoqueMinimo ?? item.estoqueMinimo ?? 10);
                const custo = Number(item.vlCustoUnitarioInsumo ?? item.vlCustoUnitario ?? item.custo ?? 0);

                if (qtd === 0) zerados++;
                else if (qtd <= min) estoqueBaixo++;
                valorTotalEstoque += qtd * custo;
            });
            return { totalItens, estoqueBaixo, zerados, valorTotalEstoque, labelValor: "VALOR TOTAL EM CUSTO" };
        } else {
            // Embalagens
            let totalItens = embalagens.length;
            let estoqueBaixo = 0;
            let zerados = 0;
            let valorTotalEstoque = 0;

            embalagens.forEach(item => {
                const qtd = Number(item.nrEstoqueAtualEmbalagem ?? item.nrEstoqueAtual ?? item.estoque ?? 0);
                const min = Number(item.nrEstoqueMinimoEmbalagem ?? item.nrEstoqueMinimo ?? item.estoqueMinimo ?? 10);
                const custo = Number(item.vlCustoUnitarioEmbalagem ?? item.vlCustoUnitario ?? item.custo ?? 0);

                if (qtd === 0) zerados++;
                else if (qtd <= min) estoqueBaixo++;
                valorTotalEstoque += qtd * custo;
            });
            return { totalItens, estoqueBaixo, zerados, valorTotalEstoque, labelValor: "VALOR TOTAL EM CUSTO" };
        }
    }, [abaAtiva, produtos, insumos, embalagens]);

    if (loadingAuth) {
        return <div style={{ padding: '20px', color: theme.textMain }}>Carregando permissões de estoque...</div>;
    }

    if (!uid) {
        return <div style={{ padding: '20px', color: theme.textMain }}>Acesso negado. Por favor, faça login.</div>;
    }

    return (
        <div style={{ padding: '15px', fontFamily: 'system-ui, sans-serif', backgroundColor: theme.bgApp, color: theme.textMain, minHeight: '100vh', boxSizing: 'border-box' }}>
            
            {/* TÍTULO E SUBTÍTULO */}
            <div style={{ marginBottom: '15px' }}>
                <h2 style={{ fontSize: '20px', color: theme.textMain, margin: 0, fontWeight: 800 }}>📦 Central de Estoque</h2>
                <p style={{ fontSize: '13px', color: theme.textSec, margin: '4px 0 0 0' }}>
                    Gerencie produtos, insumos e embalagens de forma unificada e integrada.
                </p>
            </div>

            {/* NAVEGAÇÃO DE ABAS */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "15px", borderBottom: `1px solid ${theme.border}`, paddingBottom: "10px", overflowX: "auto" }}>
                <button
                    onClick={() => { setAbaAtiva("produtos"); setFiltroRapido("todos"); setBusca(""); }}
                    style={{
                        padding: "10px 18px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "13px",
                        border: abaAtiva === "produtos" ? "none" : `1px solid ${theme.border}`,
                        backgroundColor: abaAtiva === "produtos" ? theme.primary : theme.bgCard,
                        color: abaAtiva === "produtos" ? "#ffffff" : theme.textMain,
                        whiteSpace: "nowrap"
                    }}
                >
                    <FiBox size={16} /> Produtos (Para Venda)
                </button>

                <button
                    onClick={() => { setAbaAtiva("insumos"); setFiltroRapido("todos"); setBusca(""); }}
                    style={{
                        padding: "10px 18px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "13px",
                        border: abaAtiva === "insumos" ? "none" : `1px solid ${theme.border}`,
                        backgroundColor: abaAtiva === "insumos" ? theme.primary : theme.bgCard,
                        color: abaAtiva === "insumos" ? "#ffffff" : theme.textMain,
                        whiteSpace: "nowrap"
                    }}
                >
                    <FiLayers size={16} /> Insumos Gerais
                </button>

                <button
                    onClick={() => { setAbaAtiva("embalagens"); setFiltroRapido("todos"); setBusca(""); }}
                    style={{
                        padding: "10px 18px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "13px",
                        border: abaAtiva === "embalagens" ? "none" : `1px solid ${theme.border}`,
                        backgroundColor: abaAtiva === "embalagens" ? theme.primary : theme.bgCard,
                        color: abaAtiva === "embalagens" ? "#ffffff" : theme.textMain,
                        whiteSpace: "nowrap"
                    }}
                >
                    <FiPackage size={16} /> Embalagens
                </button>
            </div>

            {/* CARDS DE TOPO PADRONIZADOS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                <div onClick={() => setFiltroRapido("todos")} style={{ backgroundColor: theme.bgCard, padding: '12px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, borderLeft: `4px solid ${theme.primary}`, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: theme.textSec }}>TOTAL CADASTRADO</span>
                            <h3 style={{ fontSize: '20px', margin: '4px 0 0 0', color: theme.textMain }}>{metricas.totalItens}</h3>
                        </div>
                        <FiPackage size={24} color={theme.primary} />
                    </div>
                </div>

                <div onClick={() => setFiltroRapido("baixo")} style={{ backgroundColor: theme.bgCard, padding: '12px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, borderLeft: '4px solid #f59e0b', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: theme.textSec }}>ESTOQUE BAIXO</span>
                            <h3 style={{ fontSize: '20px', margin: '4px 0 0 0', color: theme.textMain }}>{metricas.estoqueBaixo}</h3>
                        </div>
                        <FiAlertTriangle size={24} color="#f59e0b" />
                    </div>
                </div>

                <div onClick={() => setFiltroRapido("zerado")} style={{ backgroundColor: theme.bgCard, padding: '12px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, borderLeft: '4px solid #ef4444', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: theme.textSec }}>ESGOTADOS (ZERADOS)</span>
                            <h3 style={{ fontSize: '20px', margin: '4px 0 0 0', color: theme.textMain }}>{metricas.zerados}</h3>
                        </div>
                        <FiXCircle size={24} color="#ef4444" />
                    </div>
                </div>

                <div style={{ backgroundColor: theme.bgCard, padding: '12px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, borderLeft: '4px solid #10b981' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: theme.textSec }}>{metricas.labelValor}</span>
                            <h3 style={{ fontSize: '18px', margin: '4px 0 0 0', color: theme.textMain }}>
                                R$ {metricas.valorTotalEstoque.toFixed(2).replace('.', ',')}
                            </h3>
                        </div>
                        <FiDollarSign size={24} color="#10b981" />
                    </div>
                </div>
            </div>

            {/* BARRA DE BUSCA E FILTROS RÁPIDOS UNIFICADA */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap', background: theme.bgCard, padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px', background: theme.inputBg, padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                    <FiSearch color={theme.textSec} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nome, variação ou SKU..." 
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: theme.textMain }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '6px', width: '100%', justifyContent: 'space-between' }}>
                    <button onClick={() => setFiltroRapido("todos")} style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', border: `1px solid ${theme.border}`, background: filtroRapido === 'todos' ? theme.primary : theme.bgCard, color: filtroRapido === 'todos' ? '#fff' : theme.textSec }}>Todos</button>
                    <button onClick={() => setFiltroRapido("baixo")} style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', border: `1px solid ${theme.border}`, background: filtroRapido === 'baixo' ? '#f59e0b' : theme.bgCard, color: filtroRapido === 'baixo' ? '#fff' : theme.textSec }}>Estoque Baixo</button>
                    <button onClick={() => setFiltroRapido("zerado")} style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', border: `1px solid ${theme.border}`, background: filtroRapido === 'zerado' ? '#ef4444' : theme.bgCard, color: filtroRapido === 'zerado' ? '#fff' : theme.textSec }}>Zerados</button>
                </div>
            </div>

            {/* CONTEÚDO DAS ABAS */}
            {abaAtiva === "produtos" && <TabEstoqueProdutos uid={uid} buscaExterna={busca} filtroRapidoExterno={filtroRapido} />}
            {abaAtiva === "insumos" && <TabEstoqueInsumos uid={uid} buscaExterna={busca} filtroRapidoExterno={filtroRapido} />}
            {abaAtiva === "embalagens" && <TabEmbalagens uid={uid} buscaExterna={busca} filtroRapidoExterno={filtroRapido} />}

        </div>
    );
}