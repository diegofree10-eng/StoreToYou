// app/admin/estoque/_components/ModalCriarEmbalagens.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, updateDoc } from "firebase/firestore";
import { FiX, FiSearch, FiTrash2, FiPlus, FiHelpCircle, FiDollarSign, FiEdit2, FiSettings } from "react-icons/fi";
import { useTheme } from "@/context/ThemeContext";
import { aplicarMascara } from "@/utils/formatters"; // <-- Importando sua função de máscara existente

interface ModalCriarEmbalagensProps {
    uid: string;
    modalAberto: boolean;
    editandoId: string | null;
    embalagemParaEditar?: any;
    insumosDisponiveis: any[];
    onClose: () => void;
}

export function ModalCriarEmbalagens({
    uid,
    modalAberto,
    editandoId,
    embalagemParaEditar,
    insumosDisponiveis,
    onClose
}: ModalCriarEmbalagensProps) {
    const { theme, isModoNoturno } = useTheme();

    // Campos do Formulário / Modal
    const [dsNomeEmbalagem, setDsNomeEmbalagem] = useState("");
    const [dsTipoEmbalagem, setDsTipoEmbalagem] = useState("envelope_seguranca");
    const [dsUnidadeMedida, setDsUnidadeMedida] = useState("unidade");

    // 🏷️ Estados para customización, adição, edição e exclusão de tipos de embalagem
    const [tiposEmbalagemPersonalizados, setTiposEmbalagemPersonalizados] = useState<string[]>([
        "envelope_seguranca", 
        "caixa_papelao", 
        "sacola", 
        "lata", 
        "tubete"
    ]);
    const [modalNovoTipoAberto, setModalNovoTipoAberto] = useState(false);
    const [modalGerenciarTiposAberto, setModalGerenciarTiposAberto] = useState(false);
    const [novoTipoInput, setNovoTipoInput] = useState("");
    const [tipoSendoEditado, setTipoSendoEditado] = useState<string | null>(null);
    const [valorEdicaoTipo, setValorEdicaoTipo] = useState("");
    
    // Dimensões e Cubagem
    const [nrLarguraMaxInsumo, setNrLarguraMaxInsumo] = useState("");
    const [nrComprimentoMaxInsumo, setNrComprimentoMaxInsumo] = useState("");
    const [nrAlturaMaxInsumo, setNrAlturaMaxInsumo] = useState("");
    const [mostrarAjudaDimensoes, setMostrarAjudaDimensoes] = useState(false);

    const [nrEstoqueAtualEmbalagem, setNrEstoqueAtualEmbalagem] = useState("");
    const [nrEstoqueMinimoEmbalagem, setNrEstoqueMinimoEmbalagem] = useState("10");
    const [isComposicaoEmbalagem, setIsComposicaoEmbalagem] = useState(true);

    // Estado para Outros Custos Avulsos (Armazenado formatado via máscara)
    const [vlOutrosCustosEmbalagem, setVlOutrosCustosEmbalagem] = useState("");

    // Lista de insumos vinculados
    const [itensComposicao, setItensComposicao] = useState<any[]>([]);
    
    // Estados para o fluxo de seleção, quantidade e inserção do insumo
    const [termoBuscaInsumo, setTermoBuscaInsumo] = useState("");
    const [insumoSelecionado, setInsumoSelecionado] = useState<any | null>(null);
    const [quantidadeInsumoAdd, setQuantidadeInsumoAdd] = useState("1");
    const [mostrarDropdownBusca, setMostrarDropdownBusca] = useState(false);

    // Função auxiliar para converter o valor formatado (ex: "1.500,50") em número puro para cálculos e Firebase
    const parseMoedaParaNumero = (valorStr: string) => {
        if (!valorStr) return 0;
        const limpo = String(valorStr).replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
        const num = parseFloat(limpo);
        return isNaN(num) ? 0 : num;
    };

    // Sincroniza os dados reais do Firestore sempre que o modal abre para edição ou criação
    useEffect(() => {
        if (modalAberto) {
            if (editandoId && embalagemParaEditar) {
                setDsNomeEmbalagem(embalagemParaEditar.dsNomeEmbalagem || embalagemParaEditar.nome || "");
                
                const tipoSalvo = embalagemParaEditar.dsTipoEmbalagem || "envelope_seguranca";
                if (!tiposEmbalagemPersonalizados.includes(tipoSalvo)) {
                    setTiposEmbalagemPersonalizados(prev => [...prev, tipoSalvo]);
                }
                setDsTipoEmbalagem(tipoSalvo);

                setDsUnidadeMedida(embalagemParaEditar.dsUnidadeMedida || embalagemParaEditar.unidade || "unidade");
                
                setNrLarguraMaxInsumo(embalagemParaEditar.nrLarguraMaxInsumo !== undefined ? String(embalagemParaEditar.nrLarguraMaxInsumo) : "");
                setNrComprimentoMaxInsumo(embalagemParaEditar.nrComprimentoMaxInsumo !== undefined ? String(embalagemParaEditar.nrComprimentoMaxInsumo) : "");
                setNrAlturaMaxInsumo(embalagemParaEditar.nrAlturaMaxInsumo !== undefined ? String(embalagemParaEditar.nrAlturaMaxInsumo) : "");

                setNrEstoqueAtualEmbalagem(embalagemParaEditar.nrEstoqueAtualEmbalagem !== undefined ? String(embalagemParaEditar.nrEstoqueAtualEmbalagem) : String(embalagemParaEditar.estoque || ""));
                setNrEstoqueMinimoEmbalagem(embalagemParaEditar.nrEstoqueMinimoEmbalagem !== undefined ? String(embalagemParaEditar.nrEstoqueMinimoEmbalagem) : String(embalagemParaEditar.estoqueMinimo || "10"));
                setIsComposicaoEmbalagem(embalagemParaEditar.isComposicaoEmbalagem ?? embalagemParaEditar.composicaoAtiva ?? true);
                
                // Se houver valor salvo, converte para centavos inteiros e aplica a máscara de dinheiro
                const custoSalvo = Number(embalagemParaEditar.vlOutrosCustosEmbalagem ?? 0);
                if (custoSalvo > 0) {
                    const centavos = Math.round(custoSalvo * 100).toString();
                    setVlOutrosCustosEmbalagem(aplicarMascara(centavos, "dinheiro"));
                } else {
                    setVlOutrosCustosEmbalagem("");
                }

                setItensComposicao(embalagemParaEditar.insumosComposicaoEmbalagem || embalagemParaEditar.itensComposicao || embalagemParaEditar.insumos || []);
            } else {
                // Modo Criação: Limpa todos os campos
                setDsNomeEmbalagem("");
                setDsTipoEmbalagem("envelope_seguranca");
                setDsUnidadeMedida("unidade");
                setNrLarguraMaxInsumo("");
                setNrComprimentoMaxInsumo("");
                setNrAlturaMaxInsumo("");
                setNrEstoqueAtualEmbalagem("");
                setNrEstoqueMinimoEmbalagem("10");
                setIsComposicaoEmbalagem(true);
                setVlOutrosCustosEmbalagem("");
                setItensComposicao([]);
            }
            setTermoBuscaInsumo("");
            setInsumoSelecionado(null);
            setMostrarDropdownBusca(false);
        }
    }, [modalAberto, editandoId, embalagemParaEditar]);

    // Cálculo automático do custo unitário da embalagem (Insumos + Outros Custos Avulsos)
    const custoUnitarioCalculado = useMemo(() => {
        const totalInsumos = itensComposicao.reduce((acc, item) => {
            return acc + (Number(item.custoUnitario || 0) * Number(item.quantidade || 0));
        }, 0);

        const outrosCustosNum = parseMoedaParaNumero(vlOutrosCustosEmbalagem);

        return totalInsumos + outrosCustosNum;
    }, [itensComposicao, vlOutrosCustosEmbalagem]);

    // Cálculo do volume (cubagem) em tempo real
    const volumeCalculadoPreview = useMemo(() => {
        const l = Number(nrLarguraMaxInsumo) || 0;
        const c = Number(nrComprimentoMaxInsumo) || 0;
        const a = Number(nrAlturaMaxInsumo) || 0;
        return l * c * a;
    }, [nrLarguraMaxInsumo, nrComprimentoMaxInsumo, nrAlturaMaxInsumo]);

    // Filtrar insumos no modal de pesquisa
    const insumosFiltradosModal = useMemo(() => {
        if (!termoBuscaInsumo.trim()) return [];
        return insumosDisponiveis.filter(i => 
            i.nome.toLowerCase().includes(termoBuscaInsumo.toLowerCase())
        );
    }, [insumosDisponiveis, termoBuscaInsumo]);

    const selecionarInsumo = (insumo: any) => {
        setInsumoSelecionado(insumo);
        setTermoBuscaInsumo(insumo.nome);
        setMostrarDropdownBusca(false);
    };

    const adicionarInsumoComposicao = () => {
        if (!insumoSelecionado) {
            alert("Selecione um insumo pesquisando e clicando nele.");
            return;
        }

        const qtd = parseFloat(quantidadeInsumoAdd.replace(",", ".")) || 1;
        if (qtd <= 0) {
            alert("Informe uma quantidade válida.");
            return;
        }

        const jaExiste = itensComposicao.find(i => i.insumoId === insumoSelecionado.id);

        if (jaExiste) {
            setItensComposicao(itensComposicao.map(i => 
                i.insumoId === insumoSelecionado.id ? { ...i, quantidade: i.quantidade + qtd } : i
            ));
        } else {
            setItensComposicao([...itensComposicao, {
                insumoId: insumoSelecionado.id,
                nome: insumoSelecionado.nome,
                unidade: insumoSelecionado.unidade,
                custoUnitario: insumoSelecionado.custoUnitario,
                quantidade: qtd
            }]);
        }

        setInsumoSelecionado(null);
        setTermoBuscaInsumo("");
        setQuantidadeInsumoAdd("1");
    };

    const removerInsumoComposicao = (insumoId: string) => {
        setItensComposicao(itensComposicao.filter(i => i.insumoId !== insumoId));
    };

    const salvarEmbalagem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uid) return;

        const estoqueNum = parseFloat(nrEstoqueAtualEmbalagem.replace(",", ".")) || 0;
        const minNum = parseFloat(nrEstoqueMinimoEmbalagem.replace(",", ".")) || 0;
        const larguraNum = Number(nrLarguraMaxInsumo) || 0;
        const comprimentoNum = Number(nrComprimentoMaxInsumo) || 0;
        const alturaNum = Number(nrAlturaMaxInsumo) || 0;
        const volumeFinal = larguraNum * comprimentoNum * alturaNum;
        
        // Salva estritamente como número puro no Firebase (ex: 1.50) para evitar problemas matemáticos
        const outrosCustosNum = parseMoedaParaNumero(vlOutrosCustosEmbalagem);

        if (!dsNomeEmbalagem.trim()) {
            alert("Preencha o nome da embalagem.");
            return;
        }

        try {
            const embalagemData = {
                dsNomeEmbalagem: dsNomeEmbalagem.trim(),
                dsTipoEmbalagem,
                dsUnidadeMedida,
                vlCustoUnitarioEmbalagem: custoUnitarioCalculado,
                vlOutrosCustosEmbalagem: outrosCustosNum,
                nrLarguraMaxInsumo: larguraNum,
                nrComprimentoMaxInsumo: comprimentoNum,
                nrAlturaMaxInsumo: alturaNum,
                nrVolumeMaxInsumo: volumeFinal,
                nrEstoqueAtualEmbalagem: estoqueNum,
                nrEstoqueMinimoEmbalagem: minNum,
                isComposicaoEmbalagem,
                insumosComposicaoEmbalagem: itensComposicao,
                updatedAt: new Date().toISOString()
            };

            if (editandoId) {
                await updateDoc(doc(db, "lojistas", uid, "embalagem", editandoId), embalagemData);
            } else {
                const novoDocRef = doc(collection(db, "lojistas", uid, "embalagem"));
                await setDoc(novoDocRef, {
                    ...embalagemData,
                    createdAt: new Date().toISOString()
                });
            }

            onClose();
        } catch (error: any) {
            alert("Erro ao salvar embalagem: " + error.message);
        }
    };

    if (!modalAberto) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '15px' }}>
            <div style={{ background: theme.bgCard, padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${theme.border}` }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ fontSize: '16px', margin: 0, fontWeight: 800, color: theme.textMain }}>{editandoId ? "✏️ Editar Embalagem" : "📦 Cadastrar Nova Embalagem"}</h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: theme.textSec, cursor: 'pointer' }}><FiX size={20} /></button>
                </div>

                <form onSubmit={salvarEmbalagem} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec }}>Nome da Embalagem / Caixa *</label>
                        <input 
                            type="text" 
                            placeholder="Ex: Embalagem Ecomerce 26x36" 
                            value={dsNomeEmbalagem}
                            onChange={(e) => setDsNomeEmbalagem(e.target.value)}
                            required
                            style={{ padding: '8px 10px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '13px', outline: 'none' }}
                        />
                    </div>

                    {/* SELECT DE TIPO DE EMBALAGEM COM OPÇÕES DE ADICIONAR, EDITAR E EXCLUIR */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec }}>Tipo da Embalagem:</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setModalGerenciarTiposAberto(true)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: theme.textSec,
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                    }}
                                    title="Editar ou excluir tipos existentes"
                                >
                                    <FiSettings size={12} /> Gerenciar Tipos
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModalNovoTipoAberto(true)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: theme.primary,
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                    }}
                                >
                                    <FiPlus size={12} /> Adicionar Novo Tipo
                                </button>
                            </div>
                        </div>
                        <select
                            value={dsTipoEmbalagem}
                            onChange={(e) => setDsTipoEmbalagem(e.target.value)}
                            style={{ padding: '8px 10px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '13px', outline: 'none' }}
                        >
                            {tiposEmbalagemPersonalizados.map((tipo) => {
                                const formatado = tipo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                return (
                                    <option key={tipo} value={tipo}>
                                        📦 {formatado}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* SEÇÃO DE DIMENSÕES MÁXIMAS ÚTEIS E AJUDA */}
                    <div style={{ background: theme.bgApp, padding: '10px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                            <label style={{ fontSize: "11px", fontWeight: "700", color: theme.textSec }}>
                                Dimensões Máximas Úteis (cm):
                            </label>
                            <button
                                type="button"
                                onClick={() => setMostrarAjudaDimensoes(!mostrarAjudaDimensoes)}
                                style={{
                                    background: "none", border: "none", color: theme.primary,
                                    cursor: "pointer", display: "flex", alignItems: "center",
                                    gap: "4px", fontSize: "11px", fontWeight: "600", padding: 0
                                }}
                            >
                                <FiHelpCircle size={13} /> {mostrarAjudaDimensoes ? "Ocultar Ajuda" : "Como preencher?"}
                            </button>
                        </div>

                        {mostrarAjudaDimensoes && (
                            <div style={{
                                backgroundColor: isModoNoturno ? "#1e293b" : "#eff6ff",
                                border: `1px solid ${isModoNoturno ? "#334155" : "#bfdbfe"}`,
                                borderRadius: "6px", padding: "10px", fontSize: "11px",
                                color: isModoNoturno ? "#94a3b8" : "#1e40af", marginBottom: "8px", lineHeight: "1.4"
                            }}>
                                <strong>📦 Como preencher para Sacos e Caixas:</strong>
                                <ul style={{ margin: "4px 0 0 14px", padding: 0 }}>
                                    <li><strong>Largura e Comp.:</strong> Informe as medidas nominais úteis internas da embalagem.</li>
                                    <li><strong>Altura Máx:</strong> Espessura limite de acomodação dos produtos.</li>
                                </ul>
                            </div>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "10px", fontWeight: "700", marginBottom: "3px", color: theme.textSec }}>Largura</label>
                                <input
                                    type="number"
                                    value={nrLarguraMaxInsumo}
                                    onChange={(e) => setNrLarguraMaxInsumo(e.target.value)}
                                    placeholder="22"
                                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '12px', outline: 'none' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "10px", fontWeight: "700", marginBottom: "3px", color: theme.textSec }}>Comp.</label>
                                <input
                                    type="number"
                                    value={nrComprimentoMaxInsumo}
                                    onChange={(e) => setNrComprimentoMaxInsumo(e.target.value)}
                                    placeholder="35"
                                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '12px', outline: 'none' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "10px", fontWeight: "700", marginBottom: "3px", color: theme.textSec }}>Altura Máx</label>
                                <input
                                    type="number"
                                    value={nrAlturaMaxInsumo}
                                    onChange={(e) => setNrAlturaMaxInsumo(e.target.value)}
                                    placeholder="8"
                                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '12px', outline: 'none' }}
                                />
                            </div>
                        </div>

                        <div style={{
                            marginTop: "8px", padding: "6px 10px", borderRadius: "6px",
                            backgroundColor: isModoNoturno ? "#1e293b" : "#f1f5f9",
                            border: `1px dashed ${theme.border}`, display: "flex",
                            justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: theme.textSec
                        }}>
                            <span>📐 Cubagem (Volume Máximo):</span>
                            <strong style={{ color: theme.textMain }}>
                                {volumeCalculadoPreview.toLocaleString('pt-BR')} cm³ ({(volumeCalculadoPreview / 1000).toFixed(2)} L)
                            </strong>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec }}>Unidade</label>
                            <select 
                                value={dsUnidadeMedida}
                                onChange={(e) => setDsUnidadeMedida(e.target.value)}
                                style={{ padding: '8px 10px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '13px', outline: 'none' }}
                            >
                                <option value="unidade">Unidade</option>
                                <option value="metro">Metro</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec }}>Estoque Atual</label>
                            <input 
                                type="number" 
                                placeholder="50" 
                                value={nrEstoqueAtualEmbalagem}
                                onChange={(e) => setNrEstoqueAtualEmbalagem(e.target.value)}
                                style={{ padding: '8px 10px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '13px', outline: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec }}>Estoque Mínimo</label>
                            <input 
                                type="number" 
                                placeholder="10" 
                                value={nrEstoqueMinimoEmbalagem}
                                onChange={(e) => setNrEstoqueMinimoEmbalagem(e.target.value)}
                                style={{ padding: '8px 10px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '13px', outline: 'none' }}
                            />
                        </div>
                    </div>

                    {/* SEÇÃO DE COMPOSIÇÃO POR INSUMOS */}
                    <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '10px', marginTop: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textMain, display: 'block', marginBottom: '6px' }}>
                            🔗 Insumos que compõem esta Embalagem:
                        </label>

                        {/* LINHA DE BUSCA, QUANTIDADE E BOTÃO ADICIONAR */}
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, background: theme.inputBg, padding: '6px 10px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                                <FiSearch color={theme.textSec} size={14} />
                                <input 
                                    type="text" 
                                    placeholder="Pesquisar insumo para composição..." 
                                    value={termoBuscaInsumo}
                                    onChange={(e) => {
                                        setTermoBuscaInsumo(e.target.value);
                                        setInsumoSelecionado(null);
                                        setMostrarDropdownBusca(true);
                                    }}
                                    onFocus={() => setMostrarDropdownBusca(true)}
                                    style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '12px', color: theme.textMain }}
                                />
                            </div>

                            <input 
                                type="number" 
                                placeholder="Qtd" 
                                value={quantidadeInsumoAdd}
                                onChange={(e) => setQuantidadeInsumoAdd(e.target.value)}
                                style={{ width: '65px', padding: '6px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '12px', textAlign: 'center', outline: 'none' }}
                            />

                            <button 
                                type="button" 
                                onClick={adicionarInsumoComposicao}
                                style={{ background: theme.primary, color: '#fff', border: 'none', padding: '0 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                            >
                                <FiPlus size={14} /> Adicionar
                            </button>

                            {/* DROPDOWN DE RESULTADOS DA BUSCA */}
                            {mostrarDropdownBusca && insumosFiltradosModal.length > 0 && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: '135px', background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '6px', maxHeight: '140px', overflowY: 'auto', zIndex: 1200, marginTop: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                    {insumosFiltradosModal.map(insumo => (
                                        <div 
                                            key={insumo.id} 
                                            onClick={() => selecionarInsumo(insumo)}
                                            style={{ padding: '8px 12px', borderBottom: `1px solid ${theme.border}`, fontSize: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                        >
                                            <span style={{ fontWeight: 'bold', color: theme.textMain }}>{insumo.nome}</span>
                                            <span style={{ color: theme.textSec, fontSize: '11px' }}>R$ {Number(insumo.custoUnitario).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* LISTA DE INSUMOS JÁ ADICIONADOS */}
                        <div style={{ background: theme.bgApp, borderRadius: '6px', border: `1px solid ${theme.border}`, padding: '8px', minHeight: '60px', maxHeight: '140px', overflowY: 'auto' }}>
                            {itensComposicao.length === 0 ? (
                                <p style={{ fontSize: '11px', color: theme.textSec, textAlign: 'center', margin: '15px 0' }}>Nenhum insumo adicionado na composição.</p>
                            ) : (
                                itensComposicao.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: `1px solid ${theme.border}`, fontSize: '12px' }}>
                                        <div>
                                            <span style={{ fontWeight: 'bold', color: theme.textMain }}>{item.nome}</span>
                                            <span style={{ color: theme.textSec, marginLeft: '6px' }}>({item.quantidade}x R$ {Number(item.custoUnitario).toFixed(2)})</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontWeight: 'bold', color: theme.primary }}>
                                                R$ {(item.quantidade * item.custoUnitario).toFixed(2).replace('.', ',')}
                                            </span>
                                            <button type="button" onClick={() => removerInsumoComposicao(item.insumoId)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                </div>
                              ))
                            )}
                        </div>

                        {/* CAMPO DE OUTROS CUSTOS USANDO A APLICARMASCARA ('dinheiro') */}
                        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: theme.bgApp, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <FiDollarSign size={15} color={theme.primary} />
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textMain }}>Outros Custos / Gastos Avulsos</span>
                                      <span style={{ fontSize: '9px', color: theme.textSec }}>Ex: Pedaço de durex, etiqueta extra, impressão...</span>
                                  </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input 
                                  type="text"
                                  placeholder="0,00"
                                  value={vlOutrosCustosEmbalagem}
                                  onChange={(e) => setVlOutrosCustosEmbalagem(aplicarMascara(e.target.value, "dinheiro"))}
                                  style={{ width: '100px', padding: '5px 8px', borderRadius: '4px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '12px', fontWeight: 'bold', outline: 'none', textAlign: 'right' }}
                            />
                        </div>
                      </div>

                        {/* EXIBIÇÃO DO CUSTO UNITÁRIO CALCULADO */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', background: theme.bgApp, padding: '10px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textSec }}>CUSTO UNITÁRIO TOTAL CALCULADO:</span>
                          <span style={{ fontSize: '16px', fontWeight: '800', color: theme.primary }}>
                              R$ {custoUnitarioCalculado.toFixed(2).replace('.', ',')}
                          </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                    <button type="button" onClick={onClose} style={{ background: theme.border, color: theme.textMain, border: 'none', padding: '9px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                    <button type="submit" style={{ background: theme.primary, color: '#fff', border: 'none', padding: '9px 18px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Salvar Embalagem</button>
              </div>

              </form>
            </div>

          {/* 🏷️ MINI MODAL PARA ADICIONAR NOVO TIPO DE EMBALAGEM */}
          {modalNovoTipoAberto && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1250 }}>
                  <div style={{ background: theme.bgCard, padding: '16px', borderRadius: '8px', width: '320px', border: `1px solid ${theme.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: theme.textMain, fontWeight: 'bold' }}>Novo Tipo de Embalagem</h4>
                      <p style={{ fontSize: '11px', color: theme.textSec, margin: '0 0 10px 0' }}>Digite o nome do novo formato (ex: Sacola, Caixa Kraft, etc.):</p>
                      <input
                          type="text"
                          placeholder="Ex: Sacola Ecológica"
                          value={novoTipoInput}
                          onChange={(e) => setNovoTipoInput(e.target.value)}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '12px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                              type="button"
                              onClick={() => setModalNovoTipoAberto(false)}
                              style={{ background: theme.border, color: theme.textMain, border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                              Cancelar
                          </button>
                          <button
                              type="button"
                              onClick={() => {
                                  if (!novoTipoInput.trim()) return alert("Digite um nome válido.");
                                  const slug = novoTipoInput.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]/g, '');
                                  
                                  if (!tiposEmbalagemPersonalizados.includes(slug)) {
                                      setTiposEmbalagemPersonalizados([...tiposEmbalagemPersonalizados, slug]);
                                  }
                                  setDsTipoEmbalagem(slug);
                                  setNovoTipoInput("");
                                  setModalNovoTipoAberto(false);
                              }}
                              style={{ background: theme.primary, color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                              Adicionar
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {/* ⚙️ MODAL PARA GERENCIAR (EDITAR OU EXCLUIR) TIPOS DE EMBALAGEM */}
          {modalGerenciarTiposAberto && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1250 }}>
                  <div style={{ background: theme.bgCard, padding: '18px', borderRadius: '10px', width: '380px', maxHeight: '80vh', overflowY: 'auto', border: `1px solid ${theme.border}`, boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <h4 style={{ margin: 0, fontSize: '14px', color: theme.textMain, fontWeight: 'bold' }}>Gerenciar Tipos de Embalagem</h4>
                          <button onClick={() => { setModalGerenciarTiposAberto(false); setTipoSendoEditado(null); }} style={{ background: 'transparent', border: 'none', color: theme.textSec, cursor: 'pointer' }}><FiX size={18} /></button>
                      </div>
                      <p style={{ fontSize: '11px', color: theme.textSec, margin: '0 0 12px 0' }}>Edite o nome ou exclua tipos cadastrados:</p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', marginBottom: '14px' }}>
                          {tiposEmbalagemPersonalizados.map((tipo) => {
                              const formatado = tipo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                              const isEditando = tipoSendoEditado === tipo;

                              return (
                                  <div key={tipo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: theme.inputBg, borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                                      {isEditando ? (
                                          <input
                                              type="text"
                                              value={valorEdicaoTipo}
                                              onChange={(e) => setValorEdicaoTipo(e.target.value)}
                                              style={{ flex: 1, padding: '4px 6px', fontSize: '12px', background: theme.bgCard, color: theme.textMain, border: `1px solid ${theme.primary}`, borderRadius: '4px', outline: 'none', marginRight: '6px' }}
                                          />
                                      ) : (
                                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textMain }}>{formatado}</span>
                                      )}

                                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                          {isEditando ? (
                                              <button
                                                  type="button"
                                                  onClick={() => {
                                                      if (!valorEdicaoTipo.trim()) return alert("Digite um nome válido.");
                                                      const novoSlug = valorEdicaoTipo.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]/g, '');
                                                      
                                                      setTiposEmbalagemPersonalizados(prev => prev.map(t => t === tipo ? novoSlug : t));
                                                      if (dsTipoEmbalagem === tipo) setDsTipoEmbalagem(novoSlug);
                                                      setTipoSendoEditado(null);
                                                  }}
                                                  style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                                              >
                                                  Salvar
                                              </button>
                                          ) : (
                                              <button
                                                  type="button"
                                                  onClick={() => {
                                                      setTipoSendoEditado(tipo);
                                                      setValorEdicaoTipo(formatado);
                                                  }}
                                                  style={{ background: 'transparent', border: 'none', color: theme.primary, cursor: 'pointer', padding: '2px' }}
                                                  title="Editar nome"
                                              >
                                                  <FiEdit2 size={14} />
                                              </button>
                                          )}

                                          <button
                                              type="button"
                                              onClick={() => {
                                                  if (tiposEmbalagemPersonalizados.length <= 1) {
                                                      return alert("Você precisa manter pelo menos um tipo de embalagem.");
                                                  }
                                                  if (confirm(`Deseja realmente excluir o tipo "${formatado}"?`)) {
                                                      setTiposEmbalagemPersonalizados(prev => prev.filter(t => t !== tipo));
                                                      if (dsTipoEmbalagem === tipo) {
                                                          setDsTipoEmbalagem(tiposEmbalagemPersonalizados.find(t => t !== tipo) || "");
                                                      }
                                                  }
                                              }}
                                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                                              title="Excluir tipo"
                                          >
                                              <FiTrash2 size={14} />
                                          </button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                              type="button"
                              onClick={() => { setModalGerenciarTiposAberto(false); setTipoSendoEditado(null); }}
                              style={{ background: theme.primary, color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                              Concluir
                          </button>
                      </div>
                  </div>
              </div>
          )}
    </div>
    );
}