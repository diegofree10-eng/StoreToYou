export interface Cliente {
  dsNome: string;
  dsTelefone: string;
  dsEmail: string;
  dsCpf: string;
}

export interface Endereco {
  dsRua: string;
  dsNumero: string;
  dsCep: string;
  dsBairro: string;
  dsCidade: string;
  dsUf: string;
}

export interface Financeiro {
  dsCupom: string;
  isFreteGratis: boolean;
  vlDesconto: number;
  vlFrete: number;
  vlSubtotal: number;
  vlTotal: number;
}

export interface ItemPedido {
  dsFoto: string;
  idProduto: string;
  dsNomeProduto: string;
  isPrecisaFrete: boolean;
  vlPreco: number;
  nrQty: number;
  dsSku: string;
  dsVariacao: string;
  respostasFormatadas: Record<string, any>;
}

export interface Logistica {
  dsFormaEntrega: string;
  isRetirada: boolean;
  nrPedido: string;
  isRetirarNaLoja: boolean;
  isPedidoPago: boolean;
  tsCriacaoPedido: string;
}

export interface Pedido {
  dscliente: Cliente;
  dsEndereco: Endereco;
  financeiro: Financeiro;
  itens: ItemPedido[];
  logistica: Logistica;
}