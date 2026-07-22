import { Pedido } from "@/types/pedido";

/**
 * Fabrica de Pedidos: Garante que qualquer dado (vindo do form ou API)
 * seja convertido para o contrato oficial do sistema.
 */
export const criarEstruturaPedido = (dados: any): Pedido => {
  return {
    dscliente: {
      dsNome: String(dados.dsNome || ""),
      dsTelefone: String(dados.dsTelefone || ""),
      dsEmail: String(dados.dsEmail || ""),
      dsCpf: String(dados.dsCpf || "")
    },
    dsEndereco: {
      dsRua: String(dados.dsRua || ""),
      dsNumero: String(dados.dsNumero || ""),
      dsCep: String(dados.dsCep || ""),
      dsBairro: String(dados.dsBairro || ""),
      dsCidade: String(dados.dsCidade || ""),
      dsUf: String(dados.dsUf || "")
    },
    financeiro: {
      dsCupom: String(dados.dsCupom || ""),
      isFreteGratis: !!dados.isFreteGratis,
      vlDesconto: Number(dados.vlDesconto || 0),
      vlFrete: Number(dados.vlFrete || 0),
      vlSubtotal: Number(dados.vlSubtotal || 0),
      vlTotal: Number(dados.vlTotal || 0)
    },
    itens: (Array.isArray(dados.itens) ? dados.itens : []).map((i: any) => ({
      dsFoto: String(i.dsFoto || ""),
      idProduto: String(i.idProduto || ""),
      dsNomeProduto: String(i.dsNomeProduto || ""),
      isPrecisaFrete: !!i.isPrecisaFrete,
      vlPreco: Number(i.vlPreco || 0),
      nrQty: Number(i.nrQty || 1),
      dsSku: String(i.dsSku || ""),
      dsVariacao: String(i.dsVariacao || ""),
      respostasFormatadas: i.respostasFormatadas || {}
    })),
    logistica: {
      dsFormaEntrega: String(dados.dsFormaEntrega || ""),
      isRetirada: !!dados.isRetirada,
      nrPedido: String(dados.nrPedido || ""),
      isRetirarNaLoja: !!dados.isRetirarNaLoja,
      isPedidoPago: !!dados.isPedidoPago,
      tsCriacaoPedido: dados.tsCriacaoPedido || new Date().toISOString()
    }
  };
};