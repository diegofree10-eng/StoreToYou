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
  dsCupom?: string;
  isFreteGratis?: boolean;
  vlDesconto?: number;
  vlFrete?: number;
  vlSubtotal?: number;
  vlTotal?: number;
  dsTransportadoraId?: string;
  metodo?: string;
  prazoEntrega?: number;
  [key: string]: any; // Permite flexibilidade caso outras chaves existam
}

export interface ItemPedido {
  dsFoto?: string;
  idProduto?: string;
  dsNomeProduto?: string;
  isPrecisaFrete?: boolean;
  vlPreco?: number;
  nrQty?: number;
  dsSku?: string;
  dsVariacao?: string;
  respostasFormatadas?: Record<string, any>;
  personalizacao?: any; // <--- Adicione esta linha
  [key: string]: any;
}

export interface Logistica {
  dsFormaEntrega?: string;
  isRetirada?: boolean;
  nrPedido?: string;
  isRetirarNaLoja?: boolean;
  isPedidoPago?: boolean;
  tsCriacaoPedido?: string;
  dsTransportadoraId?: string | null;
  dsMetodoPagamento?: string;
  isFreteGratis?: boolean; // <--- Adicione esta linha
  [key: string]: any;
}

export interface Pedido {
  id: string; // <--- Garanta que seja string obrigatória
  etiquetaGerada?: boolean;
  status?: string;
  statusProducao?: string;
  numeroPedido?: number | string;
  numero?: number | string;
  pago?: boolean;
  retirada?: boolean;
  retirarNaLoja?: boolean;
  endereco?: any;
  dscliente: Cliente;
  dsEndereco: Endereco;
  financeiro: Financeiro;
  itens: ItemPedido[];
  logistica: Logistica;
  [key: string]: any;
}
