"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function CarrinhoHeaderStatus({ isLojaAberta, nomeLoja, logoUrl, slug, config }: any) {
  const router = useRouter();

  // Usa a cor secundária do config ou um fallback padrão
  const corFundoCabecalho = config?.corSecundaria || "#fdebec";
  const corTextoCabecalho = config?.corTexto || "#1e293b";

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', padding: '8px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff', textAlign: 'center' }}>
        <span>🚚 Frete para todo o Brasil</span>
        <span>💳 Pague com pix</span>
        <span>📞 Atendimento</span>
      </div>

      <header 
        className="header-loja" 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', 
          alignItems: 'center', 
          padding: '0 25px', 
          height: '80px', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          backgroundColor: corFundoCabecalho // 👈 Sincronizado com a mesma cor do rodapé
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '100%' }}>
          <div 
            onClick={() => router.push(`/${slug}`)} 
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', height: '100%' }}
            title="Voltar para a página inicial da loja"
          >
            <div style={{ width: '50px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {logoUrl ? <img src={logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt={nomeLoja} /> : <div>🛍️</div>}
            </div>
            <span style={{ fontSize: '15px', fontWeight: '900', color: corTextoCabecalho }}>{nomeLoja.toUpperCase()}</span>
          </div>
        </div>
      </header>

      {!isLojaAberta && (
        <div style={{ width: '100%', backgroundColor: '#fee2e2', color: '#991b1b', textAlign: 'center', padding: '10px', fontSize: '13px', fontWeight: 'bold' }}>
          🔴 Loja em férias / modo vitrine. Pedidos temporariamente desativados.
        </div>
      )}
    </>
  );
}
//componente separado para o cabeçalho e avisos de status da loja: