// utils/impressaoPedido.ts

export const imprimirRecibo = (dados: any) => {
  const { cliente, carrinho, subtotal, total, entrega, pagto, pedidoId, numeroPedido, numero } = dados;

  // 🌟 Pega o número sequencial correto do helper e formata com 5 dígitos (ex: #00228)
  const numBruto = numeroPedido || numero || pedidoId || "";
  const numPedidoFormatado = String(numBruto).replace(/\D/g, "");
  const pedidoExibicao = numPedidoFormatado.length <= 6 && !isNaN(Number(numPedidoFormatado))
    ? numPedidoFormatado.padStart(5, '0')
    : String(numBruto).slice(-5);

  const janelaImpressao = window.open('', '_blank', 'width=450,height=700');
  if (!janelaImpressao) return;

  const html = `
    <html>
      <head>
        <title>Recibo - Pedido #${pedidoExibicao}</title>
        <style>
          /* Estilo padrão para Bobina Térmica (80mm) e visualização rápida */
          body { 
            font-family: 'Courier New', Courier, monospace; 
            width: 100%; 
            max-width: 300px; 
            margin: 0 auto; 
            padding: 5px; 
            color: #000; 
            background: #fff;
            font-size: 11px;
          }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
          .dados-cliente { font-size: 10px; margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
          .item { display: flex; justify-content: space-between; font-size: 11px; margin: 4px 0; }
          .total { border-top: 1px dashed #000; margin-top: 8px; padding-top: 6px; font-weight: bold; font-size: 12px; }
          .rodape { text-align: center; margin-top: 15px; font-size: 9px; border-top: 1px dashed #000; pt: 5px; }

          /* Regras especiais para Impressora Comum / Folha A4 */
          @media print {
            body {
              max-width: 100%;
              width: 100%;
              font-size: 13px;
            }
            /* Se o lojista escolher A4, o cupom fica centralizado de forma elegante em vez de esticar desproporcionalmente */
            .wrapper-recibo {
              width: 350px;
              margin: 0 auto;
              border: 1px solid #ccc;
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="wrapper-recibo">
          <div class="header">
            <strong style="font-size: 13px;">COMPROVANTE DE VENDA</strong><br>
            <span>Pedido #${pedidoExibicao}</span><br>
            <span style="font-size: 9px;">${new Date().toLocaleString()}</span>
          </div>
          
          <div class="dados-cliente">
            <strong>Cliente:</strong> ${cliente.nmNomeCliente || "Balcão"}<br>
            ${cliente.dsTelefoneCliente ? `<strong>Tel:</strong> ${cliente.dsTelefoneCliente}<br>` : ""}
            ${cliente.dsCpfCliente ? `<strong>CPF:</strong> ${cliente.dsCpfCliente}` : ""}
          </div>

          <div style="font-weight: bold; margin-bottom: 4px; font-size: 10px;">ITENS DO PEDIDO:</div>
          
          ${carrinho.map((item: any) => `
            <div class="item">
              <span>${item.quantidade}x ${item.nome}</span>
              <span>R$ ${(item.preco * item.quantidade).toFixed(2)}</span>
            </div>
            ${item.personalizacao && Object.values(item.personalizacao).some(Boolean) ? `
              <div style="font-size: 9px; color: #444; padding-left: 10px; margin-bottom: 4px;">
                ${Object.entries(item.personalizacao).map(([k, v]) => v ? `${k}: ${v} ` : '').join('|')}
              </div>
            ` : ''}
            ${item.nrDiasProducao ? `
              <div style="font-size: 9px; color: #444; padding-left: 10px; margin-bottom: 4px;">
                Produção: ${item.nrDiasProducao} dias úteis
              </div>
            ` : ''}
          `).join('')}

          <div class="total">
            <div class="item"><span>Subtotal:</span> <span>R$ ${subtotal.toFixed(2)}</span></div>
            ${entrega > 0 ? `<div class="item"><span>Taxa de Entrega:</span> <span>R$ ${entrega.toFixed(2)}</span></div>` : ''}
            <div class="item" style="font-size: 14px; margin-top: 4px;"><span>TOTAL GERAL:</span> <span>R$ ${total.toFixed(2)}</span></div>
          </div>

          <div class="rodape">
            <p><strong>Forma de Pagamento:</strong> ${pagto.tipo.toUpperCase()}</p>
            ${pagto.entrada > 0 ? `
              <p>Entrada Paga: R$ ${pagto.entrada.toFixed(2)}<br>
              Restante: R$ ${(total - pagto.entrada).toFixed(2)}</p>
            ` : ''}
            <br>
            <p>Obrigado pela preferência! Volte sempre.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  janelaImpressao.document.write(html);
  janelaImpressao.document.close();
  
  setTimeout(() => {
    janelaImpressao.print();
    janelaImpressao.close();
  }, 400);
};