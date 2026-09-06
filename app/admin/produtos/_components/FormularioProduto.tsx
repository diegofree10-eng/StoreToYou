// app/admin/produtos/_components/FormularioProduto.tsx
"use client";

import React, { useState } from "react";
import { FiSettings, FiCamera, FiSliders, FiGrid, FiInfo, FiPlus, FiTrash2 } from "react-icons/fi";
import { styles } from "../styles";
import { formatarPeso, formatarMedida } from "@/utils/formatters";

// 🌟 Importando o hook do tema global (ThemeContext)
import { useTheme } from "@/context/ThemeContext";

// ✨ Importando o novo Modal de Cadastro de Insumos
import ModalCadastroInsumos from "./ModalCadastroInsumos";

interface FormularioProdutoProps {
    nome: string;
    setNome: (v: string) => void;
    sku: string;
    setSku: (v: string) => void;
    ean?: string;
    setEan?: (v: string) => void;
    setIsModalSKUOpen: (v: boolean) => void;
    categoria: string;
    setCategoria: (v: string) => void;
    subcategoria: string;
    setSubcategoria: (v: string) => void;
    listaCategorias: any[];
    setShowCatManager: (v: boolean) => void;
    descricao: string;
    setShowDescModal: (v: boolean) => void;
    precoBasico: string;
    setPrecoBasico: (v: string) => void;
    custoUnitario: string;
    setCustoUnitario: (v: string) => void;
    outrosCustos?: string; // ✨ Prop para outros custos
    setOutrosCustos?: (v: string) => void; // ✨ Setter para outros custos
    estoque: string;
    setEstoque: (v: string) => void;
    estoqueMinimo?: string;
    setEstoqueMinimo?: (v: string) => void;
    temVariaveisComPreco: boolean;
    setShowVarModal: (v: boolean) => void;
    setShowReqModal: (v: boolean) => void;
    requisitos: any;
    formatInput: (value: string, setter: (v: string) => void) => void;
    imagens: string[];
    setImagens: React.Dispatch<React.SetStateAction<string[]>>;
    files: File[];
    setFiles: React.Dispatch<React.SetStateAction<File[]>>;
    uploading: boolean;
    setTipoCropAtual: (v: "principal" | "variacao") => void;
    setArquivoParaCortar: (file: File | null) => void;
    tipoProduto?: string;
    setTipoProduto?: (v: string) => void;
    diasProducao?: string;
    setDiasProducao?: (v: string) => void;
    peso?: string;
    setPeso?: (v: string) => void;
    comprimento?: string;
    setComprimento?: (v: string) => void;
    largura?: string;
    setLargura?: (v: string) => void;
    altura?: string;
    setAltura?: (v: string) => void;
    pesosDiferentesPorVariacao?: boolean;
    setPesosDiferentesPorVariacao?: (v: boolean) => void;
    listaInsumos?: any[];
    insumosComposicaoProduto?: any[];
    setInsumosComposicaoProduto?: (v: any[]) => void;
    temInsumosNaGrade?: boolean;
    movimentarEstoque?: boolean;
    setMovimentarEstoque?: (v: boolean) => void;
    movimentarEstoqueComposicao?: boolean;
    setMovimentarEstoqueComposicao?: (v: boolean) => void;
}

