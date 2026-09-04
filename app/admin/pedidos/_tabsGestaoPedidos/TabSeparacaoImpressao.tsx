// app/admin/pedidos/_tabsGestaoPedidos/TabSeparacaoImpressao.tsx
'use client';
import React, { useState } from 'react';
import { Pedido } from '@/types/pedido';

interface TabSeparacaoProps {
  pedidos: Pedido[];
}

export default function TabSeparacaoImpressao({ pedidos }: TabSeparacaoProps) {
  const [selecionados, setSelecionados] = useState<string[]>([]);

  const toggleSelectAll = () => {
    const todosIds = pedidos.map(p => p.id);
    const selecionadosTodos = todosIds.every(id => selecionados.includes(id));
    setSelecionados(selecionadosTodos ? [] : todosIds);
  };

  const imprimirListaSeparacao = () => {
    if (selecionados.length === 0) return alert("⚠️ Nenhum pedido selecionado!");
    const pToPrint = pedidos.filter(p => selecionados.includes(p.id));

    const win = window.open("", "_blank", "width=800,height=900");
    if (win) {
      const lines = pToPrint.map(p => {
        const clienteObj = (p as any).dsCliente || (typeof p.cliente === 'object' && p.cliente !== null ? p.cliente : {});
        const clienteNome = typeof clienteObj === 'object' ? ((clienteObj as any).nmNomeCliente || (clienteObj as any).nome || (clienteObj as any).dsNomeCliente || "Cliente") : (p.cliente || "Cliente");
        
        return `
          <tr style="border-bottom: 1px solid #000;">
            <td style="padding: 6px; font-size: 12px; font-weight: bold; vertical-align: top;">#${(p as any).numeroPedido || p.numero || p.id.slice(-4)}</td>
            <td style="padding: 6px; font-size: 12px; vertical-align: top;">${clienteNome}</td>
            <td style="padding: 6px; font-size: 12px; vertical-align: top;">
              ${Array.isArray(p.itens) ? p.itens.map((i: any) => `
                <div style="margin-bottom: 6px; border-bottom: 1px dotted #ccc; padding-bottom: 2px;">
                  <strong>${i.dsNomeProduto || i.nome || i.title}</strong> (${i.nrQuantidadeProduto || i.quantidade || i.qty || 1}x)<br>
                  <small style="color: #000; font-weight: bold;">SKU: ${i.dsSkuProduto || i.sku || 'N/A'}</small>
                  ${i.dsVariacaoProduto || i.variacao ? `<br><small style="color: #444;">Var: ${i.dsVariacaoProduto || i.variacao}</small>` : ''}
                </div>
              `).join('') : ''}
            </td>
          </tr>
        `;
      }).join('');

      win.document.write(`
        <html>
          <head>
            <style>
              body { font-family: sans-serif; margin: 5mm; }
              table { width: 100%; border-collapse: collapse; }
              th { border-bottom: 2px solid #000; padding: 6px; font-size: 12px; text-align: left; }
            </style>
          </head>
          <body>
            <h3 style="margin: 0 0 10px 0; font-size: 16px;">Lista de Separação (${pToPrint.length} pedidos)</h3>
            <table>
              <thead>
                <tr><th>Pedido</th><th>Cliente</th><th>Produto / SKU / Detalhes</th></tr>
              </thead>
              <tbody>${lines}</tbody>
            </table>
            <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  const imprimirEtiquetas = () => {
    const pToPrint = selecionados.length > 0
      ? pedidos.filter(p => selecionados.includes(p.id) && p.etiquetaGerada && (p as any).urlEtiqueta)
      : pedidos.filter(p => p.etiquetaGerada && (p as any).urlEtiqueta);

    if (pToPrint.length === 0) return alert("Nenhum pedido selecionado possui etiqueta gerada.");

    const win = window.open("", "_blank", "width=800,height=900");
    if (win) {
      win.document.write(`
        <html>
          <head>
            <style>
              @page { size: A4; margin: 0; }
              body { margin: 0; padding: 0; display: flex; flex-wrap: wrap; }
              .etiqueta { width: 105mm; height: 148mm; border: 1px solid #eee; box-sizing: border-box; overflow: hidden; }
              @media print { .etiqueta { page-break-inside: avoid; } }
            </style>
          </head>
          <body>
            ${pToPrint.map(p => `
              <div class="etiqueta">
                <img src="${(p as any).urlEtiqueta}" style="width:100%; height:100%; object-fit: contain;"/>
              </div>
            `).join('')}
            <script>window.print(); window.onafterprint=()=>window.close();</script>
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  return (
    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>🖨️ Central de Separação e Impressão</h3>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={imprimirListaSeparacao} style={{ padding: '10px 16px', backgroundColor: "#34495e", color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
          🖨️ Imprimir Lista de Separação
        </button>
        <button onClick={imprimirEtiquetas} style={{ padding: '10px 16px', backgroundColor: "#059669", color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
          🖨️ Imprimir Etiquetas (A6)
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#f8fafc', borderRadius: '6px', marginBottom: '15px' }}>
        <input type="checkbox" onChange={toggleSelectAll} style={{ transform: 'scale(1.2)' }} />
        <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#334155' }}>Selecionar / Desmarcar Todos os Pedidos</span>
      </div>

      {pedidos.map(p => {
        const clienteObj = (p as any).dsCliente || (typeof p.cliente === 'object' && p.cliente !== null ? p.cliente : {});
        const clienteNome = typeof clienteObj === 'object' ? ((clienteObj as any).nmNomeCliente || (clienteObj as any).nome || (clienteObj as any).dsNomeCliente || "Cliente") : (p.cliente || "Cliente");

        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderBottom: '1px solid #e2e8f0' }}>
            <input
              type="checkbox"
              checked={selecionados.includes(p.id)}
              onChange={() => setSelecionados(prev => prev.includes(p.id) ? prev.filter(i => i !== p.id) : [...prev, p.id])}
            />
            <span style={{ fontSize: '14px', color: '#334155' }}>
              <b>#{(p as any).numeroPedido || p.id.slice(-4)}</b> - {clienteNome}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Focada na geração de lista de separação (com SKU e detalhes)
// e impressão de folhas de etiquetas A6.