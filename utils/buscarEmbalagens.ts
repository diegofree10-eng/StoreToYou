// utils/buscarEmbalagens.ts
import { collection, getDocs, query } from "firebase/firestore";

export interface EmbalagemLoja {
  id: string;
  nome: string;
  peso: number;
  altura: number;
  largura: number;
  comprimento: number;
  custo: number; // 🌟 Campo de custo unitário adicionado
}

/**
 * Busca as embalagens cadastradas pelo lojista de forma otimizada (apenas 1 leitura em lote).
 * Ordenadas por nome para exibição limpa no select.
 */
export async function buscarEmbalagensLoja(
  db: any,
  lojistaId: string,
): Promise<EmbalagemLoja[]> {
  if (!db || !lojistaId) return [];

  try {
    const embalagensRef = collection(db, "lojistas", lojistaId, "embalagem");
    // Opcional: Se sua coleção tiver campo de ordenação, adicione orderBy. Ex: orderBy("nome", "asc")
    const q = query(embalagensRef);
    const querySnapshot = await getDocs(q);

    const lista: EmbalagemLoja[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      lista.push({
        id: docSnap.id,
        nome: data.dsNomeEmbalagem || data.nome || "Caixa",
        peso: Number(data.nrPesoEmbalagem || data.peso || 0),
        altura: Number(
          data.nrAlturaMaxInsumo || data.altura || data.nrAlturaEmbalagem || 0,
        ),
        largura: Number(
          data.nrLarguraMaxInsumo ||
            data.largura ||
            data.nrLarguraEmbalagem ||
            0,
        ),
        comprimento: Number(
          data.nrComprimentoMaxInsumo ||
            data.comprimento ||
            data.nrComprimentoEmbalagem ||
            0,
        ),
        custo: Number(
          data.vlCustoUnitarioEmbalagem ||
            data.custo ||
            data.vlCusto ||
            0,
        ), // 🌟 Mapeamento seguro do custo unitário
      });
    });

    return lista;
  } catch (error) {
    console.error("Erro ao buscar embalagens da loja:", error);
    return [];
  }
}