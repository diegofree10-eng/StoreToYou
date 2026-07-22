import { Pedido } from "@/types/pedido";

/**
 * Adapter que traduz do formato "bagunçado" do banco para o padrão "limpo" (Pedido).
 */
export const formatarPedidoParaPadrao = (dados: any): Pedido => {
  if (!dados) return {} as Pedido;

  return {
    dscliente: {
      dsNome: dados.dscliente?.dsNome || dados.cliente?.nmNome || dados.cliente?.nome || "",
      dsTelefone: dados.dscliente?.dsTelefone || dados.cliente?.dsTelefone || dados.cliente?.telefone || "",
      dsEmail: dados.dscliente?.dsEmail || dados.cliente?.dsEmail || dados.cliente?.email || "",
      dsCpf: dados.dscliente?.dsCpf || dados.cliente?.dsCpf || dados.cliente?.cpf || ""
    },
    dsEndereco: {
      dsRua: dados.dsEndereco?.dsRua || dados.endereco?.dsRua || dados.endereco?.rua || "",
      dsNumero: dados.dsEndereco?.dsNumero || dados.endereco?.dsNumero || dados.endereco?.numero || "",
      dsCep: dados.dsEndereco?.dsCep || dados.endereco?.dsCep || dados.endereco?.cep || "",
      dsBairro: dados.dsEndereco?.dsBairro || dados.endereco?.dsBairro || dados.endereco?.bairro || "",
      dsCidade: dados.dsEndereco?.dsCidade || dados.endereco?.dsCidade || dados.endereco?.cidade || "",
      dsUf: dados.dsEndereco?.dsUf || dados.endereco?.dsUf || dados.endereco?.uf || ""
    },
    financeiro: {
      dsCupom: dados.financeiro?.dsCupom || dados.dsCupom || "",
      isFreteGratis: !!(dados.financeiro?.isFreteGratis ?? dados.isFreteGratis ?? false),
      vlDesconto: Number(dados.financeiro?.vlDesconto || dados.vlDesconto || 0),
      vlFrete: Number(dados.financeiro?.vlFrete || dados.vlFrete || 0),
      vlSubtotal: Number(dados.financeiro?.vlSubtotal || dados.vlSubtotal || 0),
      vlTotal: Number(dados.financeiro?.vlTotal || dados.vlTotal || 0)
    },
    itens: (dados.itens || []).map((i: any) => ({
      dsFoto: i.dsFoto || i.foto || "",
      idProduto: i.idProduto || i.id || "",
      dsNomeProduto: i.dsNomeProduto || i.nomeProduto || i.nome || "Produto",
      isPrecisaFrete: !!(i.isPrecisaFrete ?? i.precisaFrete ?? true),
      vlPreco: Number(i.vlPreco || i.preco || 0),
      nrQty: Number(i.nrQty || i.qty || i.quantidade || 1),
      dsSku: i.dsSku || i.sku || "",
      dsVariacao: i.dsVariacao || i.variacao || "",
      respostasFormatadas: i.respostasFormatadas || {}
    })),
    logistica: {
      dsFormaEntrega: dados.logistica?.dsFormaEntrega || dados.dsFormaEntrega || "",
      isRetirada: !!(dados.logistica?.isRetirada ?? dados.isRetirada ?? false),
      nrPedido: dados.logistica?.nrPedido || dados.nrPedido || "",
      isRetirarNaLoja: !!(dados.logistica?.isRetirarNaLoja ?? dados.retirarNaLoja ?? false),
      isPedidoPago: !!(dados.logistica?.isPedidoPago ?? dados.pedidoPago ?? false),
      tsCriacaoPedido: dados.logistica?.tsCriacaoPedido || dados.tsCriacaoPedido || new Date().toISOString()
    }
  };
};