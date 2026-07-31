'use client';
import React, { useState, useMemo } from 'react';

export default function GestaoPedidosFluxoCompleto({ pedidos, lojistaIdApp, db }: any) {
    // Aba ativa atual do fluxo
    const [abaAtiva, setAbaAtiva] = useState<'pendente' | 'producao' | 'prontos' | 'cotar' | 'frete_gratis' | 'etiquetas' | 'postados'>('pendente');

    // Filtros lógicos para cada etapa baseados no status de produção e pagamento
    const pedidosFiltrados = useMemo(() => {
        if (!Array.isArray(pedidos)) return [];

        return pedidos.filter(p => {
            const pago = p.pago === true;
            const statusProd = (p.statusProducao || 'pendente').toLowerCase();
            const etiquetaGerada = p.etiquetaGerada === true;
            const isFreteGratis = p.logistica?.isFreteGratis || p.financeiro?.freteGratis;

            if (abaAtiva === 'pendente') {
                return pago && statusProd === 'pendente';
            }
            if (abaAtiva === 'producao') {
                return pago && statusProd === 'producao';
            }
            if (abaAtiva === 'prontos') {
                return pago && statusProd === 'concluido' && !etiquetaGerada;
            }
            if (abaAtiva === 'cotar') {
                return pago && statusProd === 'concluido' && !etiquetaGerada && !isFreteGratis;
            }
            if (abaAtiva === 'frete_gratis') {
                return pago && statusProd === 'concluido' && !etiquetaGerada && isFreteGratis;
            }
            if (abaAtiva === 'etiquetas') {
                return pago && statusProd === 'concluido' && !etiquetaGerada && !isFreteGratis;
            }
            if (abaAtiva === 'postados') {
                return etiquetaGerada || p.status === 'Enviado' || p.status === 'Concluído';
            }
            return false;
        });
    }, [pedidos, abaAtiva]);

    return (
        <div style={{ padding: '20px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
            
            {/* CABEÇALHO */}
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', color: '#1e293b', margin: 0, fontWeight: 800 }}>⚙️ Gestão de Pedidos e Esteira de Produção</h2>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>Acompanhe o pedido desde a fabricação até a postagem e rastreio.</p>
            </div>

            {/* ABAS DO FLUXO (ESTEIRA) */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0' }}>
                {[
                    { id: 'pendente', label: '📥 1. Pendentes', color: '#f59e0b' },
                    { id: 'producao', label: '⚙️ 2. Em Produção', color: '#3b82f6' },
                    { id: 'prontos', label: '📦 3. Prontos', color: '#8b5cf6' },
                    { id: 'cotar', label: '🧮 4. Cotar Frete', color: '#06b6d4' },
                    { id: 'frete_gratis', label: '🎁 5. Frete Grátis', color: '#10b981' },
                    { id: 'etiquetas', label: '🏷️ 6. Emitir Etiquetas', color: '#6366f1' },
                    { id: 'postados', label: '🚚 7. Postados / Rastreio', color: '#059669' },
                ].map(aba => {
                    const ativo = abaAtiva === aba.id;
                    return (
                        <button
                            key={aba.id}
                            onClick={() => setAbaAtiva(aba.id as any)}
                            style={{
                                padding: '10px 16px',
                                backgroundColor: ativo ? '#1e293b' : '#fff',
                                color: ativo ? '#fff' : '#475569',
                                border: ativo ? '1px solid #1e293b' : '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                fontSize: '13px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                boxShadow: ativo ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                                flexShrink: 0
                            }}
                        >
                            {aba.label}
                        </button>
                    );
                })}
            </div>

            {/* CONTEÚDO DA ABA SELECIONADA */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b', textTransform: 'uppercase' }}>
                        Etapa: {abaAtiva} ({pedidosFiltrados.length} pedidos)
                    </h3>
                </div>

                {pedidosFiltrados.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '14px' }}>
                        Nenhum pedido encontrado nesta etapa no momento. 📭
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {pedidosFiltrados.map((p: any) => (
                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '14px' }}>
                                        Pedido #{p.numeroPedido || p.id.slice(-4)}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#334155', marginTop: '2px' }}>
                                        Cliente: <b>{p.cliente?.nmNomeCliente || p.cliente?.nome || "Cliente"}</b>
                                    </div>
                                </div>
                                <div>
                                    <span style={{ fontSize: '12px', padding: '6px 12px', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontWeight: 'bold' }}>
                                        R$ {Number(p.financeiro?.vlTotal || 0).toFixed(2).replace('.', ',')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}