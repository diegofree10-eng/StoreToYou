// utils/conversaoUnidades.ts
/**
 * Tabela de conversão base para o Sistema Internacional (SI)
 * - Comprimento base: Metro (m)
 * - Peso base: Quilograma (kg)
 * - Volume base: Litro (l)
 * - Área base: Metro Quadrado (m²)
 */
const FATORES_CONVERSAO: Record<string, Record<string, number>> = {
  // --- COMPRIMENTO (Base: Metro) ---
  comprimento: {
    mm: 0.001,
    cm: 0.01,
    m: 1,
    km: 1000,
  },
  // --- PESO / MASSA (Base: Quilograma) ---
  peso: {
    mg: 0.000001,
    g: 0.001,
    kg: 1,
    ton: 1000,
  },
  // --- VOLUME / CAPACIDADE (Base: Litro) ---
  volume: {
    ml: 0.001,
    l: 1,
    m3: 1000, // 1 m³ = 1000 litros
  },
  // --- ÁREA (Base: Metro Quadrado) ---
  area: {
    cm2: 0.0001,
    m2: 1,
  },
  // --- CONTAGEM DISCRETA (Sem conversão cruzada direta, exceto mesmas famílias) ---
  contagem: {
    un: 1,
    pc: 1,
    pct: 1,
    fd: 1,
    dz: 12, // 1 dúzia = 12 unidades
  },
};

/**
 * Identifica a categoria de uma unidade de medida
 */
const obterCategoriaUnidade = (unidade: string): string | null => {
  const u = unidade.toLowerCase().trim();
  for (const [categoria, unidades] of Object.entries(FATORES_CONVERSAO)) {
    if (u in unidades) {
      return categoria;
    }
  }
  return null;
};

/**
 * Converte um valor de uma unidade de origem para uma unidade de destino.
 * Ex: converter(500, 'g', 'kg') -> Retorna 0.5
 * Ex: converter(2, 'm', 'cm') -> Retorna 200
 */
export const converterUnidade = (
  quantidade: number,
  unidadeOrigem: string,
  unidadeDestino: string
): number => {
  const uOrigem = unidadeOrigem.toLowerCase().trim();
  const uDestino = unidadeDestino.toLowerCase().trim();

  if (uOrigem === uDestino) return quantidade;

  const catOrigem = obterCategoriaUnidade(uOrigem);
  const catDestino = obterCategoriaUnidade(uDestino);

  // Se as unidades pertencerem à mesma categoria física (ex: gramas para quilos)
  if (catOrigem && catOrigem === catDestino && catOrigem !== "contagem") {
    const tabela = FATORES_CONVERSAO[catOrigem];
    const valorEmBase = quantidade * tabela[uOrigem];
    const resultado = valorEmBase / tabela[uDestino];
    return Number(resultado.toFixed(6)); // Evita problemas de arredondamento de ponto flutuante do JS
  }

  // Casos especiais de contagem (ex: caixas, dúzias)
  if (uOrigem === "dz" && uDestino === "un") return quantidade * 12;
  if (uOrigem === "un" && uDestino === "dz") return quantidade / 12;

  // Se não encontrar compatibilidade, retorna o valor original para evitar quebrar o sistema
  console.warn(`[UOM] Conversão não suportada de '${uOrigem}' para '${uDestino}'`);
  return quantidade;
};

/**
 * Calcula o custo proporcional de um insumo/material considerando unidades diferentes.
 * Ex: Você compra o cordão medindo em metros (R$ 2,00 / metro), mas consome 50 cm em uma embalagem.
 * 
 * @param custoUnitarioBase Preço unitário cadastrado no estoque (ex: R$ 2,00)
 * @param unidadeBase Unidade em que o item está cadastrado no estoque (ex: 'm')
 * @param quantidadeConsumida Quantidade gasta na produção/embalagem (ex: 50)
 * @param unidadeConsumo Unidade em que o consumo foi informado (ex: 'cm')
 */
export const calcularCustoProporcional = (
  custoUnitarioBase: number,
  unidadeBase: string,
  quantidadeConsumida: number,
  unidadeConsumo: string
): number => {
  // Normaliza o consumo para a mesma unidade base do estoque
  const quantidadeNormalizada = converterUnidade(
    quantidadeConsumida,
    unidadeConsumo,
    unidadeBase
  );

  const custoTotal = custoUnitarioBase * quantidadeNormalizada;
  return Number(custoTotal.toFixed(4)); // Mantém precisão de 4 casas decimais para custos pequenos
};

/**
 * Retorna uma lista formatada de unidades comuns para usar em selects/dropdowns do ERP
 */
export const LISTA_UNIDADES_MEDIDA = [
  { sigla: "un", nome: "Unidade (UN)", categoria: "Contagem" },
  { sigla: "pc", nome: "Peça (PC)", categoria: "Contagem" },
  { sigla: "cx", nome: "Caixa (CX)", categoria: "Contagem" },
  { sigla: "pct", nome: "Pacote (PCT)", categoria: "Contagem" },
  { sigla: "dz", nome: "Dúzia (DZ)", categoria: "Contagem" },
  { sigla: "m", nome: "Metro (m)", categoria: "Comprimento" },
  { sigla: "cm", nome: "Centímetro (cm)", categoria: "Comprimento" },
  { sigla: "mm", nome: "Milímetro (mm)", categoria: "Comprimento" },
  { sigla: "kg", nome: "Quilograma (kg)", categoria: "Peso" },
  { sigla: "g", nome: "Grama (g)", categoria: "Peso" },
  { sigla: "mg", nome: "Miligrama (mg)", categoria: "Peso" },
  { sigla: "l", nome: "Litro (l)", categoria: "Volume" },
  { sigla: "ml", nome: "Mililitro (ml)", categoria: "Volume" },
  { sigla: "m2", nome: "Metro Quadrado (m²)", categoria: "Área" },
];
// funcao para converter unidades de medidas utils/conversaoUnidades.ts