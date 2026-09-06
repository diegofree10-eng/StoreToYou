// utils/buscarEmbalagens.ts
import { collection, getDocs, query } from "firebase/firestore";

export interface InsumoComposicao {
  insumoId: string;
  nome: string;
  quantidade: number;
  custoUnitario: number;
  unidade: string;
}

export interface EmbalagemLoja {
  id: string;
  nome: string;
  tipo: string;
  peso: number;
  altura: number;
  largura: number;
  comprimento: number;
  custo: number;
  insumosComposicaoEmbalagem: InsumoComposicao[];
}

/**
 * Busca as embalagens cadastradas pelo lojista estritamente na coleção correta.
 */
export async function buscarEmbalagensLoja(
  db: any,
  lojistaId: string,
): Promise<EmbalagemLoja[]> {
  if (!db || !lojistaId) return [];

  try {
    const embalagensRef = collection(db, "lojistas", lojistaId, "embalagem");
    const q = query(embalagensRef);
    const querySnapshot = await getDocs(q);

    const lista: EmbalagemLoja[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();

      // Mapeamento estrito do array de insumos da composição
      const insumosMapeados = Array.isArray(data.insumosComposicaoEmbalagem)
        ? data.insumosComposicaoEmbalagem.map((ins: any) => ({
            insumoId: ins.insumoId || "",
            nome: ins.nome || "",
            quantidade: Number(ins.quantidade || 0),
            custoUnitario: Number(ins.custoUnitario || 0),
            unidade: ins.unidade || "unidade"
          }))
        : [];

      lista.push({
        id: docSnap.id,
        nome: data.dsNomeEmbalagem || "",
        tipo: data.dsTipoEmbalagem || "",
        peso: Number(data.nrPesoEmbalagem || 0),
        altura: Number(data.nrAlturaMaxInsumo || 0),
        largura: Number(data.nrLarguraMaxInsumo || 0),
        comprimento: Number(data.nrComprimentoMaxInsumo || 0),
        custo: Number(data.vlCustoUnitarioEmbalagem || 0),
        insumosComposicaoEmbalagem: insumosMapeados,
      });
    });

    // Ordenação alfabética pelo nome correto
    lista.sort((a, b) => a.nome.localeCompare(b.nome));

    return lista;
  } catch (error) {
    console.error("Erro ao buscar embalagens da loja:", error);
    return [];
  }
}
// utilitario para percorrer a colecao de embalagem no firebase e buscar todas as embalagens cadastradas
// e enviar para a aba de producao, dentro de pedidos.