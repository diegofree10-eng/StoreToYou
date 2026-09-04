// app/admin/estoque/_tabGestaoEstoque/tabCompras.tsx
"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, getDoc, setDoc, updateDoc, runTransaction } from "firebase/firestore";
import { FiPlus, FiTrash2, FiEdit2, FiX, FiChevronDown, FiChevronUp, FiShoppingCart, FiHelpCircle } from "react-icons/fi";
import { useTheme } from "@/context/ThemeContext";
import { aplicarMascara } from "@/utils/formatters";
import { converterUnidade } from "@/utils/conversaoUnidades"; // 👈 Importação do nosso helper robusto

export function TabCompras({ uid }: { uid: string }) {
    const { theme } = useTheme();
    const [pedidos, setPedidos] = useState<any[]>([]);
    const [insumosLista, setInsumosLista] = useState<any[]>([]);
    const [modalAberto, setModalAberto] = useState(false);

    // Estado para controlar quais pedidos estão expandidos (guarda os IDs dos pedidos)
    const [pedidosExpandidos, setPedidosExpandidos] = useState<{ [key: string]: boolean }>({});

    // Campos do cabeçalho da compra
    const [fornecedor, setFornecedor] = useState("");
    const [observacao, setObservacao] = useState("");

    // Carrinho de itens da compra
    const [itensCompra, setItensCompra] = useState<Array<{
        insumoId: string;
        dsNomeInsumo: string;
        dsUnidadeEstoque: string;
        qtdComprada: number;
        unidadeComprada: string;
        fatorConversao: number;
        quantidadeTotalEstoque: number;
        valorTotalItem: string;
        valorUnitarioCalculado: string;
    }>>([]);

    // Campos temporários para adicionar/editar um item na lista de compra
    const [insumoSelecionadoId, setInsumoSelecionadoId] = useState("");
    const [qtdCompradaTemp, setQtdCompradaTemp] = useState("1");
    const [unidadeCompradaTemp, setUnidadeCompradaTemp] = useState("pct");
    const [fatorConversaoTemp, setFatorConversaoTemp] = useState("1");
    const [valorTotalItemTemp, setValorTotalItemTemp] = useState("");

    // Estado para controlar qual tooltip/ajuda está visível
    const [ajudaAtiva, setAjudaAtiva] = useState<string | null>(null);

    const [editandoIndex, setEditandoIndex] = useState<number | null>(null);

    useEffect(() => {
        if (!uid) return;

        const qPedidos = query(collection(db, "lojistas", uid, "compras_pedidos"), orderBy("dataCompra", "desc"));
        const unsubPedidos = onSnapshot(qPedidos, (snap) => {
            setPedidos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const qInsumos = query(collection(db, "lojistas", uid, "insumos_composicao"), orderBy("dsNomeInsumo", "asc"));
        const unsubInsumos = onSnapshot(qInsumos, (snap) => {
            setInsumosLista(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubPedidos();
            unsubInsumos();
        };
    }, [uid]);

    const limparFormulario = () => {
        setFornecedor("");
        setObservacao("");
        setItensCompra([]);
        setInsumoSelecionadoId("");
        setQtdCompradaTemp("1");
        setUnidadeCompradaTemp("pct");
        setFatorConversaoTemp("1");
        setValorTotalItemTemp("");
        setEditandoIndex(null);
        setModalAberto(false);
        setAjudaAtiva(null);
    };

    const converterParaNumeroPuro = (valorFormatado: string): number => {
        if (!valorFormatado) return 0;
        const limpo = valorFormatado.replace(/\./g, "").replace(",", ".");
        const num = parseFloat(limpo);
        return isNaN(num) ? 0 : num;
    };

    const insumoAtualObj = insumosLista.find(i => i.id === insumoSelecionadoId);
    const unidadeEstoqueAtual = insumoAtualObj?.dsUnidadeConsumoInsumo || insumoAtualObj?.dsUnidadeMedida || insumoAtualObj?.unidadeMedida || "un";

    // 💡 INTEGRAÇÃO INTELIGENTE DO UOM HELPER:
    // Sempre que o insumo atual ou a unidade comprada mudarem, verificamos se o helper 
    // consegue sugerir a conversão automática (ex: comprou 1 kg, estoque em g -> fator 1000).
    useEffect(() => {
        if (insumoAtualObj && unidadeCompradaTemp) {
            // Testamos converter 1 unidade da embalagem comprada para a unidade de estoque
            const fatorSugerido = converterUnidade(1, unidadeCompradaTemp, unidadeEstoqueAtual);

            // Se o helper retornou um valor diferente de 1 ou se pertencem à mesma categoria de medida, atualizamos o fator
            if (fatorSugerido !== 1) {
                setFatorConversaoTemp(String(fatorSugerido));
            }
        }
    }, [insumoSelecionadoId, unidadeCompradaTemp]);

    // Cálculos de conversão em tempo real no formulário
    const qtdCompradaNum = parseFloat(qtdCompradaTemp.replace(",", ".")) || 0;
    const fatorConversaoNum = parseFloat(fatorConversaoTemp.replace(",", ".")) || 1;
    const qtdTotalEstoqueCalculada = qtdCompradaNum * fatorConversaoNum;

    const totalItemTempNum = converterParaNumeroPuro(valorTotalItemTemp);
    const unitarioCalculadoTemp = (qtdTotalEstoqueCalculada > 0 && totalItemTempNum > 0) ? (totalItemTempNum / qtdTotalEstoqueCalculada) : 0;

    const incluirOuAtualizarItemNaLista = () => {
        if (!insumoSelecionadoId) {
            alert("Selecione um insumo.");
            return;
        }

        if (qtdCompradaNum <= 0 || fatorConversaoNum <= 0 || totalItemTempNum <= 0) {
            alert("Informe quantidades válidas e o valor total pago.");
            return;
        }

        if (!insumoAtualObj) return;

        const novoItem = {
            insumoId: insumoAtualObj.id,
            dsNomeInsumo: insumoAtualObj.dsNomeInsumo || insumoAtualObj.nome || "",
            dsUnidadeEstoque: unidadeEstoqueAtual,
            qtdComprada: qtdCompradaNum,
            unidadeComprada: unidadeCompradaTemp,
            fatorConversao: fatorConversaoNum,
            quantidadeTotalEstoque: qtdTotalEstoqueCalculada,
            valorTotalItem: String(totalItemTempNum),
            valorUnitarioCalculado: String(unitarioCalculadoTemp)
        };

        if (editandoIndex !== null) {
            setItensCompra(prev => prev.map((item, idx) => idx === editandoIndex ? novoItem : item));
            setEditandoIndex(null);
        } else {
            setItensCompra(prev => [...prev, novoItem]);
        }

        setInsumoSelecionadoId("");
        setQtdCompradaTemp("1");
        setUnidadeCompradaTemp("pct");
        setFatorConversaoTemp("1");
        setValorTotalItemTemp("");
    };

    const iniciarEdicaoItem = (index: number) => {
        const item = itensCompra[index];
        setInsumoSelecionadoId(item.insumoId);
        setQtdCompradaTemp(String(item.qtdComprada));
        setUnidadeCompradaTemp(item.unidadeComprada || "pct");
        setFatorConversaoTemp(String(item.fatorConversao));

        const centavos = Math.round(Number(item.valorTotalItem) * 100).toString();
        setValorTotalItemTemp(aplicarMascara(centavos, "dinheiro"));

        setEditandoIndex(index);
    };

    const removerItemDaLista = (index: number) => {
        setItensCompra(prev => prev.filter((_, i) => i !== index));
        if (editandoIndex === index) {
            setEditandoIndex(null);
            setInsumoSelecionadoId("");
            setQtdCompradaTemp("1");
            setUnidadeCompradaTemp("pct");
            setFatorConversaoTemp("1");
            setValorTotalItemTemp("");
        }
    };

    const valorTotalGeral = itensCompra.reduce((acc, item) => {
        return acc + Number(item.valorTotalItem);
    }, 0);

    const alternarExpandirPedido = (pedidoId: string) => {
        setPedidosExpandidos(prev => ({
            ...prev,
            [pedidoId]: !prev[pedidoId]
        }));
    };

    const finalizarCompra = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uid) return;

        if (itensCompra.length === 0) {
            alert("Adicione pelo menos um item na lista de compras.");
            return;
        }

        try {
            const dataCompraIso = new Date().toISOString();

            const contadorRef = doc(db, "lojistas", uid, "configuracoes", "contador_pedidos");
            let proximoNumero = 1;

            await runTransaction(db, async (transaction) => {
                const contadorDoc = await transaction.get(contadorRef);
                if (contadorDoc.exists()) {
                    proximoNumero = (contadorDoc.data().ultimoPedido || 0) + 1;
                }
                transaction.set(contadorRef, { ultimoPedido: proximoNumero }, { merge: true });
            });

            const numeroPedidoFormatado = String(proximoNumero).padStart(4, '0');

            const novoPedidoRef = doc(collection(db, "lojistas", uid, "compras_pedidos"));
            await setDoc(novoPedidoRef, {
                numeroPedido: numeroPedidoFormatado,
                fornecedor: fornecedor.trim() || "Fornecedor Geral",
                observacao: observacao.trim(),
                valorTotalGeral: valorTotalGeral,
                quantidadeItens: itensCompra.length,
                itens: itensCompra,
                dataCompra: dataCompraIso
            });

            for (const item of itensCompra) {
                const qtdEstoqueFinal = Number(item.quantidadeTotalEstoque);
                const valorTotalItem = Number(item.valorTotalItem);
                const custoUnitarioNovaCompra = Number(item.valorUnitarioCalculado);

                const novaCompraRef = doc(collection(db, "lojistas", uid, "compras_insumos"));
                await setDoc(novaCompraRef, {
                    pedidoId: novoPedidoRef.id,
                    numeroPedido: numeroPedidoFormatado,
                    insumoId: item.insumoId,
                    fornecedor: fornecedor.trim() || "Fornecedor Geral",
                    observacao: observacao.trim(),
                    qtdComprada: item.qtdComprada,
                    unidadeComprada: item.unidadeComprada,
                    fatorConversao: item.fatorConversao,
                    quantidadeTotalEstoqueAdicionada: qtdEstoqueFinal,
                    valorTotalPago: valorTotalItem,
                    custoUnitarioCalculado: custoUnitarioNovaCompra,
                    dataCompra: dataCompraIso
                });

                // Custo Médio Ponderado (CMP)
                const insumoRef = doc(db, "lojistas", uid, "insumos_composicao", item.insumoId);
                const insumoDocSnap = await getDoc(insumoRef);
                const dadosAtuais = insumoDocSnap.exists() ? insumoDocSnap.data() : {};

                const estoqueVelho = Number(dadosAtuais.nrEstoqueAtualInsumo ?? dadosAtuais.nrEstoqueAtual ?? dadosAtuais.estoqueAtual ?? 0);
                const custoVelho = Number(dadosAtuais.vlCustoUnitarioInsumo ?? dadosAtuais.vlCustoUnitario ?? dadosAtuais.custoUnitario ?? 0);

                const valorTotalVelho = estoqueVelho * custoVelho;
                const estoqueTotalNovo = estoqueVelho + qtdEstoqueFinal;
                const valorTotalGeralEstoque = valorTotalVelho + valorTotalItem;

                // Evita divisão por zero
                const novoCustoUnitarioMedio = estoqueTotalNovo > 0 ? (valorTotalGeralEstoque / estoqueTotalNovo) : custoUnitarioNovaCompra;

                await updateDoc(insumoRef, {
                    nrEstoqueAtualInsumo: estoqueTotalNovo,
                    vlCustoUnitarioInsumo: Number(novoCustoUnitarioMedio.toFixed(4)),
                    updatedAt: dataCompraIso
                });
            }

            limparFormulario();
            alert(`Pedido #${numeroPedidoFormatado} finalizado, estoque fracionado e custos atualizados por Custo Médio Ponderado com sucesso!`);
        } catch (error: any) {
            alert("Erro ao finalizar compra: " + error.message);
        }
    };

    return (
        <div translate="no" style={{ padding: '0px', fontFamily: 'system-ui, sans-serif', backgroundColor: theme.bgApp, color: theme.textMain, minHeight: '100vh', boxSizing: 'border-box' }}>

            {/* Cabeçalho */}
            <div style={{ background: theme.bgApp, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '24px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 800 }}>🛒 Histórico de Compras & Notas</h2>
                        <p style={{ fontSize: '12px', color: theme.textSec, margin: '4px 0 0 0' }}>Lance notas de compras em embalagens comerciais para atualizar o estoque fracionado automaticamente.</p>
                    </div>
                    <button
                        onClick={() => { limparFormulario(); setModalAberto(true); }}
                        style={{ backgroundColor: theme.primary, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                    >
                        <FiPlus size={16} /> Nova Compra / Nota
                    </button>
                </div>
            </div>

            {/* Container da Tabela de Pedidos */}
            <div style={{ background: theme.bgApp, borderRadius: '12px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: theme.bgCard, borderBottom: `1px solid ${theme.border}`, color: theme.textSec }}>
                                <th style={{ padding: '14px 16px', width: '50px' }}></th>
                                <th style={{ padding: '14px 16px' }}>Data</th>
                                <th style={{ padding: '14px 16px' }}>Pedido</th>
                                <th style={{ padding: '14px 16px' }}>Fornecedor</th>
                                <th style={{ padding: '14px 16px' }}>Qtd de Itens</th>
                                <th style={{ padding: '14px 16px' }}>Observação / NF</th>
                                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Valor Total Geral</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pedidos.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '50px', color: theme.textSec }}>
                                        Nenhum pedido de compra registrado. 📦
                                    </td>
                                </tr>
                            ) : (
                                pedidos.map((pedido) => {
                                    const estaExpandido = !!pedidosExpandidos[pedido.id];

                                    return (
                                        <React.Fragment key={pedido.id}>
                                            <tr
                                                onClick={() => alternarExpandirPedido(pedido.id)}
                                                style={{ borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', background: estaExpandido ? theme.bgCard : 'transparent', transition: 'background 0.2s' }}
                                            >
                                                <td style={{ padding: '14px 16px', textAlign: 'center', color: theme.primary }}>
                                                    {estaExpandido ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                                                </td>
                                                <td style={{ padding: '14px 16px', color: theme.textSec }}>
                                                    {new Date(pedido.dataCompra).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td style={{ padding: '14px 16px', fontWeight: 'bold', color: theme.primary }}>
                                                    #{pedido.numeroPedido || '----'}
                                                </td>
                                                <td style={{ padding: '14px 16px', fontWeight: 'bold' }}>
                                                    {pedido.fornecedor}
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    {pedido.quantidadeItens} {pedido.quantidadeItens === 1 ? 'item' : 'itens'}
                                                </td>
                                                <td style={{ padding: '14px 16px', color: theme.textSec }}>
                                                    {pedido.observacao || '-'}
                                                </td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', color: '#10b981', fontWeight: 'bold' }}>
                                                    R$ {Number(pedido.valorTotalGeral).toFixed(2).replace('.', ',')}
                                                </td>
                                            </tr>

                                            {estaExpandido && (
                                                <tr style={{ background: theme.bgCard, borderBottom: `1px solid ${theme.border}` }}>
                                                    <td colSpan={7} style={{ padding: '16px 24px' }}>
                                                        <div style={{ background: theme.bgApp, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '16px' }}>
                                                            <h4 style={{ fontSize: '13px', margin: '0 0 12px 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <FiShoppingCart size={14} /> Detalhes dos Itens do Pedido #{pedido.numeroPedido}
                                                            </h4>
                                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                                <thead>
                                                                    <tr style={{ borderBottom: `1px solid ${theme.border}`, color: theme.textSec, background: theme.bgCard }}>
                                                                        <th style={{ padding: '10px', textAlign: 'left' }}>Insumo</th>
                                                                        <th style={{ padding: '10px', textAlign: 'left' }}>Compra Realizada</th>
                                                                        <th style={{ padding: '10px', textAlign: 'left' }}>Entrada no Estoque</th>
                                                                        <th style={{ padding: '10px', textAlign: 'right' }}>Total Pago</th>
                                                                        <th style={{ padding: '10px', textAlign: 'right' }}>Custo Unitário Real</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {pedido.itens?.map((item: any, idx: number) => (
                                                                        <tr key={idx} style={{ borderBottom: `1px solid ${theme.border}` }}>
                                                                            <td style={{ padding: '10px', fontWeight: 'bold' }}>{item.dsNomeInsumo}</td>
                                                                            <td style={{ padding: '10px' }}>{item.qtdComprada} {item.unidadeComprada || 'pct'} (Cada contendo {item.fatorConversao} {item.dsUnidadeEstoque})</td>
                                                                            <td style={{ padding: '10px', fontWeight: 'bold', color: theme.primary }}>+ {item.quantidadeTotalEstoque} {item.dsUnidadeEstoque}</td>
                                                                            <td style={{ padding: '10px', textAlign: 'right', color: '#10b981', fontWeight: 'bold' }}>
                                                                                R$ {Number(item.valorTotalItem).toFixed(2).replace('.', ',')}
                                                                            </td>
                                                                            <td style={{ padding: '10px', textAlign: 'right', color: theme.primary, fontWeight: '600' }}>
                                                                                R$ {Number(item.valorUnitarioCalculado).toFixed(4).replace('.', ',')} / {item.dsUnidadeEstoque}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
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

            {/* MODAL DE COMPRAS */}
            {modalAberto && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '15px', backdropFilter: 'blur(2px)' }}>
                    <div style={{ background: theme.bgApp, color: theme.textMain, padding: '28px', borderRadius: '12px', width: '100%', maxWidth: '1100px', border: `1px solid ${theme.border}`, maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', margin: 0, fontWeight: 800 }}>🛒 Lançar Compra / Nota de Insumos</h3>
                            <button onClick={limparFormulario} style={{ background: 'transparent', border: 'none', color: theme.textSec, cursor: 'pointer' }}><FiX size={22} /></button>
                        </div>

                        <form onSubmit={finalizarCompra} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fornecedor</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Embalagens Ltda..."
                                        value={fornecedor}
                                        onChange={(e) => setFornecedor(e.target.value)}
                                        style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.textMain, fontSize: '13px', outline: 'none' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Observação / NF</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Nota Fiscal #1234"
                                        value={observacao}
                                        onChange={(e) => setObservacao(e.target.value)}
                                        style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.textMain, fontSize: '13px', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <hr style={{ border: `0.5px solid ${theme.border}`, margin: '5px 0' }} />

                            <div style={{ background: theme.bgCard, padding: '18px', borderRadius: '10px', border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{ fontSize: '13px', margin: 0, fontWeight: 'bold' }}>
                                        {editandoIndex !== null ? "✏️ Editando Item no Pedido" : "Adicionar Insumos ao Pedido"}
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => setAjudaAtiva(ajudaAtiva === 'campos' ? null : 'campos')}
                                        style={{ background: 'transparent', border: 'none', color: theme.primary, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: '600' }}
                                    >
                                        <FiHelpCircle size={14} /> {ajudaAtiva === 'campos' ? 'Ocultar Dicas' : 'O que preencher aqui?'}
                                    </button>
                                </div>

                                {ajudaAtiva === 'campos' && (
                                    <div style={{ background: theme.bgApp, border: `1px solid ${theme.primary}`, borderRadius: '8px', padding: '12px 16px', fontSize: '12px', color: theme.textSec, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <strong style={{ color: theme.textMain }}>💡 Como funciona a conversão inteligente de compra:</strong>
                                        <span>• <strong>Insumo Selecionado:</strong> O sistema puxa automaticamente se o controle dele é feito em metros, unidades, gramas ou mililitros.</span>
                                        <span>• <strong>Qtd Comprada + Unidade:</strong> Quantos pacotes, caixas, rolos ou unidades comerciais você comprou (ex: <code>1</code> rolo).</span>
                                        <span>• <strong>Conteúdo / Fator:</strong> Quantas unidades da <strong>unidade base</strong> cada pacote/rolo possui (o helper sugere automaticamente se compatível). O sistema soma direto no estoque!</span>
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Insumo Cadastrado</label>
                                    <select
                                        value={insumoSelecionadoId}
                                        onChange={(e) => setInsumoSelecionadoId(e.target.value)}
                                        style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgApp, color: theme.textMain, fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                                    >
                                        <option value="">Selecione o insumo...</option>
                                        {insumosLista.map(ins => {
                                            const nomeOpcao = ins.dsNomeInsumo || ins.nome || "";
                                            const unidadeOpcao = ins.dsUnidadeConsumoInsumo || ins.dsUnidadeMedida || ins.unidadeMedida || "un";
                                            return (
                                                <option key={ins.id} value={ins.id}>{nomeOpcao} (Estoque controlado em: {unidadeOpcao})</option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '90px 155px 1fr 150px 1fr 130px', gap: '12px', alignItems: 'flex-end' }}>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Qtd</label>
                                        <input
                                            type="number"
                                            step="any"
                                            placeholder="Ex: 1"
                                            value={qtdCompradaTemp}
                                            onChange={(e) => setQtdCompradaTemp(e.target.value)}
                                            style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgApp, color: theme.textMain, fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Embalagem</label>
                                        <select
                                            value={unidadeCompradaTemp}
                                            onChange={(e) => setUnidadeCompradaTemp(e.target.value)}
                                            style={{ padding: '10px 10px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgApp, color: theme.textMain, fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                                        >
                                            <option value="pct">pct (Pacote)</option>
                                            <option value="cx">cx (Caixa)</option>
                                            <option value="rolo">rolo</option>
                                            <option value="kg">kg (Quilo)</option>
                                            <option value="g">g (Grama)</option>
                                            <option value="L">L (Litro)</option>
                                            <option value="ml">ml (Mililitro)</option>
                                            <option value="m">m (Metro)</option>
                                            <option value="cm">cm (Centímetro)</option>
                                            <option value="fardo">fardo</option>
                                            <option value="lata">lata</option>
                                            <option value="galao">galão</option>
                                            <option value="un">un (Unidade)</option>
                                        </select>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Conteúdo ({unidadeEstoqueAtual})</label>
                                        <input
                                            type="number"
                                            step="any"
                                            placeholder={`Ex: 50`}
                                            value={fatorConversaoTemp}
                                            onChange={(e) => setFatorConversaoTemp(e.target.value)}
                                            style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgApp, color: theme.textMain, fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor Total (R$)</label>
                                        <input
                                            type="text"
                                            placeholder="0,00"
                                            value={valorTotalItemTemp}
                                            onChange={(e) => setValorTotalItemTemp(aplicarMascara(e.target.value, "dinheiro"))}
                                            style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgApp, color: theme.textMain, fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Custo por {unidadeEstoqueAtual}</label>
                                        <div style={{ padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgApp, color: theme.primary, fontWeight: 'bold', fontSize: '12px', boxSizing: 'border-box', height: '41px', display: 'flex', alignItems: 'center' }}>
                                            {unitarioCalculadoTemp > 0 ? `R$ ${unitarioCalculadoTemp.toFixed(4).replace('.', ',')}` : 'R$ 0,00'}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={incluirOuAtualizarItemNaLista}
                                        style={{ background: editandoIndex !== null ? '#f59e0b' : theme.primary, color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', height: '41px', boxSizing: 'border-box', whiteSpace: 'nowrap' }}
                                    >
                                        {editandoIndex !== null ? "Salvar Item" : "Incluir Item"}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h4 style={{ fontSize: '13px', margin: '0 0 8px 0', fontWeight: 'bold' }}>Itens Selecionados no Pedido:</h4>
                                {itensCompra.length === 0 ? (
                                    <p style={{ fontSize: '12px', color: theme.textSec, fontStyle: 'italic', margin: 0 }}>Nenhum item incluído ainda.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                                        {itensCompra.map((item, index) => {
                                            const estaEditandoEste = editandoIndex === index;
                                            return (
                                                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: estaEditandoEste ? theme.bgApp : theme.bgCard, padding: '10px 14px', borderRadius: '8px', border: `1px solid ${estaEditandoEste ? '#f59e0b' : theme.border}`, fontSize: '13px' }}>
                                                    <div>
                                                        <strong style={{ color: theme.textMain }}>{item.dsNomeInsumo}</strong>
                                                        <span style={{ color: theme.textSec, marginLeft: '8px' }}>
                                                            ({item.qtdComprada} {item.unidadeComprada} c/ {item.fatorConversao} {item.dsUnidadeEstoque} = <strong>+{item.quantidadeTotalEstoque} {item.dsUnidadeEstoque}</strong> | Unit: R$ {Number(item.valorUnitarioCalculado).toFixed(4).replace('.', ',')})
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <span style={{ fontWeight: 'bold', color: '#10b981' }}>R$ {Number(item.valorTotalItem).toFixed(2).replace('.', ',')}</span>
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            <button type="button" onClick={() => iniciarEdicaoItem(index)} style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: 'none', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }} title="Editar item">
                                                                <FiEdit2 size={13} />
                                                            </button>
                                                            <button type="button" onClick={() => removerItemDaLista(index)} style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: 'none', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }} title="Excluir item">
                                                                <FiTrash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: theme.bgCard, padding: '14px 18px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Valor Total Geral do Pedido:</span>
                                <span style={{ fontSize: '18px', fontWeight: '800', color: '#10b981' }}>
                                    R$ {valorTotalGeral.toFixed(2).replace('.', ',')}
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={limparFormulario} style={{ background: 'transparent', color: theme.textSec, border: `1px solid ${theme.border}`, padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                                <button type="submit" style={{ background: theme.primary, color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>Salvar Pedido e Atualizar Estoque</button>
                            </div>

                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}