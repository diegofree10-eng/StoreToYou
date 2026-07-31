'use client';
import React, { useState } from 'react';

export default function GestaoPedidosFluxoMockup() {
    const [abaAtiva, setAbaAtiva] = useState('etiquetas');

    return (
        <div style={{ padding: '24px', background: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif' }}>
            
            {/* CABEÇALHO DA PÁGINA */}
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>📦 Gestão de Pedidos e Envios</h1>
                <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0 0' }}>Acompanhe o ciclo de vida completo dos seus pedidos, da aprovação à entrega.</p>
            </div>

            {/* ABAS DE NAVEGAÇÃO DO FLUXO (Onde você alterna entre as etapas) */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '20px', borderBottom: '1px solid #cbd5e1' }}>
                {[
                    { id: 'novos', label: '📥 Novos / Pagos', count: 3 },
                    { id: 'cotacao', label: '🧮 Prontos p/ Cotação', count: 5 },
                    { id: 'etiquetas', label: '🏷️ Emitir Etiquetas', count: 2 },
                    { id: 'enviados', label: '🚚 Em Trânsito / Enviados', count: 12 },
                    { id: 'problemas', label: '⚠️ Alertas / Exceções', count: 1 },
                    { id: 'concluidos', label: '✅ Entregues', count: 48 },
                ].map(aba => {
                    const ativo = abaAtiva === aba.id;
                    return (
                        <button
                            key={aba.id}
                            onClick={() => setAbaAtiva(aba.id)}
                            style={{
                                padding: '10px 16px',
                                backgroundColor: ativo ? '#2563eb' : '#fff',
                                color: ativo ? '#fff' : '#475569',
                                border: ativo ? '1px solid #2563eb' : '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                whiteSpace: 'nowrap',
                                boxShadow: ativo ? '0 4px 6px -1px rgba(37,99,235,0.2)' : 'none'
                            }}
                        >
                            {aba.label}
                            <span style={{
                                background: ativo ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                                color: ativo ? '#fff' : '#1e293b',
                                padding: '2px 6px',
                                borderRadius: '12px',
                                fontSize: '11px'
                            }}>
                                {aba.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* CONTEÚDO DA ABA SELECIONADA (Exemplo: Aba de Emitir Etiquetas ou Enviados) */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                
                {abaAtiva === 'etiquetas' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Pedidos aguardando emissão de etiqueta via Melhor Envio</h3>
                            <button style={{ background: '#059669', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                                🏷️ Emitir Selecionados em Lote
                            </button>
                        </div>
                        <p style={{ fontSize: '13px', color: '#64748b' }}>Aqui entram os pedidos que já passaram pela cotação e estão prontos para gerar a etiqueta e o código de postagem.</p>
                    </div>
                )}

                {abaAtiva === 'enviados' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Pacotes em trânsito com rastreamento ativo</h3>
                            <button style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                                🔄 Atualizar Rastreios via API
                            </button>
                        </div>
                        <p style={{ fontSize: '13px', color: '#64748b' }}>Acompanhe o status de entrega de cada pedido postado e copie o código de rastreio rapidamente.</p>
                    </div>
                )}

                {abaAtiva !== 'etiquetas' && abaAtiva !== 'enviados' && (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                        Conteúdo da etapa <b>{abaAtiva.toUpperCase()}</b> estruturado para exibição.
                    </div>
                )}

            </div>
        </div>
    );
}