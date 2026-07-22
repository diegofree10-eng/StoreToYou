import Papa from "papaparse";

export interface DadosConsolidadosCanal {
  canal: "shopee" | "mercado_livre" | "tiktok" | "desconhecido";
  mesAno: string; // Formato: "MM/AAAA"
  valorLiquidoRecebido: number;
}

export const processarCsvMarketplace = (file: File): Promise<DadosConsolidadosCanal> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const linhas = results.data as any[];
        if (linhas.length === 0) {
          return reject("O arquivo CSV está vazio.");
        }

        // Pega as chaves (colunas) da primeira linha para identificar o canal
        const colunas = Object.keys(linhas[0]);
        
        let canal: "shopee" | "mercado_livre" | "tiktok" | "desconhecido" = "desconhecido";
        let valorLiquidoTotal = 0;
        let dataReferenciaStr = "";

        // 🕵️ Detecção Automática de Canais por Colunas Críticas
        if (colunas.includes("ID da ordem") || colunas.includes("Nº da compensação")) {
          canal = "shopee";
        } else if (colunas.includes("Nº do anúncio") || colunas.includes("Custo de envio por conta do vendedor")) {
          canal = "mercado_livre";
        } else if (colunas.includes("Order ID") || colunas.includes("TikTok SKU")) {
          canal = "tiktok";
        }

        if (canal === "desconhecido") {
          return reject("Não foi possível identificar o Marketplace parceiro por este arquivo CSV.");
        }

        // 🧮 Processamento Matemático do Valor de Sobra Líquido Recebido
        linhas.forEach((linha) => {
          if (canal === "shopee") {
            // Shopee: Pega o valor pago revertido ou líquido se disponível, deduzindo taxas locais
            // Geralmente na Shopee o campo "Valor Estimado do Escrow" ou "Preço Unitário" deduzido
            const liquido = Number(linha["Total pago pelo comprador"] || linha["Preço Original"]) - 
                            Number(linha["Taxa de Comissão"] || 0) - 
                            Number(linha["Custo do Frete Pago pelo Comprador"] || 0);
            if (!isNaN(liquido)) valorLiquidoTotal += liquido;
            if (!dataReferenciaStr) dataReferenciaStr = linha["Data de criação do pedido"] || linha["Data do pedido"];
          }
          
          if (canal === "mercado_livre") {
            // Mercado Livre: Coluna "Líquido creditado" ou valor total menos tarifa e frete grátis do lojista
            const totalItem = Number(linha["Preço unitário"] || 0) * Number(linha["Quantidade"] || 1);
            const tarifasML = Number(linha["Tarifa de venda / Tarifa de parcelamento"] || 0) + 
                              Number(linha["Custo de envio por conta do vendedor"] || 0);
            const liquido = totalItem - tarifasML;
            if (!isNaN(liquido)) valorLiquidoTotal += liquido;
            if (!dataReferenciaStr) dataReferenciaStr = linha["Data de venda"];
          }

          if (canal === "tiktok") {
            // TikTok Shop: Valor líquido de liquidação após subsídios e comissões da ByteDance
            const liquido = Number(linha["Settlement Amount"] || linha["Subtotal"]) - Number(linha["Platform Commission"] || 0);
            if (!isNaN(liquido)) valorLiquidoTotal += liquido;
            if (!dataReferenciaStr) dataReferenciaStr = linha["Order Creation Time"];
          }
        });

        // 📅 Extração Inteligente do Mês/Ano para Consolidação
        let mesAno = "Mês Desconhecido";
        if (dataReferenciaStr) {
          // Tenta quebrar formatos DD/MM/AAAA ou AAAA-MM-DD
          const partes = dataReferenciaStr.split(/[/-]/);
          if (partes.length >= 3) {
            // Se o primeiro elemento tiver 4 dígitos, é AAAA-MM-DD
            if (partes[0].length === 4) {
              mesAno = `${partes[1]}/${partes[0]}`;
            } else {
              mesAno = `${partes[1]}/${partes[2].substring(0, 4)}`;
            }
          }
        }

        resolve({
          canal,
          mesAno,
          valorLiquidoRecebido: Math.max(0, valorLiquidoTotal)
        });
      },
      error: (err) => reject(err.message)
    });
  });
};