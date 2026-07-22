"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy 
} from "firebase/firestore";
import { FiPlus, FiTrash2, FiX, FiFolder, FiCornerDownRight } from "react-icons/fi";

interface Props {
  lojistaId: string;
  onClose: () => void;
  limite: number;
}

export default function CategoriaSubCat({ lojistaId, onClose, limite }: Props) {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [novaCat, setNovaCat] = useState("");
  const [novaSub, setNovaSub] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!lojistaId) return;
    const q = query(collection(db, "lojistas", lojistaId, "categorias"), orderBy("nome", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setCategorias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [lojistaId]);

  const adicionarCategoria = async () => {
    if (!novaCat.trim()) return;
    if (categorias.length >= limite) return alert("Limite de categorias atingido!");

    try {
      await addDoc(collection(db, "lojistas", lojistaId, "categorias"), {
        nome: novaCat,
        subcategorias: [],
        createdAt: Date.now()
      });
      setNovaCat("");
    } catch (e) {
      alert("Erro ao adicionar categoria.");
    }
  };

  const adicionarSubcategoria = async (catId: string, nomeCat: string) => {
    const nomeSub = novaSub[catId];
    if (!nomeSub?.trim()) return;

    const catAtual = categorias.find(c => c.id === catId);
    const subsExistentes = catAtual.subcategorias || [];

    try {
      await updateDoc(doc(db, "lojistas", lojistaId, "categorias", catId), {
        subcategorias: [...subsExistentes, nomeSub]
      });
      setNovaSub({ ...novaSub, [catId]: "" });
    } catch (e) {
      alert("Erro ao adicionar subcategoria.");
    }
  };

  const removerCategoria = async (id: string) => {
    if (confirm("Isso excluirá a categoria e todas as suas subcategorias. Deseja continuar?")) {
      await deleteDoc(doc(db, "lojistas", lojistaId, "categorias", id));
    }
  };

  const removerSubcategoria = async (catId: string, index: number) => {
    const catAtual = categorias.find(c => c.id === catId);
    const novasSubs = [...catAtual.subcategorias];
    novasSubs.splice(index, 1);

    await updateDoc(doc(db, "lojistas", lojistaId, "categorias", catId), {
      subcategorias: novasSubs
    });
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>Gerenciar Categorias</h3>
          <button onClick={onClose} style={styles.btnClose}><FiX size={20} /></button>
        </div>

        <div style={styles.content}>
          {/* Campo Criar Categoria */}
          <div style={styles.addSection}>
            <input 
              style={styles.input} 
              placeholder="Nome da nova categoria..." 
              value={novaCat}
              onChange={e => setNovaCat(e.target.value)}
            />
            <button onClick={adicionarCategoria} style={styles.btnAdd}>
              <FiPlus /> Criar
            </button>
          </div>

          <p style={styles.limitText}>Uso: {categorias.length} de {limite} categorias</p>

          <div style={styles.listContainer}>
            {categorias.map(cat => (
              <div key={cat.id} style={styles.catCard}>
                <div style={styles.catHeader}>
                  <div style={styles.catNameGroup}>
                    <FiFolder color="#3b82f6" />
                    <strong style={styles.catName}>{cat.nome}</strong>
                  </div>
                  <button onClick={() => removerCategoria(cat.id)} style={styles.btnTrash}><FiTrash2 /></button>
                </div>

                {/* Lista de Subcategorias */}
                <div style={styles.subList}>
                  {cat.subcategorias?.map((sub: string, index: number) => (
                    <div key={index} style={styles.subItem}>
                      <div style={styles.subNameGroup}>
                        <FiCornerDownRight size={14} color="#94a3b8" />
                        <span>{sub}</span>
                      </div>
                      <button onClick={() => removerSubcategoria(cat.id, index)} style={styles.btnTrashMini}><FiX /></button>
                    </div>
                  ))}
                </div>

                {/* Campo Criar Subcategoria */}
                <div style={styles.addSubSection}>
                  <input 
                    style={styles.inputMini} 
                    placeholder="Nova subcategoria..." 
                    value={novaSub[cat.id] || ""}
                    onChange={e => setNovaSub({ ...novaSub, [cat.id]: e.target.value })}
                  />
                  <button onClick={() => adicionarSubcategoria(cat.id, cat.nome)} style={styles.btnAddMini}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: any = {
  overlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background: "#fff", width: "450px", maxHeight: "85vh", borderRadius: "20px", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" },
  header: { padding: "20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { margin: 0, fontSize: "18px", color: "#1e293b", fontWeight: "bold" },
  btnClose: { background: "none", border: "none", cursor: "pointer", color: "#64748b" },
  content: { padding: "20px", overflowY: "auto", flex: 1 },
  addSection: { display: "flex", gap: "10px", marginBottom: "10px" },
  input: { flex: 1, padding: "10px 15px", borderRadius: "10px", border: "2px solid #f1f5f9", outline: "none", fontSize: "14px" },
  btnAdd: { padding: "10px 20px", background: "#0f172a", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" },
  limitText: { fontSize: "11px", color: "#94a3b8", textAlign: "right", margin: "0 0 20px 0" },
  listContainer: { display: "flex", flexDirection: "column", gap: "15px" },
  catCard: { background: "#f8fafc", padding: "15px", borderRadius: "15px", border: "1px solid #f1f5f9" },
  catHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" },
  catNameGroup: { display: "flex", alignItems: "center", gap: "10px" },
  catName: { fontSize: "15px", color: "#334155" },
  btnTrash: { background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "5px" },
  subList: { display: "flex", flexDirection: "column", gap: "5px", paddingLeft: "10px", marginBottom: "10px" },
  subItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#fff", borderRadius: "8px", fontSize: "13px", color: "#64748b" },
  subNameGroup: { display: "flex", alignItems: "center", gap: "8px" },
  btnTrashMini: { background: "none", border: "none", color: "#cbd5e1", cursor: "pointer", fontSize: "12px" },
  addSubSection: { display: "flex", gap: "5px" },
  inputMini: { flex: 1, padding: "6px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none", fontSize: "12px" },
  btnAddMini: { background: "#3b82f6", color: "#fff", border: "none", width: "30px", height: "30px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }
};