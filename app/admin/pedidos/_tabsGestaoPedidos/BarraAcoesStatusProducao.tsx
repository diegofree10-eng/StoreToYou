// components/_tabsGestaoPedidos/BarraAcoesStatusProducao.tsx
'use client';
import React, { useEffect } from 'react';
import { useTheme } from "@/context/ThemeContext";
import { EmbalagemLoja } from "@/utils/buscarEmbalagens";

interface BarraAcoesStatusProducaoProps {
    abaAtiva: string;
    selecionados: string[];
    idsVisiveisDaAba: string[];
    setSelecionados: React.Dispatch<React.SetStateAction<string[]>>;
    onMarcarPago?: () => void;
    onMarcarNaoPago?: () => void;
    onEnviarProducao?: () => void;
    onExcluirLote?: () => void;
    listaEmbalagens?: EmbalagemLoja[];
    embalagemEscolhida?: string;
    setEmbalagemEscolhida?: (id: string) => void;
    onSalvarEmbalagemProducao?: () => void;
}

export default function BarraAcoesStatusProducao({
    abaAtiva,
    selecionados = [],
    idsVisiveisDaAba = [],
    setSelecionados,
    onMarcarPago,
    onMarcarNaoPago,
    onEnviarProducao,
    onExcluirLote,
    listaEmbalagens = [],
    embalagemEscolhida = "",
    setEmbalagemEscolhida,
    onSalvarEmbalagemProducao
}: BarraAcoesStatusProducaoProps) {
    const { theme } = useTheme();

    useEffect(() => {
        setSelecionados([]);
    }, [abaAtiva, setSelecionados]);

    const todosSelecionados = idsVisiveisDaAba.length > 0 && idsVisiveisDaAba.every(id => selecionados.includes(id));
    const temSelecionados = selecionados.length > 0;

    const alternarSelecionarTodos = () => {
        if (todosSelecionados) {
            setSelecionados(prev => prev.filter(id => !idsVisiveisDaAba.includes(id)));
        } else {
            setSelecionados(prev => Array.from(new Set([...prev, ...idsVisiveisDaAba])));
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: theme.bgCard,
            border: `1px solid ${theme.border}`,
            padding: '8px 14px',
            borderRadius: '8px',
            marginTop: '10px',
            minHeight: '42px',
            boxSizing: 'border-box',
            flexWrap: 'wrap',
            gap: '10px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                    type="checkbox"
                    checked={todosSelecionados}
                    onChange={alternarSelecionarTodos}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: theme.primary }}
                    title="Selecionar/Desselecionar visíveis da aba"
                />
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: theme.textMain }}>
                    {selecionados.length} selecionado(s)
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minHeight: '30px' }}>
                {temSelecionados ? (
                    <>
                        {abaAtiva === 'pedidos' && (
                            <>
                                <button
                                    onClick={onMarcarPago}
                                    style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    💵 Marcar como Pago ({selecionados.length})
                                </button>
                                <button
                                    onClick={onExcluirLote}
                                    style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    🗑️ Excluir Selecionados ({selecionados.length})
                                </button>
                            </>
                        )}

                        {abaAtiva === 'pendente' && (
                            <>
                                <button
                                    onClick={onMarcarNaoPago}
                                    style={{ backgroundColor: '#f59e0b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    ↩️ Marcar como Não Pago ({selecionados.length})
                                </button>
                                <button
                                    onClick={onEnviarProducao}
                                    style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    ⚙️ Enviar para Produção ({selecionados.length})
                                </button>
                            </>
                        )}

                        {abaAtiva === 'producao' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <select
                                    value={embalagemEscolhida}
                                    onChange={(e) => setEmbalagemEscolhida?.(e.target.value)}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '6px',
                                        border: `1px solid ${theme.border}`,
                                        backgroundColor: theme.inputBg,
                                        color: theme.textMain,
                                        fontSize: '12px',
                                        outline: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">📦 Selecione a Embalagem...</option>
                                    {listaEmbalagens.map((emb) => (
                                        <option key={emb.id} value={emb.id}>
                                            {emb.nome} ({emb.largura}x{emb.altura}x{emb.comprimento}cm) - R$ {Number(emb.custo || 0).toFixed(2)}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    onClick={onSalvarEmbalagemProducao}
                                    style={{
                                        backgroundColor: '#10b981',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🚀 Salvar Embalagem e Marcar Pronto ({selecionados.length})
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => setSelecionados([])}
                            style={{
                                background: 'transparent',
                                color: '#ef4444',
                                border: `1px solid #ef4444`,
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Limpar
                        </button>
                    </>
                ) : null}
            </div>
        </div>
    );
}
//app/admin/pedidos/_tabsGestaoPedidos/BarraAcoesStatusProducao.tsx