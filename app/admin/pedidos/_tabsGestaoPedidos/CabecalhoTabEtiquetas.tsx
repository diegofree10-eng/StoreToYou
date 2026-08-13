// components/_tabsGestaoPedidos/CabecalhoTabEtiquetas.tsx
import React from 'react';

interface CabecalhoTabEtiquetasProps {
    dadosLoja?: any;
    isAutomacaoCompletaMelhorEnvio?: boolean;
}

export default function CabecalhoTabEtiquetas({ dadosLoja, isAutomacaoCompletaMelhorEnvio }: CabecalhoTabEtiquetasProps) {
    // Lê diretamente da memória (Zero leituras no Firebase)
    const automacaoAtiva = Boolean(
        isAutomacaoCompletaMelhorEnvio ?? dadosLoja?.sistema?.isAutomacaoCompletaMelhorEnvio
    );

    return (
        <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px' }}>🏷️ Central de Emissão de Etiquetas</h3>
                <span style={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: automacaoAtiva ? '#dcfce7' : '#e0f2fe',
                    color: automacaoAtiva ? '#166534' : '#0369a1',
                    border: `1px solid ${automacaoAtiva ? '#bbf7d0' : '#bae6fd'}`
                }}>
                    {automacaoAtiva ? '⚡ Automação Ativa' : '🛠️ Modo Manual / Híbrido'}
                </span>
            </div>
            
            <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                {automacaoAtiva 
                    ? 'Sistema conectado ao Melhor Envio. Gerencie etiquetas e pagamentos automaticamente.'
                    : '💡 Modo Manual: Gere e pague as etiquetas no painel do Melhor Envio. Depois, clique em "Confirmar Envio" para mover os pedidos.'}
            </p>
        </div>
    );
}

//Cuida apenas de mostrar o banner indicando se o lojista está no Modo Manual
// (💡 Modo Manual: Pague e imprima no Melhor Envio...) ou no Modo Automático.