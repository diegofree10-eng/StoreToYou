// app/admin/produtos/_components/ModalCadastroInsumos.tsx
"use client";

import { useState, useMemo } from "react";
import { FiX, FiSearch, FiTrash2 } from "react-icons/fi";
import { useTheme } from "@/context/ThemeContext";

interface ModalCadastroInsumosProps {
    isOpen: boolean;
    onClose: () => void;
    listaInsumos: any[];
    insumosComposicao: any[];
    setInsumosComposicao: (insumos: any[]) => void;
    outrosCustos?: string;
    setOutrosCustos?: (v: string) => void;
    formatInput?: (value: string, setter: (v: string) => void) => void;
}

export default function ModalCadastroInsumos({
    isOpen,
    onClose,
    listaInsumos = [],
    insumosComposicao = [],
    setInsumosComposicao,
    outrosCustos = "",
    setOutrosCustos = () => { },
    formatInput
}: ModalCadastroInsumosProps) {
    const { theme } = useTheme();

    const [buscaInsumo, setBuscaInsumo] = useState("");
    const [insumoSelecionado, setInsumoSelecionado] = useState<any | null>(null);
    const [qtdConsumidaTemp, setQtdConsumidaTemp] = useState("");

    const insumosFiltrados = useMemo(() => {
        if (!Array.isArray(listaInsumos)) return [];
        if (!buscaInsumo.trim()) return listaInsumos;
        
        const termo = buscaInsumo.toLowerCase().trim();
        return listaInsumos.filter(i => {
            const nome = (i.dsNomeInsumo || "").toLowerCase();
            const marca = (i.dsMarcaInsumo || "").toLowerCase();
            return nome.includes(termo) || marca.includes(termo);
        });
    }, [buscaInsumo, listaInsumos]);

    if (!isOpen) return null;

    const custoUnitarioAtual = insumoSelecionado ? Number(insumoSelecionado.vlCustoUnitarioInsumo || 0) : 0;
    const qtdNumerica = parseFloat(qtdConsumidaTemp.replace(",", ".")) || 0;
    const custoTotalItemAtual = custoUnitarioAtual * qtdNumerica;

    const adicionarInsumoComposicao = () => {
        if (!insumoSelecionado) {
            alert("Selecione um insumo da lista.");
            return;
        }
        if (qtdNumerica <= 0) {
            alert("Informe uma quantidade consumida válida.");
            return;
        }

        const novoItem = {
            id: insumoSelecionado.id,
            dsNomeInsumo: insumoSelecionado.dsNomeInsumo,
            dsUnidadeConsumoInsumo: insumoSelecionado.dsUnidadeConsumoInsumo,
            vlCustoUnitarioInsumo: Number(insumoSelecionado.vlCustoUnitarioInsumo || 0),
            nrQuantidadeConsumida: qtdNumerica,
            vlCustoTotalItem: custoTotalItemAtual
        };

        const jaExisteIndex = insumosComposicao.findIndex((item: any) => item.id === insumoSelecionado.id);
        if (jaExisteIndex >= 0) {
            const copia = [...insumosComposicao];
            copia[jaExisteIndex] = novoItem;
            setInsumosComposicao(copia);
        } else {
            setInsumosComposicao([...insumosComposicao, novoItem]);
        }

        setInsumoSelecionado(null);
        setQtdConsumidaTemp("");
        setBuscaInsumo("");
    };

    const removerItemComposicao = (index: number) => {
        const novaLista = insumosComposicao.filter((_, i) => i !== index);
        setInsumosComposicao(novaLista);
    };

    const custoInsumosGeral = insumosComposicao.reduce((acc, item) => {
        const custoUnit = Number(item.vlCustoUnitarioInsumo || 0);
        const qtd = Number(item.nrQuantidadeConsumida || 0);
        return acc + (custoUnit * qtd);
    }, 0);

    const valorOutrosNum = parseFloat(outrosCustos.toString().replace(/\./g, "").replace(",", ".")) || 0;
    const custoTotalComposicaoGeral = custoInsumosGeral + valorOutrosNum;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 6000, padding: '15px' }}>
            <div style={{ background: theme.bgCard, padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '600px', border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '90vh', overflowY: 'auto' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '16px', margin: 0, fontWeight: 800, color: theme.textMain }}>
                        📦 Gerenciar Insumos de Composição
                    </h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: theme.textSec, cursor: 'pointer' }}>
                        <FiX size={20} />
                    </button>
                </div>

                {/* Pesquisa e Seleção do Insumo */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: theme.bgApp, padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase' }}>
                        1. Pesquisar e Selecionar Insumo (Cadastrados: {listaInsumos.length})
                    </label>

                    <div style={{ position: 'relative' }}>
                        <FiSearch size={16} color={theme.textSec} style={{ position: 'absolute', left: '10px', top: '12px' }} />
                        <input
                            type="text"
                            placeholder="Digite o nome exato do insumo..."
                            value={buscaInsumo}
                            onChange={(e) => setBuscaInsumo(e.target.value)}
                            style={{ width: '100%', padding: '10px 10px 10px 34px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>

                    {buscaInsumo.trim() !== "" && (
                        <div style={{ maxHeight: '150px', overflowY: 'auto', border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg }}>
                            {insumosFiltrados.length === 0 ? (
                                <div style={{ padding: '8px', fontSize: '12px', color: theme.textSec, textAlign: 'center' }}>Nenhum insumo encontrado.</div>
                            ) : (
                                insumosFiltrados.map((i) => (
                                    <div
                                        key={i.id}
                                        onClick={() => {
                                            setInsumoSelecionado(i);
                                            setBuscaInsumo("");
                                        }}
                                        style={{ padding: '8px 12px', fontSize: '12px', cursor: 'pointer', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                    >
                                        <span style={{ fontWeight: 'bold', color: theme.textMain }}>{i.dsNomeInsumo}</span>
                                        <span style={{ color: theme.textSec }}>R$ {Number(i.vlCustoUnitarioInsumo || 0).toFixed(2).replace('.', ',')} / {i.dsUnidadeConsumoInsumo}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {insumoSelecionado && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: theme.inputBg, padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.primary}` }}>
                            <div>
                                <span style={{ fontSize: '10px', color: theme.textSec, display: 'block', textTransform: 'uppercase' }}>Insumo Escolhido:</span>
                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: theme.textMain }}>
                                    {insumoSelecionado.dsNomeInsumo}
                                </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '10px', color: theme.textSec, display: 'block', textTransform: 'uppercase' }}>Valor Unitário:</span>
                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#16a34a' }}>
                                    R$ {Number(insumoSelecionado.vlCustoUnitarioInsumo || 0).toFixed(2).replace('.', ',')} ({insumoSelecionado.dsUnidadeConsumoInsumo})
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Quantidade Consumida e Botão Adicionar */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase' }}>
                            2. Quantidade Consumida (Ex: 1,5, 2, 0,80)
                        </label>
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Ex: 1,5 ou 2 ou 0,80"
                            value={qtdConsumidaTemp}
                            onChange={(e) => {
                                const valor = e.target.value.replace(/[^0-9.,]/g, "");
                                setQtdConsumidaTemp(valor);
                            }}
                            style={{ padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '13px', outline: 'none' }}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={adicionarInsumoComposicao}
                        style={{ background: theme.primary, color: '#fff', border: 'none', padding: '11px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', height: '41px' }}
                    >
                        Adicionar à Lista
                    </button>
                </div>

                {/* Lista de Insumos Vinculados */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase' }}>
                        3. Insumos Vinculados ({insumosComposicao.length})
                    </label>

                    {insumosComposicao.length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', background: theme.inputBg, borderRadius: '8px', border: `1px dashed ${theme.border}`, color: theme.textSec, fontSize: '12px' }}>
                            Nenhum insumo adicionado na composição ainda.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                            {insumosComposicao.map((item, index) => {
                                const custoTotItem = Number(item.vlCustoUnitarioInsumo || 0) * Number(item.nrQuantidadeConsumida || 0);
                                return (
                                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: theme.inputBg, padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textMain }}>{item.dsNomeInsumo}</span>
                                            <span style={{ fontSize: '10px', color: theme.textSec }}>
                                                Consumo: <b>{item.nrQuantidadeConsumida} {item.dsUnidadeConsumoInsumo}</b> × R$ {Number(item.vlCustoUnitarioInsumo || 0).toFixed(2).replace('.', ',')}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a' }}>
                                                R$ {custoTotItem.toFixed(2).replace('.', ',')}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removerItemComposicao(index)}
                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Input de Outros Custos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: `1px solid ${theme.border}`, paddingTop: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase' }}>
                        💵 Outros Custos / Despesas Avulsas (R$)
                    </label>
                    <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0,00"
                        value={outrosCustos}
                        onChange={(e) => {
                            const valorDigitado = e.target.value;
                            if (!valorDigitado) {
                                setOutrosCustos("");
                                return;
                            }
                            const apenasDigitos = valorDigitado.replace(/\D/g, "");
                            if (!apenasDigitos) {
                                setOutrosCustos("");
                                return;
                            }
                            const numero = (parseInt(apenasDigitos, 10) / 100).toFixed(2);
                            const formatado = numero.replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
                            setOutrosCustos(formatado);
                        }}
                        style={{ padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '13px', outline: 'none' }}
                    />
                </div>

                {/* Custo Total Geral */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: `${theme.primary}15`, padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.primary}50` }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textMain }}>Custo Total da Composição + Outros:</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#16a34a' }}>
                        R$ {custoTotalComposicaoGeral.toFixed(2).replace('.', ',')}
                    </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px', borderTop: `1px solid ${theme.border}`, paddingTop: '12px' }}>
                    <button type="button" onClick={onClose} style={{ background: theme.primary, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Concluir e Fechar
                    </button>
                </div>

            </div>
        </div>
    );
}