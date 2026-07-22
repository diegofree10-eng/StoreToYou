"use client";
import React from "react";
import { db } from "@/lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { FiAlertTriangle, FiTrash2 } from "react-icons/fi";

interface TabDenunciasProps {
  denuncias: any[];
  mostrarAviso: (msg: string, tipo?: string) => void;
}

export default function TabDenuncias({ denuncias, mostrarAviso }: TabDenunciasProps) {
  
  const handleExcluirDenuncia = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta denúncia?")) {
      try {
        await deleteDoc(doc(db, "denuncias", id));
        mostrarAviso("Denúncia removida com sucesso!");
      } catch (error) {
        mostrarAviso("Erro ao excluir denúncia.", "erro");
      }
    }
  };

  return (
    <div style={styles.tableContainer}>
      <div style={styles.headerInfo}>
        <FiAlertTriangle size={20} color="#ef4444" />
        <h3 style={styles.title}>Gestão de Denúncias Recebidas</h3>
      </div>
      
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>DATA</th>
            <th style={styles.th}>LOJISTA</th>
            <th style={styles.th}>DENUNCIANTE</th>
            <th style={styles.th}>MOTIVO</th>
            <th style={styles.th}>AÇÃO</th>
          </tr>
        </thead>
        <tbody>
          {denuncias.length === 0 ? (
            <tr>
              <td colSpan={5} style={styles.noData}>
                Nenhuma denúncia registrada no momento.
              </td>
            </tr>
          ) : (
            denuncias.map((d) => (
              <tr key={d.id} style={styles.tr}>
                <td style={styles.td}>{new Date(d.data).toLocaleDateString()}</td>
                <td style={styles.td}>
                  <strong style={styles.lojaNome}>{d.nomeLojaDenunciada}</strong>
                </td>
                <td style={styles.td}>{d.nomeCliente || "Anônimo"}</td>
                <td style={styles.td}>{d.motivo}</td>
                <td style={styles.td}>
                  <button 
                    style={styles.btnTrash} 
                    onClick={() => handleExcluirDenuncia(d.id)}
                    title="Excluir Denúncia"
                  >
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const styles: any = {
  tableContainer: { 
    background: "#fff", 
    borderRadius: "20px", 
    overflow: 'hidden', 
    boxShadow: "0 10px 25px rgba(0,0,0,0.03)" 
  },
  headerInfo: {
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderBottom: '1px solid #f1f5f9'
  },
  title: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e293b'
  },
  table: { 
    width: "100%", 
    borderCollapse: "collapse" 
  },
  th: { 
    padding: "15px 20px", 
    textAlign: 'left', 
    background: '#f8fafc', 
    color: '#64748b', 
    fontSize: '12px', 
    fontWeight: '800' 
  },
  td: { 
    padding: "18px 20px", 
    borderBottom: "1px solid #f1f5f9",
    fontSize: '14px',
    color: '#475569'
  },
  tr: { 
    transition: '0.2s',
  },
  lojaNome: {
    color: '#0f172a'
  },
  btnTrash: { 
    background: '#fee2e2', 
    color: '#ef4444', 
    border: 'none', 
    padding: '10px', 
    borderRadius: '10px', 
    cursor: 'pointer', 
    transition: '0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px'
  },
  noData: {
    padding: '40px', 
    textAlign: 'center', 
    color: '#94a3b8',
    fontSize: '14px'
  }
};