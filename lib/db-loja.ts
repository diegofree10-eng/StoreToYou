import { db } from "./firebase";
// Estas importações são OBRIGATÓRIAS para que 'collection', 'query', etc, funcionem
import { collection, query, getDocs } from "firebase/firestore";

export async function getDadosLoja(slug: string) {
  if (!slug) return null;

  try {
    const lojaRef = collection(db, "lojistas");
    // Buscamos todos os documentos para filtrar manualmente e garantir a comparação
    const q = query(lojaRef); 
    const snapshot = await getDocs(q);
    
    // Filtro manual com .trim() e .toLowerCase() para evitar erros de digitação
    const doc = snapshot.docs.find(d => {
      const data = d.data();
      const slugNoBanco = data.dadosLoja?.dsSlug?.trim().toLowerCase();
      return slugNoBanco === slug.trim().toLowerCase();
    });

    if (!doc) {
      console.log("Nenhuma loja encontrada para o slug:", slug);
      return null;
    }

    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error("Erro na busca:", error);
    return null;
  }
}