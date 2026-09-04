// utils/calculoEmbalagens

export interface ItemCarrinho {
  produtoId?: string;
  id?: string;
  quantidade?: number;
  qty?: number;
  nrQuantidadeProduto?: number;

  nrPesoProduto?: number;
  nrAlturaProduto?: number;
  nrLarguraProduto?: number;
  nrComprimentoProduto?: number;
  peso?: number;
  altura?: number;
  largura?: number;
  comprimento?: number;

  precisaFrete?: boolean;
  isPrecisaFreteProduto?: boolean;
}

export interface EmbalagemPadrao {
  id?: string;
  dsModeloEmbalagemRecomendado: string;
  vlCustoEmbalagemRecomendado: number;
  dsTipoEmbalagem: string;
}

export interface ResultadoEmbalagemPedido {
  custoTotalEmbalagem: number;
  embalagensUtilizadas: Array<{
    nomeInsumo: string;
    custo: number;
  }>;
  dimensoesPacoteFinal: {
    altura: number;
    largura: number;
    comprimento: number;
    pesoTotal: number;
  };
  embalagemPadrao: EmbalagemPadrao;
}

export function calcularEmbalagemEspecificaDoPedido(
  itens: ItemCarrinho[],
  insumosDisponiveisCadastrados: any[] = []
): ResultadoEmbalagemPedido {

  // Dimensões mínimas padrão dos Correios / transportadoras
  let maiorLarguraGlobal = 11;
  let maiorComprimentoGlobal = 16;
  let alturaTotalPilhadaGlobal = 0;
  let pesoTotalGlobal = 0;

  const itensValidos = Array.isArray(itens)
    ? itens.filter(i => i.precisaFrete !== false && i.isPrecisaFreteProduto !== false)
    : [];

  console.log("📦 [MOTOR DE EMBALAGEM] Itens válidos recebidos:", itensValidos.length);

  for (const item of itensValidos) {
    const qtdItem = Number(item.nrQuantidadeProduto ?? item.qty ?? item.quantidade ?? 1);

    const altUnit = Number(item.nrAlturaProduto ?? item.altura ?? 1);
    const largUnit = Number(item.nrLarguraProduto ?? item.largura ?? 20);
    const compUnit = Number(item.nrComprimentoProduto ?? item.comprimento ?? 30);
    const pesoUnit = Number(item.nrPesoProduto ?? item.peso ?? 0.4);

    console.log(`🔍 Item lido -> Qtd: ${qtdItem}, Alt: ${altUnit}, Larg: ${largUnit}, Comp: ${compUnit}, Peso: ${pesoUnit}`);

    pesoTotalGlobal += (pesoUnit * qtdItem);

    // Considera o maior item individual para as bases, somando quantidade na altura de forma segura
    if (largUnit > maiorLarguraGlobal) maiorLarguraGlobal = largUnit;
    if (compUnit > maiorComprimentoGlobal) maiorComprimentoGlobal = compUnit;

    // Altura acumulada considerando a quantidade de itens empilhados
    alturaTotalPilhadaGlobal += (altUnit * qtdItem);
  }

  const larguraFinal = Math.max(maiorLarguraGlobal, 11);
  const comprimentoFinal = Math.max(maiorComprimentoGlobal, 16);

  // 🌟 CÁLCULO DA ALTURA REAL PURA:
  // - Removemos o piso artificial de 0.5 cm ou 1.0 cm para que a pilha reflita estritamente a matemática dos itens.
  // - Aplicamos apenas um limite técnico mínimo infinitesimal (ex: 0.01) para evitar altura zero absoluta, 
  //   mas mantendo a precisão exata da multiplicação (ex: 4 * 0.03 = 0.12 cm, ou se passar de 1 cm, assume o valor real).
  const alturaCalculadaReal = Math.max(alturaTotalPilhadaGlobal, 0.01);
  const alturaFinal = Number(alturaCalculadaReal.toFixed(2));

  console.log("📦 [MOTOR DE EMBALAGEM] Dimensões finais consolidadas do pacote:", {
    larguraFinal,
    comprimentoFinal,
    alturaFinal,
    pesoTotalGlobal
  });

  console.log("📦 [MOTOR DE EMBALAGEM] Insumos cadastrados disponíveis:", insumosDisponiveisCadastrados.length);

  let insumoEscolhido: any = null;

  if (Array.isArray(insumosDisponiveisCadastrados) && insumosDisponiveisCadastrados.length > 0) {
    const compativeis = insumosDisponiveisCadastrados.filter(insumo => {
      const lMax = Number(insumo.nrLarguraMaxInsumo ?? insumo.larguraMax ?? insumo.largura ?? 0);
      const cMax = Number(insumo.nrComprimentoMaxInsumo ?? insumo.comprimentoMax ?? insumo.comprimento ?? 0);
      const aMax = Number(insumo.nrAlturaMaxInsumo ?? insumo.alturaMax ?? insumo.altura ?? 0);

      const nomeInsumo = insumo.dsNomeEmbalagem || insumo.dsNomeInsumo || insumo.nome || "Embalagem Padrão";
      const tipoInsumo = insumo.dsTipoEmbalagem || insumo.dsTipoInsumo || insumo.tipo || "envelope_seguranca";
      const custoInsumo = Number(insumo.vlCustoUnitarioEmbalagem ?? insumo.vlCustoEmbalagem ?? insumo.vlCustoInsumo ?? insumo.custo ?? 0);

      const atende = lMax >= larguraFinal && cMax >= comprimentoFinal && aMax >= alturaFinal;

      console.log(`   └─ Insumo [${nomeInsumo}] (Tipo: ${tipoInsumo}, Custo: R$ ${custoInsumo}) -> Max: L=${lMax}, C=${cMax}, A=${aMax} | Compatível? ${atende}`);
      return atende;
    });

    if (compativeis.length > 0) {
      compativeis.sort((a, b) => {
        const volA = (Number(a.nrLarguraMaxInsumo ?? a.larguraMax ?? 1)) * (Number(a.nrComprimentoMaxInsumo ?? a.comprimentoMax ?? 1)) * (Number(a.nrAlturaMaxInsumo ?? a.alturaMax ?? 1));
        const volB = (Number(b.nrLarguraMaxInsumo ?? b.larguraMax ?? 1)) * (Number(b.nrComprimentoMaxInsumo ?? b.comprimentoMax ?? 1)) * (Number(b.nrAlturaMaxInsumo ?? b.alturaMax ?? 1));
        return volA - volB;
      });
      insumoEscolhido = compativeis[0];
    } else {
      console.warn("⚠️ Nenhum insumo comportou o pacote perfeitamente. Pegando a maior caixa por fallback...");
      const porVolumeDesc = [...insumosDisponiveisCadastrados].sort((a, b) => {
        const volA = (Number(a.nrLarguraMaxInsumo ?? a.larguraMax ?? 1)) * (Number(a.nrComprimentoMaxInsumo ?? a.comprimentoMax ?? 1)) * (Number(a.nrAlturaMaxInsumo ?? a.alturaMax ?? 1));
        const volB = (Number(b.nrLarguraMaxInsumo ?? b.larguraMax ?? 1)) * (Number(b.nrComprimentoMaxInsumo ?? b.comprimentoMax ?? 1)) * (Number(b.nrAlturaMaxInsumo ?? b.alturaMax ?? 1));
        return volB - volA;
      });
      insumoEscolhido = porVolumeDesc[0];
    }
  } else {
    console.warn("❌ ATENÇÃO: Nenhum insumo de embalagem foi passado para a função unificada!");
  }

  // 🌟 Extração segura do ID e propriedades finais do insumo escolhido
  const idInsumoFinal = insumoEscolhido?.id || insumoEscolhido?.insumoId || "";
  const nomeInsumoFinal = insumoEscolhido?.dsNomeEmbalagem || insumoEscolhido?.dsNomeInsumo || insumoEscolhido?.nome || "Embalagem Padrão";
  const custoInsumoFinal = Number(insumoEscolhido?.vlCustoUnitarioEmbalagem ?? insumoEscolhido?.vlCustoEmbalagem ?? insumoEscolhido?.vlCustoInsumo ?? insumoEscolhido?.custo ?? 0);
  const tipoInsumoFinal = insumoEscolhido?.dsTipoEmbalagem || insumoEscolhido?.dsTipoInsumo || insumoEscolhido?.tipo || "envelope_seguranca";

  console.log(`📦 [MOTOR DE EMBALAGEM] Embalagem Recomendada: ${nomeInsumoFinal} (ID: ${idInsumoFinal}) | Tipo: ${tipoInsumoFinal} | Custo: R$ ${custoInsumoFinal.toFixed(2)}`);

  return {
    custoTotalEmbalagem: custoInsumoFinal,
    embalagensUtilizadas: [
      {
        nomeInsumo: nomeInsumoFinal,
        custo: custoInsumoFinal
      }
    ],
    dimensoesPacoteFinal: {
      altura: alturaFinal,
      largura: larguraFinal,
      comprimento: comprimentoFinal,
      pesoTotal: Number(pesoTotalGlobal.toFixed(2))
    },
    embalagemPadrao: {
      id: idInsumoFinal,
      dsModeloEmbalagemRecomendado: nomeInsumoFinal,
      vlCustoEmbalagemRecomendado: custoInsumoFinal,
      dsTipoEmbalagem: tipoInsumoFinal
    }
  };
}