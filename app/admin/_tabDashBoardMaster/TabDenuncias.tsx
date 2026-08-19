"use client";
import React from "react";
import { db } from "@/lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { FiAlertTriangle, FiTrash2 } from "react-icons/fi";
import { useTheme } from "@/context/ThemeContext";

interface TabDenunciasProps {
  denuncias: any[];
  mostrarAviso: (msg: string, tipo?: string) => void;
}

export default function TabDenuncias({ denuncias, mostrarAviso }: TabDenunciasProps) {
  const { theme, isModoNoturno } = useTheme();
  
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
    <div style={{ ...styles.tableContainer, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
      <div style={{ ...styles.headerInfo, borderBottom: `1px solid ${theme.border}` }}>
        <FiAlertTriangle size={20} color="#ef4444" />
        <h3 style={{ ...styles.title, color: theme.textMain }}>Gestão de Denúncias Recebidas</h3>
      </div>
      
      <table style={styles.table}>
        <thead>
          <tr style={{ background: isModoNoturno ? '#0f172a' : '#f8fafc', borderBottom: `1px solid ${theme.border}` }}>
            <th style={{ ...styles.th, color: theme.textSec }}>DATA</th>
            <th style={{ ...styles.th, color: theme.textSec }}>LOJISTA</th>
            <th style={{ ...styles.th, color: theme.textSec }}>DENUNCIANTE</th>
            <th style={{ ...styles.th, color: theme.textSec }}>MOTIVO</th>
            <th style={{ ...styles.th, color: theme.textSec }}>AÇÃO</th>
          </tr>
        </thead>
        <tbody>
          {denuncias.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ ...styles.noData, color: theme.textSec }}>
                Nenhuma denúncia registrada no momento.
              </td>
            </tr>
          ) : (
            denuncias.map((d) => (
              <tr key={d.id} style={{ ...styles.tr, borderBottom: `1px solid ${theme.border}` }}>
                <td style={{ ...styles.td, color: theme.textSec }}>{new Date(d.data).toLocaleDateString()}</td>
                <td style={styles.td}>
                  <strong style={{ ...styles.lojaNome, color: theme.textMain }}>{d.nomeLojaDenunciada}</strong>
                </td>
                <td style={{ ...styles.td, color: theme.textSec }}>{d.nomeCliente || "Anônimo"}</td>
                <td style={{ ...styles.td, color: theme.textSec }}>{d.motivo}</td>
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
    borderRadius: "20px", 
    overflow: 'hidden', 
    boxShadow: "0 10px 25px rgba(0,0,0,0.03)" 
  },
  headerInfo: {
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  title: {
    fontSize: '16px',
    fontWeight: '700'
  },
  table: { 
    width: "100%", 
    borderCollapse: "collapse" 
  },
  th: { 
    padding: "15px 20px", 
    textAlign: 'left', 
    fontSize: '12px', 
    fontWeight: '800' 
  },
  td: { 
    padding: "18px 20px", 
    fontSize: '14px'
  },
  tr: { 
    transition: '0.2s',
  },
  lojaNome: {},
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
    fontSize: '14px'
  }
};