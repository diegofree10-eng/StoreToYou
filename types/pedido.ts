// types/pedido.ts

export interface Cliente {
  dsNome?: string;
  dsTelefone?: string;
  dsEmail?: string;
  dsCpf?: string;
  nmNomeCliente?: string;
  nome?: string;
  [key: string]: any;
}

export interface Endereco {
  dsRua?: string;
  dsNumero?: string;
  dsCep?: string;
  dsBairro?: string;
  dsCidade?: string;
  dsUf?: string;
  [key: string]: any;
}

export interface Financeiro {
  dsCupom?: string;
  isFreteGratis?: boolean;
  vlDesconto?: number;
  vlFrete?: number;
  vlSubtotal?: number;
  vlTotal?: number;
  subtotal?: number;
  valorSubtotal?: number;
  descontos?: number;
  discount?: number;
  frete?: number;
  total?: number;
  valorTotal?: number;
  freteGratis?: boolean;
  dsTransportadoraId?: string;
  metodo?: string;
  prazoEntrega?: number;
  [key: string]: any;
}

export interface ItemPedido {
  id?: string;
  idProduto?: string;
  dsFoto?: string;
  dsNomeProduto?: string;
  nome?: string;
  isPrecisaFrete?: boolean;
  vlPreco?: number;
  preco?: number;
  nrQty?: number;
  quantidade?: number;
  qty?: number;
  dsSku?: string;
  sku?: string;
  dsVariacao?: string;
  variacao?: string;
  respostasFormatadas?: Record<string, any>;
  personalizacao?: any;
  variacaoSelecionada?: {
    foto?: string;
    [key: string]: any;
  };
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
  isFreteGratis?: boolean;
  vlFrete?: number;
  [key: string]: any;
}

export interface Pedido {
  id: string;
  data: string; // 👈 Necessário para a ordenação e filtros do Dashboard
  cliente: string | Cliente; // 👈 Compatível com string ou objeto de cliente
  devolvido: boolean; // 👈 Necessário para a aba de devoluções e filtros de vendas
  numeroPedido?: number | string;
  numero?: number | string;
  status?: string;
  statusProducao?: string;
  StatusProducao?: {
    dsStatusProducao?: string;
    [key: string]: any;
  };
  pago?: boolean;
  retirada?: boolean;
  retirarNaLoja?: boolean;
  endereco?: any;
  dscliente?: Cliente;
  dsEndereco?: Endereco;
  financeiro: Financeiro;
  itens: ItemPedido[];
  logistica: Logistica;
  custoFreteLojista?: number;
  freteCusto?: number;
  [key: string]: any;
}