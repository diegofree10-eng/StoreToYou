// app/admin/_components/EtiquetaModal.tsx
"use client";
import React, { useState, useMemo, useRef, useEffect } from "react";
import JsBarcode from "jsbarcode";

interface FormatoEtiqueta {
  colunas: number;
  largura: string;
  altura: string;
  font: number;
}

const FORMATOS_ETIQUETA: Record<string, FormatoEtiqueta> = {
  "Pimaco 6180": { colunas: 3, largura: "66.7mm", altura: "25.4mm", font: 11 },
  "Green Paper 6180": { colunas: 3, largura: "66.7mm", altura: "25.4mm", font: 11 },
  "Link 9013": { colunas: 3, largura: "63.5mm", altura: "25.4mm", font: 9 },
};

interface EtiquetaModalProps {
  isOpen: boolean;
  onClose: () => void;
  listaProdutos: any[];
}

interface ItemImpressao {
  nome: string;
  codigoAlvo: string;
  tipoRotulo: "EAN" | "SKU";
}

export default function EtiquetaModal({ isOpen, onClose, listaProdutos }: EtiquetaModalProps) {
  const [modelo, setModelo] = useState<string>("Pimaco 6180");
  const [tipoCodigo, setTipoCodigo] = useState<"ean" | "sku">("ean");
  const [selecionados, setSelecionados] = useState<number[]>([]);
  
  const config = FORMATOS_ETIQUETA[modelo] || FORMATOS_ETIQUETA["Pimaco 6180"];
  const gridRef = useRef<HTMLDivElement>(null);

  const itensParaImprimir = useMemo<ItemImpressao[]>(() => {
    if (!listaProdutos) return [];
    
    return listaProdutos.flatMap((prod: any) => {
      const nomeProdPai = prod.dsNomeProduto || prod.dsNome || prod.nome || "Produto";
      const temVar = prod.isTemVariacoesProduto ?? prod.temVariacoes ?? (prod.variacoes?.length > 0);

      if (temVar && Array.isArray(prod.variacoes) && prod.variacoes.length > 0) {
        return prod.variacoes.map((v: any) => {
          const skuVal = v.dsSkuProduto || v.dsSku || v.sku || "SEM-SKU";
          const eanVal = v.dsEANGTINProduto || v.dsGtinProduto || v.ean || "";
          
          return {
            nome: v.dsNomeProduto || `${nomeProdPai} (${v.dsNomeVar1Produto || v.dsModeloProduto || ""} ${v.dsNomeVar2Produto || v.nrTamanhoProduto || ""})`,
            codigoAlvo: tipoCodigo === "ean" ? eanVal : skuVal,
            tipoRotulo: tipoCodigo === "ean" ? "EAN" : "SKU"
          };
        });
      }

      const skuVal = prod.dsSkuProduto || prod.dsSku || prod.sku || "SEM-SKU";
      const eanVal = prod.dsEANGTINProduto || prod.dsGtin || prod.ean || "";

      return [{
        nome: nomeProdPai,
        codigoAlvo: tipoCodigo === "ean" ? eanVal : skuVal,
        tipoRotulo: tipoCodigo === "ean" ? "EAN" : "SKU"
      }];
    });
  }, [listaProdutos, tipoCodigo]);

  useEffect(() => {
    if (isOpen && itensParaImprimir.length > 0) {
      setSelecionados(itensParaImprimir.map((_, index: number) => index));
    }
  }, [isOpen, itensParaImprimir]);

  const toggleSelecionarTodos = () => {
    if (selecionados.length === itensParaImprimir.length) {
      setSelecionados([]);
    } else {
      setSelecionados(itensParaImprimir.map((_, index: number) => index));
    }
  };

  const toggleSelecionarItem = (index: number) => {
    if (selecionados.includes(index)) {
      setSelecionados(selecionados.filter((i: number) => i !== index));
    } else {
      setSelecionados([...selecionados, index]);
    }
  };

  const imprimirSelecionadas = () => {
    if (!gridRef.current || selecionados.length === 0) {
      alert("Selecione pelo menos uma etiqueta para imprimir.");
      return;
    }

    const etiquetaElements = gridRef.current.querySelectorAll(".etiqueta-wrapper");
    const numColunas = config.colunas;
    let linhasHtml = "";
    let celulasNaLinha = "";
    let contadorValidas = 0;

    const elementosSelecionados = Array.from(etiquetaElements).filter((_, index: number) => selecionados.includes(index));

    elementosSelecionados.forEach((el, index) => {
      const cloneEl = el.cloneNode(true) as HTMLElement;
      const chk = cloneEl.querySelector(".checkbox-etiqueta");
      if (chk) chk.remove();

      celulasNaLinha += `
        <td style="width: ${config.largura}; min-width: ${config.largura}; max-width: ${config.largura}; height: ${config.altura}; min-height: ${config.altura}; max-height: ${config.altura}; padding: 1mm; vertical-align: middle; text-align: center; box-sizing: border-box;">
          <div style="width: ${config.largura}; height: ${config.altura}; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; overflow: hidden;">
            ${cloneEl.innerHTML}
          </div>
        </td>
      `;

      contadorValidas++;

      if (contadorValidas % numColunas === 0 || index === elementosSelecionados.length - 1) {
        const faltamNasColunas = numColunas - (contadorValidas % numColunas);
        if (contadorValidas % numColunas !== 0) {
          for (let i = 0; i < faltamNasColunas; i++) {
            celulasNaLinha += `
              <td style="width: ${config.largura}; min-width: ${config.largura}; max-width: ${config.largura}; height: ${config.altura}; min-height: ${config.altura}; max-height: ${config.altura}; padding: 1mm; box-sizing: border-box; visibility: hidden;">
                &nbsp;
              </td>
            `;
          }
        }

        linhasHtml += `<tr>${celulasNaLinha}</tr>`;
        celulasNaLinha = "";
      }
    });

    const printWindow = window.open("", "_blank", "width=900,height=600");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <style>
              @page { 
                size: A4 portrait; 
                margin: 5mm; 
              }
              body { 
                font-family: sans-serif; 
                margin: 0; 
                padding: 0;
                background: #fff;
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
              }
              table { 
                border-collapse: collapse; 
                width: 200mm; 
                table-layout: fixed; 
                margin: 0 auto;
              }
              td { 
                border: 1px dashed transparent; 
                box-sizing: border-box;
              }
              img { 
                max-width: 95%; 
                height: 35px; 
                object-fit: contain; 
              }
              .nome-prod { 
                font-size: ${config.font}px; 
                margin: 0 0 2px 0; 
                font-weight: 800; 
                color: #000000 !important; 
                text-align: center; 
                line-height: 1.1; 
                display: -webkit-box; 
                -webkit-line-clamp: 2; 
                -webkit-box-orient: vertical; 
                overflow: hidden; 
              }
              .codigo-text { 
                font-size: 11px; 
                font-weight: 900; 
                color: #000000 !important; 
                margin: 0; 
                letter-spacing: 0.5px; 
              }
            </style>
          </head>
          <body>
            <table>
              ${linhasHtml}
            </table>
            <script>
              window.onload = () => { 
                setTimeout(() => {
                  window.print(); 
                  window.close(); 
                }, 400);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (!isOpen) return null;

  const todasSelecionadas = selecionados.length === itensParaImprimir.length && itensParaImprimir.length > 0;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '15px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1e293b' }}>🖨️ Impressão de Etiquetas</h3>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px', alignItems: 'center' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>Folha:</label>
              <select value={modelo} onChange={(e) => setModelo(e.target.value)} style={{ padding: '6px', borderRadius: '6px', fontSize: '12px', border: '1px solid #cbd5e1' }}>
                {Object.keys(FORMATOS_ETIQUETA).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>Código:</span>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input type="radio" name="tipoCodigoEtiqueta" checked={tipoCodigo === "ean"} onChange={() => setTipoCodigo("ean")} /> EAN / GTIN
              </label>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input type="radio" name="tipoCodigoEtiqueta" checked={tipoCodigo === "sku"} onChange={() => setTipoCodigo("sku")} /> SKU
              </label>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={toggleSelecionarTodos} style={styles.btnSelectAll}>
                {todasSelecionadas ? "Desmarcar Todos" : "Selecionar Todos"}
              </button>
              <button onClick={onClose} style={styles.btnCancel}>Fechar</button>
              <button onClick={imprimirSelecionadas} style={styles.btnPrint}>
                Imprimir Selecionadas ({selecionados.length})
              </button>
            </div>
          </div>
        </div>

        <div ref={gridRef} style={{ 
          maxHeight: '60vh', overflowY: 'auto', display: 'grid', 
          gridTemplateColumns: `repeat(${config.colunas}, 1fr)`, gap: '10px', padding: '10px',
          justifyItems: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'
        }}>
          {itensParaImprimir.map((item: ItemImpressao, i: number) => (
            <BarcodeItem 
              key={i} 
              codigo={item.codigoAlvo} 
              nome={item.nome} 
              tipoRotulo={item.tipoRotulo} 
              config={config} 
              isChecked={selecionados.includes(i)}
              onToggle={() => toggleSelecionarItem(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface BarcodeItemProps {
  codigo: string;
  nome: string;
  tipoRotulo: string;
  config: FormatoEtiqueta;
  isChecked: boolean;
  onToggle: () => void;
}

function BarcodeItem({ codigo, nome, tipoRotulo, config, isChecked, onToggle }: BarcodeItemProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && codigo && codigo !== "SEM-SKU" && String(codigo).trim() !== "") {
      const normalizar = (v: string) => String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      
      try {
        JsBarcode(svgRef.current, normalizar(codigo), { 
          format: "CODE128", 
          width: 1.5, 
          height: 32, 
          displayValue: false, 
          margin: 0
        });
      } catch (err) {
        console.error("Erro ao gerar código de barras para o valor:", codigo, err);
      }
    }
  }, [codigo]);

  const temCodigoValido = codigo && codigo !== "SEM-SKU" && String(codigo).trim() !== "";

  return (
    <div 
      className="etiqueta-wrapper"
      onClick={onToggle}
      style={{ 
        border: isChecked ? '2px solid #2563eb' : '1px solid #cbd5e1', 
        background: isChecked ? '#eff6ff' : '#fff', 
        width: config.largura, 
        height: config.altura, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '4px', 
        boxSizing: 'border-box', 
        overflow: 'hidden', 
        borderRadius: '6px', 
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      }}
    >
      <div className="checkbox-etiqueta" style={{ position: 'absolute', top: '3px', left: '3px', zIndex: 5 }}>
        <input 
          type="checkbox" 
          checked={isChecked} 
          onChange={onToggle} 
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          style={{ cursor: 'pointer', width: '14px', height: '14px' }}
        />
      </div>

      <p className="nome-prod" style={{ fontSize: `${config.font}px`, fontWeight: '800', color: '#000000', margin: '0 0 2px 0', textAlign: 'center', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{nome}</p>
      
      {temCodigoValido ? (
        <>
          <svg ref={svgRef} style={{ maxWidth: '95%', height: '35px' }}></svg>
          <p className="codigo-text" style={{ fontSize: '11px', fontWeight: '900', color: '#000000', margin: 0, letterSpacing: '0.5px' }}>{codigo}</p>
        </>
      ) : (
        <p style={{ color: '#ef4444', fontSize: '10px', margin: 0, fontWeight: 'bold' }}>
          Sem {tipoRotulo} Válido
        </p>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modal: { background: '#fff', padding: '20px', borderRadius: '12px', textAlign: 'center', width: '90%', maxWidth: '850px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' },
  btnPrint: { padding: '6px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' },
  btnSelectAll: { padding: '6px 12px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' },
  btnCancel: { padding: '6px 14px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }
};