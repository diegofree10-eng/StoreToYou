'use client';
import React from 'react';

interface TabCardEtiquetaProps {
    pedido: any;
    isAutomacaoCompletaMelhorEnvio: boolean;
    precisaFrete: boolean;
}

export default function TabCardEtiqueta({ pedido, isAutomacaoCompletaMelhorEnvio, precisaFrete }: TabCardEtiquetaProps) {
    const etiquetaData = (pedido as any).Etiqueta || {};
    const statusEtq = String(etiquetaData.statusEtiqueta || pedido.statusEtiqueta || '').toLowerCase();
    const msgErroEtq = String(etiquetaData.mensagemErro || '').toLowerCase();
    const textoCompleto = statusEtq + " " + msgErroEtq;
    const isPendenteSaldo = statusEtq === 'pendente_saldo' || textoCompleto.includes('checkout') || textoCompleto.includes('saldo') || textoCompleto.includes('falta de saldo');

    if (!precisaFrete) {
        return <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>Sem etiquetas</div>;
    }

    // ⚡ MODO COMPLETO (Automático)
    if (isAutomacaoCompletaMelhorEnvio) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                {pedido.etiquetaGerada || etiquetaData.statusEtiqueta ? (
                    <div style={{ fontSize: '10px', color: '#047857', lineHeight: '1.3' }}>
                        <div><b>Id:</b> {etiquetaData.IdEtiqueta || '-'}</div>
                        <div><b>Cód Envio:</b> {etiquetaData.codigoEnvio || '-'}</div>
                        <div><b>Status:</b> <span style={{ color: isPendenteSaldo ? '#b91c1c' : '#047857', fontWeight: 'bold' }}>{etiquetaData.statusEtiqueta || 'Pendente'}</span></div>
                        {etiquetaData.mensagemErro && (
                            <div style={{ color: isPendenteSaldo ? '#b91c1c' : '#b45309' }}><b>Erro:</b> {etiquetaData.mensagemErro}</div>
                        )}
                        <div><b>Rastreio:</b> {etiquetaData.dsNumRastreio || '-'}</div>
                        <div><b>Serviço:</b> {etiquetaData.servicoVinculado || '-'}</div>
                        <div><b>Valor Cobrado:</b> R$ {Number(etiquetaData.valorCobrado ?? 0).toFixed(2).replace('.', ',')}</div>
                        {etiquetaData.urlEtiqueta ? (
                            <a href={etiquetaData.urlEtiqueta} target="_blank" rel="noreferrer" style={{ color: '#2563eb', display: 'block', marginTop: '2px' }}>
                                Ver Etiqueta PDF
                            </a>
                        ) : null}
                    </div>
                ) : (
                    <div style={{ fontSize: '10px', color: '#64748b' }}>Aguardando emissão</div>
                )}
            </div>
        );
    }

    // 🛠️ MODO MANUAL (Card limpo, focado na mensagem em azul e rastreio)
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
            <div style={{ fontSize: '10px', lineHeight: '1.3' }}>
                <div><b>Cód Envio:</b> {etiquetaData.codigoEnvio || '-'}</div>
                <div><b>Rastreio:</b> {etiquetaData.dsNumRastreio || 'Aguardando sincronização...'}</div>
                <div><b>Id:</b> {etiquetaData.IdEtiqueta || '-'}</div>

                <div style={{ marginTop: '6px', padding: '6px 8px', backgroundColor: '#eff6ff', borderRadius: '6px', color: '#1e40af', border: '1px solid #bfdbfe' }}>
                    💡 <b>Modo Manual:</b> Pague e imprima no Melhor Envio. Depois clique em <b>Confirmar Envio</b> acima.
                </div>

                {etiquetaData.urlEtiqueta && (
                    <a href={etiquetaData.urlEtiqueta} target="_blank" rel="noreferrer" style={{ color: '#2563eb', display: 'block', marginTop: '6px', fontWeight: 'bold' }}>
                        📄 Ver Etiqueta PDF
                    </a>
                )}
            </div>
        </div>
    );
}