import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase"; 
import LandingPageClient from "./LandingPageClient"; // Mova seu código atual para este novo arquivo

async function getPlanos() {
  const docRef = doc(db, "configuracoes", "planos");
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}

export default async function Page() {
  const planos = await getPlanos();
  return <LandingPageClient planosData={planos} />;
}