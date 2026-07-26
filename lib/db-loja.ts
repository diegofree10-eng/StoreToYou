import { dbAdmin } from "@/lib/firebaseAdmin";
import { db } from "./firebase";
import { collection, query, getDocs } from "firebase/firestore";

export async function getDadosLoja(slug: string) {
  if (!slug) return null;

  try {
    // Se o dbAdmin estiver disponível (rodando no servidor com SDK inicializado)
    if (dbAdmin && typeof dbAdmin.collection === 'function') {
      const snapshot = await dbAdmin.collection("lojistas").get();
      const doc = snapshot.docs.find((d: { data: () => any }) => {
        const data = d.data();
        const slugNoBanco = data.dadosLoja?.dsSlug?.trim().toLowerCase();
        return slugNoBanco === slug.trim().toLowerCase();
      });

      if (!doc) {
        console.log("Nenhuma loja encontrada para o slug:", slug);
        return null;
      }

      return { id: doc.id, ...doc.data() };
    } else {
      // Fallback para o cliente/build caso o Admin não esteja carregado
      const lojaRef = collection(db, "lojistas");
      const q = query(lojaRef);
      const snapshot = await getDocs(q);
      
      const doc = snapshot.docs.find(d => {
        const data = d.data();
        const slugNoBanco = data.dadosLoja?.dsSlug?.trim().toLowerCase();
        return slugNoBanco === slug.trim().toLowerCase();
      });

      if (!doc) return null;
      return { id: doc.id, ...doc.data() };
    }
  } catch (error) {
    console.error("Erro na busca:", error);
    return null;
  }
}