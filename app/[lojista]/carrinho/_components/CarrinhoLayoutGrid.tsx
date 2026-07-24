"use client";

import React from "react";

interface CarrinhoLayoutGridProps {
  bloco1: React.ReactNode;
  bloco2: React.ReactNode;
  bloco3: React.ReactNode;
  bloco4: React.ReactNode;
  bloco5: React.ReactNode;
  bloco6: React.ReactNode;
  temFrete: boolean;
}

export default function CarrinhoLayoutGrid({
  bloco1,
  bloco2,
  bloco3,
  bloco4,
  bloco5,
  bloco6,
  temFrete,
}: CarrinhoLayoutGridProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @media (max-width: 768px) {
          .carrinho-grid-container {
            display: flex !important;
            flex-direction: column !important;
            gap: 20px !important;
          }
          .carrinho-grid-top {
            display: flex !important;
            flex-direction: column !important;
            gap: 20px !important;
            width: 100% !important;
          }
          .carrinho-coluna-esq, .carrinho-coluna-dir {
            display: flex !important;
            flex-direction: column !important;
            gap: 20px !important;
            width: 100% !important;
          }
          /* No mobile, todas as alturas fixas são liberadas para evitar sobreposição */
          .bloco-wrapper-responsivo {
            height: auto !important;
            max-height: none !important;
            min-height: auto !important;
            width: 100% !important;
          }
          /* Oculta o bloco de frete tradicional na parte inferior exclusivamente no mobile */
          .bloco-frete-desktop {
            display: none !important;
          }
        }
      `}} />

      <div style={styles.gridContainer} className="carrinho-grid-container">
        {/* TOPO: DUAS COLUNAS FIXAS NO PC, EMPILHADAS NO MOBILE */}
        <div style={styles.topRow} className="carrinho-grid-top">

          {/* COLUNA ESQUERDA (Blocos 1 e 2) */}
          <div style={styles.colunaEsquerda} className="carrinho-coluna-esq">
            <div style={styles.bloco1Wrapper} className="bloco-wrapper-responsivo">{bloco1}</div>
            <div style={styles.bloco2Wrapper} className="bloco-wrapper-responsivo">{bloco2}</div>
          </div>

          {/* COLUNA DIREITA (Blocos 4, 5 e 6) */}
          <div style={styles.colunaDireita} className="carrinho-coluna-dir">
            <div style={styles.bloco4Wrapper} className="bloco-wrapper-responsivo">{bloco4}</div>
            <div style={styles.bloco5Wrapper} className="bloco-wrapper-responsivo">{bloco5}</div>
            <div style={styles.bloco6Wrapper} className="bloco-wrapper-responsivo">{bloco6}</div>
          </div>

        </div>

        {/* ABAIXO: BLOCO 3 (LARGURA TOTAL PARA O FRETE - Visível no PC, oculto no mobile) */}
        {temFrete && (
          <div style={styles.bloco3Wrapper} className="bloco-wrapper-responsivo bloco-frete-desktop">
            {bloco3}
          </div>
        )}
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  gridContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '100%',
    boxSizing: 'border-box'
  },
  topRow: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    width: '100%',
    boxSizing: 'border-box',
    alignItems: 'flex-start'
  },
  colunaEsquerda: {
    flex: '2 1 650px',
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  colunaDireita: {
    flex: '1 1 340px',
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  bloco1Wrapper: { width: '100%', height: '350px', maxHeight: '350px', boxSizing: 'border-box' },
  bloco2Wrapper: { width: '100%', height: '310px', maxHeight: '310px', boxSizing: 'border-box' },
  bloco3Wrapper: { width: '100%', minHeight: '140px', boxSizing: 'border-box' },
  bloco4Wrapper: { width: '100%', height: '235px', maxHeight: '235px', boxSizing: 'border-box' },
  bloco5Wrapper: { width: '100%', height: '325px', maxHeight: '325px', boxSizing: 'border-box' },
  bloco6Wrapper: { width: '100%', height: '80px', maxHeight: '80px', boxSizing: 'border-box' },
};

// O miolo da página opera como um dashboard de checkout dividido em 6 blocos estruturais
// encapsulados por um componente de grid: cada bloco tem sua propria funçao :
// Bloco 1 (BlocoItensCarrinho) / Bloco 2 (Dados do Cliente e Endereço) / Bloco 3 (Opções de Frete)
// Bloco 4 (Resumo do Pedido) / Bloco 5 (Pagamento via Pix & Ações Finais)
// Bloco 6 (Bloco Neutro/Complementar)