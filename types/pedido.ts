// types/pedido.ts

export interface Cliente {
    nmNomeCliente?: string;
    dsTelefoneCliente?: string;
    dsEmailCliente?: string;
    dsCpfCliente?: string;
}

export interface Endereco {
    dsRuaCliente?: string;
    dsNumeroCliente?: string;
    dsCepCliente?: string;
    dsBairroCliente?: string;
    dsCidadeCliente?: string;
    dsUfCliente?: string;
}

export interface Financeiro {
    dsCupom?: string;
    isFreteGratis?: boolean;
    vlDesconto?: number;
    vlFrete?: number;
    vlSubtotal?: number;
    vlTotal?: number;
    dsTransportadoraId?: string;
    dsMetodoPagamento?: string;
    vlEntrada?: number;
    vlRestante?: number;
    dsPrazoRestante?: string;
    dsFormaPagamentoCarrinho?: string;
    dsStatusPagamento?: string;
}

export interface ItemPedido {
    id?: string;
    idProduto?: string;
    dsFotoCapaProduto?: string;
    dsNomeProduto?: string;
    isPrecisaFreteProduto?: boolean;
    vlPrecoProduto?: number;
    quantidade?: number;
    dsSkuProduto?: string;
    dsNomeVariacao?: string;
    dsRespostasPersonalizadasProduto?: Record<string, any> | string;
    dsTipoProduto?: string;
    dsFormaEntrega?: string;
    variacaoSelecionada?: {
        dsFotoCapaProduto?: string;
        [key: string]: any;
    };
}

export interface Logistica {
    dsFormaEntrega?: string;
    isRetirada?: boolean;
    nrCodigoEnvio?: string;
    dsStatusEtiqueta?: string;
    dsNumRastreio?: string;
    vlValorCobrado?: number;
    isFreteGratis?: boolean;
    vlFrete?: number;
    dsServico?: string;
    [key: string]: any;
}

export interface Pedido {
    id: string;
    data: string;
    cliente: Cliente; // 🌟 Padronizado estritamente como objeto Cliente
    numeroPedido?: number | string;
    status?: string;
    origemPedido?: string;
    etiquetaGerada?: boolean;
    StatusProducao?: {
        dsStatusProducao?: string;
        isPago?: boolean;
        dsStatusPagamento?: string;
        [key: string]: any;
    };
    endereco?: Endereco;
    financeiro: Financeiro;
    itens: ItemPedido[];
    logistica: Logistica;
    Etiqueta?: {
        IdEtiqueta?: string;
        codigoEnvio?: string;
        dsStatusEtiqueta?: string;
        dsNumRastreio?: string;
        servicoVinculado?: string;
        vlValorCobrado?: number;
        urlEtiqueta?: string;
        [key: string]: any;
    };
    [key: string]: any;
}