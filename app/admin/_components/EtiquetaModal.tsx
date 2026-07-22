"use client";
import React, { useState, useMemo, useRef, useEffect } from "react";
import JsBarcode from "jsbarcode";

const FORMATOS_ETIQUETA = {
  "Pimaco 6180": { colunas: 3, largura: "66.7mm", altura: "25.4mm", font: 11 },
  "Green Paper 6180": { colunas: 3, largura: "66.7mm", altura: "25.4mm", font: 11 },
  "Link 9013": { colunas: 3, largura: "63.5mm", altura: "25.4mm", font: 9 },
};

export default function EtiquetaModal({ isOpen, onClose, listaProdutos }: any) {
  const [modelo, setModelo] = useState<keyof typeof FORMATOS_ETIQUETA>("Pimaco 6180");
  const config = FORMATOS_ETIQUETA[modelo];
  const gridRef = useRef<HTMLDivElement>(null);

  const itensParaImprimir = useMemo(() => {
    if (!listaProdutos) return [];
    return listaProdutos.flatMap((prod: any) => {
      if (prod.temVariacoes && prod.variacoes?.length > 0) {
        return prod.variacoes.map((v: any) => ({
          nome: `${prod.nome} (${v.nome})`,
          sku: v.sku || "SEM-SKU"
        }));
      }
      return { nome: prod.nome, sku: prod.sku || "SEM-SKU" };
    });
  }, [listaProdutos]);

  const imprimirDireto = () => {
    if (!gridRef.current) return;
    const gridClone = gridRef.current.cloneNode(true) as HTMLElement;
    
    const printWindow = window.open("", "_blank", "width=900,height=600");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <style>
              @page { size: A4; margin: 5mm; }
              body { font-family: sans-serif; display: flex; justify-content: center; }
              .grid { display: grid; grid-template-columns: repeat(${config.colunas}, 1fr); gap: 2px; }
              .etiqueta { 
                border: 1px solid #ccc; width: ${config.largura}; height: ${config.altura}; 
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                overflow: hidden; padding: 2px; box-sizing: border-box;
              }
              svg { max-width: 95%; height: 35px; }
              .nome-prod { font-size: ${config.font}px; margin: 0; font-weight: bold; text-align: center; }
              .sku-text { font-size: 10px; font-weight: bold; margin: 0; letter-spacing: 0.5px; }
            </style>
          </head>
          <body>
            <div class="grid">${gridClone.innerHTML}</div>
            <script>window.onload = () => { window.print(); window.close(); };</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={{ borderBottom: '1px solid #ddd', paddingBottom: '15px', marginBottom: '15px' }}>
          <h3>Impressão de Etiquetas ({itensParaImprimir.length})</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
            <label>Formato:</label>
            <select value={modelo} onChange={(e) => setModelo(e.target.value as any)} style={{ padding: '5px' }}>
              {Object.keys(FORMATOS_ETIQUETA).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={onClose} style={styles.btnCancel}>Fechar</button>
            <button onClick={imprimirDireto} style={styles.btnPrint}>Imprimir</button>
          </div>
        </div>

        <div ref={gridRef} style={{ 
          maxHeight: '60vh', overflowY: 'auto', display: 'grid', 
          gridTemplateColumns: `repeat(${config.colunas}, 1fr)`, gap: '10px', padding: '10px',
          justifyItems: 'center'
        }}>
          {itensParaImprimir.map((item: any, i: number) => (
            <BarcodeItem key={i} sku={item.sku} nome={item.nome} config={config} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BarcodeItem({ sku, nome, config }: any) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && sku && sku !== "SEM-SKU") {
      const normalizar = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      
      JsBarcode(svgRef.current, normalizar(sku), { 
        format: "CODE128", 
        width: 1.8, 
        height: 35, 
        displayValue: false, // Desativamos o texto automático para usar o nosso
        margin: 0
      });
    }
  }, [sku]);

  return (
    <div className="etiqueta" style={{ 
      border: '1px solid #ccc', width: config.largura, height: config.altura, 
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '2px', boxSizing: 'border-box', overflow: 'hidden'
    }}>
      <p className="nome-prod" style={{ fontSize: `${config.font}px`, fontWeight: 'bold', margin: '0 0 2px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{nome}</p>
      
      {sku !== "SEM-SKU" ? (
        <>
          <svg ref={svgRef} style={{ maxWidth: '95%', height: '35px' }}></svg>
          <p className="sku-text" style={{ fontSize: '10px', margin: 0 }}>{sku}</p>
        </>
      ) : (
        <p style={{color:'red', fontSize: '10px', margin: 0}}>Sem SKU</p>
      )}
    </div>
  );
}

const styles: any = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modal: { background: '#fff', padding: '20px', borderRadius: '12px', textAlign: 'center', width: '90%', maxWidth: '800px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' },
  btnPrint: { padding: '8px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  btnCancel: { padding: '8px 20px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }
};