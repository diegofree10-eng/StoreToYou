"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export function useLojaData(slug: string) {
  const [data, setData] = useState<any>({ loja: null, loading: true });

  useEffect(() => {
    async function carregar() {
      if (!slug) return;
      const q = query(collection(db, "lojistas"), where("dadosLoja.dsSlug", "==", slug));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setData({ loja: { id: snap.docs[0].id, ...snap.docs[0].data() }, loading: false });
      } else {
        setData({ loja: null, loading: false });
      }
    }
    carregar();
  }, [slug]);
  return data;
}