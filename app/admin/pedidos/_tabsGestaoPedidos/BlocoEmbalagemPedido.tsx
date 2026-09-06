'use client';
import React from 'react';
import { useTheme } from "@/context/ThemeContext";

interface BlocoEmbalagemPedidoProps {
    pedido: any;
}

export default function BlocoEmbalagemPedido({ pedido }: BlocoEmbalagemPedidoProps) {
    const { theme } = useTheme();

    const embalagemObj = pedido?.Embalagem || pedido?.embalagemRecomendada || {};
    const recomendada = embalagemObj.recomendada || embalagemObj;
    const escolhida = embalagemObj.escolhida || null;

    const modeloRecomendado = recomendada.dsModeloEmbalagemRecomendado || recomendada.nomeInsumo || recomendada.nome || "Não calculada";
    const tipoRecomendado = recomendada.dsTipoEmbalagem || recomendada.tipo || "-";

    const modeloEscolhido = escolhida?.dsModeloEmbalagemEscolhida || "";
    const tipoEscolhido = escolhida?.dsTipoEmbalagem || "";

    return (
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            backgroundColor: theme.bgCard, 
            border: `1px solid ${theme.border}`, 
            padding: '10px 14px', 
            borderRadius: '8px', 
            marginBottom: '12px', 
            flexWrap: 'wrap', 
            gap: '8px' 
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '15px' }}>📦</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textMain }}>Embalagem Recomendada:</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: theme.primary, backgroundColor: theme.inputBg, padding: '2px 8px', borderRadius: '4px', border: `1px solid ${theme.border}` }}>
                    {modeloRecomendado} ({String(tipoRecomendado).replace('_', ' ')})
                </span>

                {modeloEscolhido && (
                    <>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textSec, marginLeft: '8px' }}>| Escolhida:</span>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#16a34a', backgroundColor: '#e6f4ea', padding: '2px 8px', borderRadius: '4px', border: '1px solid #34a853' }}>
                            {modeloEscolhido} {tipoEscolhido ? `(${String(tipoEscolhido).replace('_', ' ')})` : ''}
                        </span>
                    </>
                )}
            </div>
        </div>
    );
} 
// app/admin/pedidos/_tabsGestaoPedidos/BlocoEmbalagemPedido.tsx
// esse bloco fica responsavem por renderizar dentro de cada pedido no expandido a
// embalagem recomendada e a escolhida