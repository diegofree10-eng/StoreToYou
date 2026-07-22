export interface Produto {
  id: string;
  nome: string;
  title?: string; // <--- O TypeScript estava reclamando justamente deste campo
  preco: number;
  price?: number; 
  qty: number;
  slug?: string;
  cartItemKey?: string;
  requisitos?: any;
  variacao?: string;
  nomeVar1?: string;
  nomeVar2?: string;
  precisaFrete?: boolean;
  envioTransportadora?: boolean;
  permiteRetirada?: boolean;
  foto?: string;
  imagem?: string;
  url?: string;
  sku?: string;
  [key: string]: any; 
}