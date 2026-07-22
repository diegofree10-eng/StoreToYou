// utils/exclusao.ts
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

/**
 * Função utilitária para excluir um produto do Firestore 
 * e remover todas as imagens associadas (galeria e variações) do Storage.
 */
export const excluirProdutoCompleto = async (uid: string, produto: any) => {
  if (!uid || !produto?.id) {
    throw new Error("UID do lojista ou ID do produto não fornecidos.");
  }

  // 1. Deleta fotos da galeria (se existirem)
  const imagens = produto.imagens || [];
  if (Array.isArray(imagens)) {
    for (const url of imagens) {
      try {
        if (typeof url === 'string' && url.startsWith('http')) {
          const imgRef = ref(storage, url);
          await deleteObject(imgRef);
        }
      } catch (e) {
        console.warn("Possível erro ao deletar imagem da galeria (pode não existir):", e);
      }
    }
  }

  // 2. Deleta fotos das variações (se existirem)
  const variacoes = produto.variacoes || [];
  if (Array.isArray(variacoes)) {
    for (const v of variacoes) {
      if (v.foto && typeof v.foto === 'string' && v.foto.startsWith('http')) {
        try {
          const varImgRef = ref(storage, v.foto);
          await deleteObject(varImgRef);
        } catch (e) {
          console.warn("Possível erro ao deletar imagem da variação:", e);
        }
      }
    }
  }

  // 3. Deleta o documento principal do produto no Firestore
  try {
    await deleteDoc(doc(db, "lojistas", uid, "produtos", produto.id));
  } catch (e) {
    console.error("Erro ao deletar documento do Firestore:", e);
    throw e;
  }
};

/**
 * Função para excluir/limpar o banner tanto do Storage quanto do Firestore.
 */
export const excluirBannerCompleto = async (uid: string, numeroBanner: number, urlBanner?: string) => {
  if (!uid) throw new Error("UID não fornecido.");

  // 1. Se houver uma URL válida, apaga fisicamente do Firebase Storage
  if (urlBanner && typeof urlBanner === 'string' && urlBanner.startsWith('http')) {
    try {
      const bannerRef = ref(storage, urlBanner);
      await deleteObject(bannerRef);
    } catch (e) {
      console.warn("Aviso ao deletar arquivo do Storage (pode já não existir):", e);
    }
  }

  // 2. Limpa os campos correspondentes no documento do lojista no Firestore
  try {
    const lojistaRef = doc(db, "lojistas", uid);
    await updateDoc(lojistaRef, {
      [`banners.dsBanner${numeroBanner}`]: "",
      [`banners.dsLinkBanner${numeroBanner}`]: ""
    });
  } catch (e) {
    console.error("Erro ao limpar dados do banner no Firestore:", e);
    throw e;
  }
};
// funcao para excluir tanto do firebase quanto do storage. 