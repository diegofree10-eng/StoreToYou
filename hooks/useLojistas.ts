import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  where, 
  QueryDocumentSnapshot, 
  QueryConstraint // Importe isso
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const buscarLojistas = async (lastDoc: QueryDocumentSnapshot | null, termoBusca: string) => {
  let q;

  if (termoBusca) {
    q = query(
      collection(db, "lojistas"),
      where("dadosLoja.dsNomeLoja", ">=", termoBusca),
      where("dadosLoja.dsNomeLoja", "<=", termoBusca + "\uf8ff"),
      limit(20)
    );
  } else {
    // Definimos explicitamente o tipo do array como QueryConstraint[]
    const queryArgs: QueryConstraint[] = [
      orderBy("dataCadastro", "desc"),
      limit(10)
    ];

    // SÓ ADICIONAMOS O startAfter SE O lastDoc EXISTIR
    if (lastDoc) {
      queryArgs.push(startAfter(lastDoc));
    }

    // Passamos a coleção como primeiro argumento e o spread das restrições depois
    q = query(collection(db, "lojistas"), ...queryArgs);
  }

  const snapshot = await getDocs(q);
  
  return {
    docs: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    lastVisible: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null
  };
};