export default function FormularioProduto({
    nome, setNome,
    sku, setSku,
    ean = "", setEan = () => { },
    setIsModalSKUOpen,
    categoria, setCategoria,
    subcategoria, setSubcategoria,
    listaCategorias,
    setShowCatManager,
    descricao, setShowDescModal,
    precoBasico, setPrecoBasico,
    custoUnitario, setCustoUnitario,
    outrosCustos = "", // ✨ Recebendo corretamente do componente pai
    setOutrosCustos = () => { }, // ✨ Recebendo setter corretamente do componente pai
    estoque, setEstoque,
    estoqueMinimo = "", setEstoqueMinimo = () => { },
    temVariaveisComPreco,
    setShowVarModal,
    setShowReqModal,
    requisitos,
    formatInput,
    imagens, setImagens,
    files, setFiles,
    uploading,
    setTipoCropAtual,
    setArquivoParaCortar,
    tipoProduto = "Fisico_Sem", setTipoProduto = () => { },
    diasProducao = "", setDiasProducao = () => { },
    peso = "", setPeso = () => { },
    comprimento = "", setComprimento = () => { },
    largura = "", setLargura = () => { },
    altura = "", setAltura = () => { },
    pesosDiferentesPorVariacao = false,
    setPesosDiferentesPorVariacao = () => { },
    listaInsumos = [],
    insumosComposicaoProduto = [],
    setInsumosComposicaoProduto = () => { },
    temInsumosNaGrade = false,
    movimentarEstoque = true,
    setMovimentarEstoque = () => { },
    movimentarEstoqueComposicao = true,
    setMovimentarEstoqueComposicao = () => { }
}: FormularioProdutoProps) {

    const { theme } = useTheme();

    const [indiceArrastado, setIndiceArrastado] = useState<number | null>(null);
    const [isModalInsumosOpen, setIsModalInsumosOpen] = useState(false);

    const totalImagensCount = imagens.length + files.length;
    const bloqueadoPorGradeDeInsumos = temVariaveisComPreco;

    const removerImagemUnificada = (indexGlobal: number) => {
        if (indexGlobal < imagens.length) {
            setImagens(imagens.filter((_, idx) => idx !== indexGlobal));
        } else {
            const fileIndex = indexGlobal - imagens.length;
            setFiles(files.filter((_, idx) => idx !== fileIndex));
        }
    };

    const moverPosicaoImagem = (indexOrigem: number, indexDestino: number) => {
        if (indexDestino < 0 || indexDestino >= totalImagensCount || indexOrigem === indexDestino) return;

        const listaCompleta: { tipo: 'url' | 'file'; valor: string | File }[] = [
            ...imagens.map(url => ({ tipo: 'url' as const, valor: url })),
            ...files.map(file => ({ tipo: 'file' as const, valor: file }))
        ];

        const [itemMovido] = listaCompleta.splice(indexOrigem, 1);
        listaCompleta.splice(indexDestino, 0, itemMovido);

        const novasImagens: string[] = [];
        const novosFiles: File[] = [];

        listaCompleta.forEach(item => {
            if (item.tipo === 'url') novasImagens.push(item.valor as string);
            else novosFiles.push(item.valor as File);
        });

        setImagens(novasImagens);
        setFiles(novosFiles);
    };

    const precisaDeFrete = tipoProduto !== 'digital_download' && tipoProduto !== 'Digital_Personalizado';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', color: theme.textMain }}>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Amaranth:ital,wght@0,400;0,700;1,400;1,700&display=swap');
            `}</style>

            <style jsx>{`
                @media (max-width: 768px) {
                    .imagens-container-mobile {
                        display: grid !important;
                        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                        gap: 6px !important;
                        overflow-x: visible !important;
                        width: 100% !important;
                    }
                    .slot-imagem-mobile {
                        min-width: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        aspect-ratio: 1 / 1 !important;
                    }
                }
                .btn-moderno:hover {
                    filter: brightness(0.95);
                    transform: translateY(-1px);
                }
                .btn-moderno:active {
                    transform: translateY(0);
                }
            `}</style>

            {/* 1. SEÇÃO DE IMAGENS */}
            <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textMain, marginBottom: '8px', display: 'block' }}>
                    Imagens do Produto (A 1ª foto é a Capa — Toque para definir)
                </label>
                <div className="imagens-container-mobile" style={{ display: 'flex', gap: '10px', alignItems: 'center', overflowX: 'auto', paddingBottom: '5px' }}>

                    <div
                        className="slot-imagem-mobile"
                        draggable={totalImagensCount > 0}
                        onDragStart={() => setIndiceArrastado(0)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => {
                            if (indiceArrastado !== null) {
                                moverPosicaoImagem(indiceArrastado, 0);
                                setIndiceArrastado(null);
                            }
                        }}
                        onClick={() => {
                            if (totalImagensCount > 1 && indiceArrastado !== null && indiceArrastado !== 0) {
                                moverPosicaoImagem(indiceArrastado, 0);
                                setIndiceArrastado(null);
                            }
                        }}
                        style={{
                            minWidth: '100px',
                            width: '100px',
                            height: '100px',
                            border: `2px dashed ${theme.border}`,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            background: theme.inputBg,
                            overflow: 'hidden',
                            cursor: totalImagensCount > 0 ? 'pointer' : 'default'
                        }}
                    >
                        {totalImagensCount > 0 ? (
                            <>
                                <img
                                    src={0 < imagens.length ? imagens[0] : URL.createObjectURL(files[0 - imagens.length])}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    alt="Capa"
                                />
                                <div style={{ position: 'absolute', bottom: '2px', left: '2px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '9px', padding: '1px 4px', borderRadius: '3px' }}>
                                    Capa ⭐
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removerImagemUnificada(0);
                                    }}
                                    style={styles.btnDelImg}
                                >
                                    ×
                                </button>
                            </>
                        ) : (
                            <span style={{ fontSize: '11px', color: theme.textSec, textAlign: 'center' }}>Capa Principal</span>
                        )}
                    </div>

                    {[1, 2, 3].map((slotIndex) => {
                        const temImagem = slotIndex < totalImagensCount;
                        let imgSrc = "";
                        if (temImagem) {
                            imgSrc = slotIndex < imagens.length ? imagens[slotIndex] : URL.createObjectURL(files[slotIndex - imagens.length]);
                        }

                        return (
                            <div
                                className="slot-imagem-mobile"
                                key={slotIndex}
                                draggable={temImagem}
                                onDragStart={() => setIndiceArrastado(slotIndex)}
                                onDragOver={e => e.preventDefault()}
                                onDrop={() => {
                                    if (indiceArrastado !== null) {
                                        moverPosicaoImagem(indiceArrastado, slotIndex);
                                        setIndiceArrastado(null);
                                    }
                                }}
                                onClick={() => {
                                    if (temImagem) {
                                        if (indiceArrastado === null) {
                                            setIndiceArrastado(slotIndex);
                                        } else {
                                            moverPosicaoImagem(indiceArrastado, slotIndex);
                                            setIndiceArrastado(null);
                                        }
                                    }
                                }}
                                style={{
                                    minWidth: '70px',
                                    width: '70px',
                                    height: '70px',
                                    border: indiceArrastado === slotIndex ? `2px solid ${theme.primary}` : `1px dashed ${theme.border}`,
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                    background: indiceArrastado === slotIndex ? `${theme.primary}15` : theme.inputBg,
                                    overflow: 'hidden',
                                    cursor: temImagem ? 'pointer' : 'default'
                                }}
                            >
                                {temImagem ? (
                                    <>
                                        <img src={imgSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`Slot ${slotIndex}`} />
                                        {indiceArrastado === slotIndex && (
                                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(37, 99, 235, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 'bold' }}>
                                                Selecionada
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removerImagemUnificada(slotIndex);
                                            }}
                                            style={styles.btnDelImg}
                                        >
                                            ×
                                        </button>
                                    </>
                                ) : (
                                    <span style={{ fontSize: '10px', color: theme.textSec }}>+{slotIndex + 1}</span>
                                )}
                            </div>
                        );
                    })}
                </div>

                <label className="btn-moderno" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    marginTop: '10px',
                    padding: '10px 16px',
                    background: theme.bgCard,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    color: theme.textMain,
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                }}>
                    <FiCamera size={16} color={theme.primary} />
                    <span>{uploading ? "Enviando..." : "Adicionar Fotos"}</span>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                            if (e.target.files && e.target.files[0]) {
                                setTipoCropAtual("principal");
                                setArquivoParaCortar(e.target.files[0]);
                            }
                        }}
                        style={{ display: 'none' }}
                    />
                </label>
            </div>

            <hr style={{ border: '0', borderTop: `1px solid ${theme.border}`, margin: '5px 0' }} />

            {/* 2. INFORMAÇÕES BÁSICAS DO PRODUTO */}
            <div>
                <h3 style={{ ...styles.sideTitle, color: theme.textMain }}>📦 Informações Básicas do Produto</h3>

                <input
                    id="input-nome-produto"
                    style={{ ...styles.input, marginBottom: '10px', background: theme.inputBg, color: theme.textMain, borderColor: theme.border }}
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Nome do Produto *"
                />

                <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                    <select
                        style={{ ...styles.input, marginBottom: 0, flex: 1, background: theme.inputBg, color: theme.textMain, borderColor: theme.border }}
                        value={categoria}
                        onChange={e => { setCategoria(e.target.value); setSubcategoria(""); }}
                    >
                        <option value="">Categoria... *</option>
                        {listaCategorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowCatManager(true)} style={{ ...styles.btnActionSmall, background: theme.bgCard, color: theme.textMain, border: `1px solid ${theme.border}` }}>
                        <FiSettings />
                    </button>
                </div>

                {categoria && listaCategorias.find(c => c.nome === categoria)?.subcategorias?.length > 0 && (
                    <select style={{ ...styles.input, marginBottom: '10px', background: theme.inputBg, color: theme.textMain, borderColor: theme.border }} value={subcategoria} onChange={e => setSubcategoria(e.target.value)}>
                        <option value="">Subcategoria (Opcional)</option>
                        {listaCategorias.find(c => c.nome === categoria).subcategorias.map((sub: string, i: number) => (
                            <option key={i} value={sub}>{sub}</option>
                        ))}
                    </select>
                )}

                <textarea
                    style={{
                        ...styles.textarea,
                        marginBottom: '10px',
                        fontFamily: "'Amaranth', sans-serif",
                        background: theme.inputBg,
                        color: theme.textMain,
                        borderColor: theme.border
                    }}
                    value={descricao}
                    onClick={() => setShowDescModal(true)}
                    readOnly
                    placeholder="Descrição... *"
                />

                <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                    <button
                        type="button"
                        onClick={() => setShowVarModal(true)}
                        className="btn-moderno"
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '10px 12px',
                            background: theme.bgCard,
                            border: `1px solid ${theme.border}`,
                            borderRadius: '8px',
                            color: theme.textMain,
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <FiGrid size={15} color={theme.primary} />
                        <span>{temVariaveisComPreco ? "Editar Variações" : "Variações"}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowReqModal(true)}
                        className="btn-moderno"
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '10px 12px',
                            background: theme.bgCard,
                            border: `1px solid ${theme.border}`,
                            borderRadius: '8px',
                            color: theme.textMain,
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <FiSliders size={15} color="#c026d3" />
                        <span>Personalização ({Object.values(requisitos || {}).filter(Boolean).length})</span>
                    </button>
                </div>
            </div>

            {/* SEÇÃO DE INSUMOS DE COMPOSIÇÃO */}
            {!temVariaveisComPreco && (
                <div style={{ background: theme.bgCard, padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}`, marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase' }}>
                            Insumos de Composição (Baixa no Estoque)
                        </label>
                        <button
                            type="button"
                            onClick={() => setIsModalInsumosOpen(true)}
                            style={{ background: theme.primary, color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <FiPlus size={14} /> Adicionar Insumo
                        </button>
                    </div>

                    {insumosComposicaoProduto.length === 0 ? (
                        <p style={{ fontSize: '12px', color: theme.textSec, margin: 0, fontStyle: 'italic' }}>Nenhum insumo adicionado a este produto.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {insumosComposicaoProduto.map((item, index) => (
                                <div key={item.id || index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: theme.inputBg, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textMain }}>{item.dsNomeInsumo}</span>
                                        <span style={{ fontSize: '10px', color: theme.textSec }}>Consumo: {item.nrQuantidadeConsumida} {item.dsUnidadeConsumoInsumo}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const novaLista = insumosComposicaoProduto.filter((_, i) => i !== index);
                                            setInsumosComposicaoProduto(novaLista);
                                        }}
                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                    >
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* MODAL DE CADASTRO DE INSUMOS */}
            <ModalCadastroInsumos
                isOpen={isModalInsumosOpen}
                onClose={() => setIsModalInsumosOpen(false)}
                listaInsumos={listaInsumos}
                insumosComposicaoProduto={insumosComposicaoProduto}
                setInsumosComposicaoProduto={setInsumosComposicaoProduto}
                setCustoUnitario={setCustoUnitario}
                outrosCustos={outrosCustos}          // ✨ Repassando corretamente
                setOutrosCustos={setOutrosCustos}    // ✨ Repassando corretamente
                formatInput={formatInput}
            />

            {/* 3. TIPO DE PRODUTO E PRAZO DE PRODUÇÃO */}
            <div style={{ background: theme.bgCard, padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}`, marginBottom: '15px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, display: 'block', marginBottom: '6px' }}>
                    Tipo e Comportamento do Produto
                </label>

                <select
                    style={{ ...styles.input, marginBottom: '10px', background: theme.inputBg, color: theme.textMain, borderColor: theme.border }}
                    value={tipoProduto}
                    onChange={e => {
                        const novoTipo = e.target.value;
                        setTipoProduto(novoTipo);
                        if (novoTipo === 'digital_download' || novoTipo === 'Digital_Personalizado') {
                            setPeso("");
                            setComprimento("");
                            setLargura("");
                            setAltura("");
                            setPesosDiferentesPorVariacao(false);
                        }
                    }}
                >
                    <option value="Fisico_Sem">📦 Produtos Físicos / Sem Personalização</option>
                    <option value="Fisico_Personalizado">✨ Produtos Físicos / Com Personalização</option>
                    <option value="Digital_Personalizado">💻 Produtos Digitais / Com Personalização</option>
                    <option value="digital_download">📥 Arquivos Digitais / Download (Pronta Entrega)</option>
                </select>

                <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#b45309', display: 'block', marginBottom: '4px' }}>
                        ⏱️ Dias necessários para produzir / preparar o produto:
                    </label>
                    <input
                        style={{ ...styles.input, marginBottom: 0, borderColor: '#f59e0b', background: theme.inputBg, color: theme.textMain }}
                        value={diasProducao}
                        onChange={e => {
                            const cleanValue = e.target.value.replace(/\D/g, "");
                            setDiasProducao(cleanValue);
                        }}
                        placeholder="Ex: 3 (dias úteis ou de preparo)"
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: `1px solid ${theme.border}`, paddingTop: '10px', marginTop: '5px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 'bold', color: theme.textMain, cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={movimentarEstoque}
                            onChange={e => setMovimentarEstoque(e.target.checked)}
                            style={{ transform: 'scale(1.1)', cursor: 'pointer' }}
                        />
                        Movimentar Estoque do Produto
                    </label>
                    <span style={{ fontSize: '11px', color: theme.textSec, marginLeft: '22px', marginTop: '-4px' }}>
                        O sistema movimentará o estoque deste produto automaticamente sempre que uma compra ou venda for realizada.
                    </span>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 'bold', color: theme.textMain, cursor: 'pointer', marginTop: '4px' }}>
                        <input
                            type="checkbox"
                            checked={movimentarEstoqueComposicao}
                            onChange={e => setMovimentarEstoqueComposicao(e.target.checked)}
                            style={{ transform: 'scale(1.1)', cursor: 'pointer' }}
                        />
                        Movimentar Estoque da Composição
                    </label>
                    <span style={{ fontSize: '11px', color: theme.textSec, marginLeft: '22px', marginTop: '-4px' }}>
                        O sistema movimentará o estoque dos produtos que fazem parte da composição automaticamente quando uma venda for realizada ou produção em andamento.
                    </span>
                </div>
            </div>

            <hr style={{ border: '0', borderTop: `1px solid ${theme.border}`, margin: '5px 0' }} />

            {/* 4. VALORES E ESTOQUE */}
            <div style={{ opacity: temVariaveisComPreco ? 0.6 : 1, marginBottom: '15px' }}>
                <label style={{ ...styles.miniLabel, color: theme.textSec }}>Valores e Estoque</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                    <input
                        disabled={temVariaveisComPreco}
                        style={{ ...styles.input, marginBottom: 0, background: theme.inputBg, color: theme.textMain, borderColor: theme.border }}
                        value={temVariaveisComPreco ? "Grade" : (precoBasico || "")}
                        onChange={e => formatInput(e.target.value, setPrecoBasico)}
                        placeholder="Venda (R$)"
                    />
                    <input
                        disabled={temVariaveisComPreco}
                        style={{ ...styles.input, marginBottom: 0, background: theme.inputBg, color: theme.textMain, borderColor: theme.border }}
                        value={temVariaveisComPreco ? "Grade" : (custoUnitario || "")}
                        onChange={e => formatInput(e.target.value, setCustoUnitario)}
                        placeholder="Custo (R$)"
                    />
                    <input
                        disabled={temVariaveisComPreco}
                        style={{ ...styles.input, marginBottom: 0, background: theme.inputBg, color: theme.textMain, borderColor: theme.border }}
                        value={temVariaveisComPreco ? "Grade" : (estoque || "")}
                        onChange={e => {
                            const cleanValue = e.target.value.replace(/\D/g, "");
                            setEstoque(cleanValue);
                        }}
                        placeholder="Estoque"
                    />
                </div>
            </div>

            <hr style={{ border: '0', borderTop: `1px solid ${theme.border}`, margin: '5px 0' }} />

            {/* 5. CONFIGURAÇÕES DE LOGÍSTICA E FRETE */}
            {precisaDeFrete ? (
                <div style={{ opacity: temVariaveisComPreco && !pesosDiferentesPorVariacao ? 0.6 : 1 }}>
                    <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, padding: '10px 12px', borderRadius: '8px', marginBottom: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 'bold', color: theme.textMain, cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={pesosDiferentesPorVariacao}
                                onChange={e => {
                                    const valor = e.target.checked;
                                    setPesosDiferentesPorVariacao(valor);
                                    if (valor) {
                                        setShowVarModal(true);
                                    }
                                }}
                                style={{ transform: 'scale(1.1)', cursor: 'pointer' }}
                            />
                            Pesos/dimensões diferentes por variação
                        </label>
                    </div>

                    <h3 style={{ ...styles.sideTitle, color: theme.textMain }}>🚚 Medidas para Cálculo de Frete (Melhor Envio)</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '10px', opacity: pesosDiferentesPorVariacao ? 0.4 : 1, pointerEvents: pesosDiferentesPorVariacao ? 'none' : 'auto' }}>
                        <input
                            disabled={pesosDiferentesPorVariacao}
                            style={{ ...styles.input, marginBottom: 0, background: theme.inputBg, color: theme.textMain, borderColor: theme.border }}
                            value={pesosDiferentesPorVariacao ? "Definido na Grade" : peso}
                            onChange={e => setPeso(formatarPeso(e.target.value))}
                            placeholder="Peso kg"
                        />
                        <input
                            disabled={pesosDiferentesPorVariacao}
                            style={{ ...styles.input, marginBottom: 0, background: theme.inputBg, color: theme.textMain, borderColor: theme.border }}
                            value={pesosDiferentesPorVariacao ? "Definido na Grade" : comprimento}
                            onChange={e => setComprimento(formatarMedida(e.target.value))}
                            placeholder="Comp cm"
                        />
                        <input
                            disabled={pesosDiferentesPorVariacao}
                            style={{ ...styles.input, marginBottom: 0, background: theme.inputBg, color: theme.textMain, borderColor: theme.border }}
                            value={pesosDiferentesPorVariacao ? "Definido na Grade" : largura}
                            onChange={e => setLargura(formatarMedida(e.target.value))}
                            placeholder="Larg cm"
                        />
                        <input
                            disabled={pesosDiferentesPorVariacao}
                            style={{ ...styles.input, marginBottom: 0, background: theme.inputBg, color: theme.textMain, borderColor: theme.border }}
                            value={pesosDiferentesPorVariacao ? "Definido na Grade" : altura}
                            onChange={e => setAltura(formatarMedida(e.target.value))}
                            placeholder="Alt cm"
                        />
                    </div>
                </div>
            ) : (
                <div style={{
                    background: theme.bgCard,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    padding: '12px 15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '5px'
                }}>
                    <FiInfo size={18} color="#16a34a" style={{ flexShrink: 0 }} />
                    <div>
                        <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: theme.textMain }}>Produto sem frete / Envio Digital</h4>
                        <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: theme.textSec }}>
                            Este produto não requer cálculo de frete ou dimensões postais no carrinho.
                        </p>
                    </div>
                </div>
            )}

            <hr style={{ border: '0', borderTop: `1px solid ${theme.border}`, margin: '5px 0' }} />

            {/* ALERTA DE ESTOQUE MÍNIMO */}
            <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, marginBottom: '5px', display: 'block' }}>
                    ⚠️ Alerta de Estoque Mínimo (Aviso quando atingir X unidades)
                </label>
                <input
                    style={{ ...styles.input, marginBottom: 0, background: theme.inputBg, color: theme.textMain, borderColor: theme.border }}
                    value={estoqueMinimo}
                    onChange={e => {
                        const cleanValue = e.target.value.replace(/\D/g, "");
                        setEstoqueMinimo(cleanValue);
                    }}
                    placeholder="Ex: 5 (Padrão: 3)"
                />
            </div>

            <hr style={{ border: '0', borderTop: `1px solid ${theme.border}`, margin: '5px 0' }} />

            {/* 6. SKU (CÓDIGO) E GTIN/EAN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ opacity: temVariaveisComPreco ? 0.6 : 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, marginBottom: '5px', display: 'block' }}>
                        SKU (Código Base) {temVariaveisComPreco && "— Gerenciado na Grade"}
                    </label>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <input
                            disabled={temVariaveisComPreco}
                            style={{ ...styles.input, marginBottom: 0, background: theme.inputBg, color: theme.textMain, borderColor: theme.border }}
                            value={temVariaveisComPreco ? "Gerenciado na Grade de Variações" : sku}
                            onChange={e => setSku(e.target.value.toUpperCase())}
                            placeholder="Ex: CAM-AZU-G"
                        />
                        <button
                            type="button"
                            disabled={temVariaveisComPreco}
                            onClick={() => setIsModalSKUOpen(true)}
                            style={{
                                padding: '0 15px',
                                background: temVariaveisComPreco ? theme.border : theme.primary,
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: temVariaveisComPreco ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold',
                                fontSize: '12px'
                            }}
                        >
                            Gen
                        </button>
                    </div>
                </div>

                <div style={{ opacity: temVariaveisComPreco ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec }}>
                            Código de Barras do Fabricante (EAN / GTIN) {temVariaveisComPreco && "— Gerenciado na Grade"}
                        </label>
                        {!temVariaveisComPreco && (
                            <span style={{ fontSize: '10px', background: `${theme.primary}20`, color: theme.primary, padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                🔫 Digite ou Bipe
                            </span>
                        )}
                    </div>
                    <input
                        disabled={temVariaveisComPreco}
                        id="input-ean-gtin"
                        style={{ ...styles.input, marginBottom: 0, background: theme.inputBg, color: theme.textMain, borderColor: theme.border }}
                        value={temVariaveisComPreco ? "Gerenciado na Grade de Variações" : ean}
                        onChange={e => {
                            const apenasNumeros = e.target.value.replace(/\D/g, "").slice(0, 14);
                            if (setEan) setEan(apenasNumeros);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                const valorAtual = e.currentTarget.value.trim();
                                if (!valorAtual) return;

                                const tamanhosValidos = [8, 12, 13, 14];
                                if (!tamanhosValidos.includes(valorAtual.length)) {
                                    const confirmar = window.confirm(`⚠️ O código digitado/bipado "${valorAtual}" possui ${valorAtual.length} dígitos (padrão comum é 8, 12, 13 ou 14). Deseja prosseguir mesmo assim?`);
                                    if (!confirmar) return;
                                }

                                const inputNome = document.getElementById('input-nome-produto');
                                if (inputNome) {
                                    (inputNome as HTMLInputElement).focus();
                                    (inputNome as HTMLInputElement).select();
                                }
                            }
                        }}
                        placeholder={temVariaveisComPreco ? "Gerenciado na Grade de Variações" : "Digite ou bipe o código..."}
                    />
                </div>
            </div>

        </div>
    );
}