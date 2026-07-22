import { db } from "@/lib/firebase";
import { doc, getDocs, collection, query, where, updateDoc } from "firebase/firestore";

export const useFinanceiro = () => {
  
  const processarMetricas = async (lojistaId: string) => {
    // 1. Busca pedidos concluídos
    const q = query(
      collection(db, "pedidos"), 
      where("lojistaId", "==", lojistaId),
      where("status", "==", "concluido")
    );
    const snap = await getDocs(q);

    let totalLucro = 0;
    let totalVendas = 0;
    const qtd = snap.size;

    snap.forEach((d) => {
      const p = d.data();
      const custo = p.custoProdutos || 0;
      totalLucro += (p.valorTotal - custo);
      totalVendas += p.valorTotal;
    });

    const ticketMedio = qtd > 0 ? (totalVendas / qtd) : 0;

    // 2. Grava no Firebase do Lojista (é aqui que a mágica acontece)
    const lojistaRef = doc(db, "lojistas", lojistaId);
    await updateDoc(lojistaRef, { 
        lucroReal: totalLucro, 
        ticketMedio: ticketMedio 
    });
  };

  return { processarMetricas };
};