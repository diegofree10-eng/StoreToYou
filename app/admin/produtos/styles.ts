// app/admin/produtos/styles.ts
import React from "react";

export const styles: { [key: string]: React.CSSProperties } = {
  page: { display: 'flex', height: '100vh', width: '100%', maxWidth: '100vw', background: '#f8fafc', overflow: 'hidden', boxSizing: 'border-box', position: 'relative' },
  
  // Container de 3 colunas para o PC
  pcContainer: { display: 'flex', flexDirection: 'row', width: '100vw', height: '100vh', overflow: 'hidden', boxSizing: 'border-box' },
  col1: { width: '260px', minWidth: '260px', maxWidth: '260px', background: '#fff', padding: '15px', overflowY: 'auto', borderRight: '1px solid #e2e8f0', boxSizing: 'border-box', height: '100vh' },
  col2: { width: '300px', minWidth: '300px', maxWidth: '300px', background: '#fff', padding: '15px', overflowY: 'auto', borderRight: '1px solid #e2e8f0', boxSizing: 'border-box', height: '100vh' },
  col3: { flex: 1, padding: '15px', overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100vh', background: '#f8fafc' },

  // Estilos Mobile (Gavetas e TopBar)
  mobileContainer: { width: '100%', minHeight: '100vh', position: 'relative', boxSizing: 'border-box', background: '#f8fafc', display: 'flex', flexDirection: 'column' },
  mobileTopBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px 15px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 99, boxSizing: 'border-box' },
  btnMenu: { background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#334155', display: 'flex', alignItems: 'center' },
  fabAdd: { position: 'fixed', bottom: '20px', right: '20px', width: '56px', height: '56px', borderRadius: '50%', background: '#10b981', color: '#fff', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', zIndex: 998, cursor: 'pointer' },
  drawerLeft: { position: 'fixed', top: 0, left: 0, width: '85%', maxWidth: '320px', height: '100vh', background: '#fff', zIndex: 2000, boxShadow: '5px 0 15px rgba(0,0,0,0.1)', overflowY: 'auto', padding: '15px', boxSizing: 'border-box', transition: 'transform 0.3s ease-in-out' },
  drawerRight: { position: 'fixed', top: 0, right: 0, width: '90%', maxWidth: '300px', height: '100vh', background: '#fff', zIndex: 2000, boxShadow: '-5px 0 15px rgba(0,0,0,0.1)', overflowY: 'auto', padding: '15px', boxSizing: 'border-box', transition: 'transform 0.3s ease-in-out' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1999 },

  // MODAL CORRIGIDO: CENTRALIZADO PERFEITAMENTE E RESPONSIVO
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 5000, boxSizing: 'border-box', padding: '15px' },
  modalContent: { background: '#fff', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '550px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },
  modalTextarea: { width: '100%', flex: 1, minHeight: '150px', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', resize: 'vertical', lineHeight: '1.5', boxSizing: 'border-box', outline: 'none' },

  sidebar: { width: '260px', minWidth: '260px', maxWidth: '260px', background: '#fff', padding: '15px', overflowY: 'auto', borderRight: '1px solid #e2e8f0', boxSizing: 'border-box' },
  main: { flex: 1, padding: '15px', overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box' },
  topHeader: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px', width: '100%', boxSizing: 'border-box' },
  filterRow: { display: 'flex', gap: '5px', alignItems: 'center', width: '100%', boxSizing: 'border-box', flexWrap: 'wrap' },
  searchBar: { flex: 3, minWidth: '140px', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box' },
  selectTop: { flex: 1, minWidth: '90px', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '13px', boxSizing: 'border-box' },
  selectStatus: { width: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', boxSizing: 'border-box' },
  btnGeneric: { padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', background: '#fff', boxSizing: 'border-box' },
  massPanel: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eff6ff', padding: '10px', borderRadius: '10px', border: '1px solid #3b82f6', marginBottom: '10px', boxSizing: 'border-box', flexWrap: 'wrap', gap: '8px' },
  btnMass: { padding: '6px 12px', background: '#fff', border: '1px solid #3b82f6', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  
  starBadge: { position: 'absolute', top: '5px', right: '5px', zIndex: 5, fontSize: '14px' },
  cardCheck: { position: 'absolute', top: '8px', left: '8px', zIndex: 10, width: '18px', height: '18px' },
  
  // Grade ajustada para 5 colunas por linha com base no novo desenho do card
  productGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(5, 1fr)', 
    gap: '12px', 
    width: '100%', 
    boxSizing: 'border-box' 
  },

  // Card com altura fixa estrita e moldura arredondada idêntica ao modelo enviado
  card: { 
    background: '#fff', 
    borderRadius: '12px', 
    border: '1px solid #e2e8f0', 
    position: 'relative', 
    overflow: 'hidden', 
    boxSizing: 'border-box', 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center',
    padding: '8px',
    height: '320px' 
  },

  // Quadro dedicado em caixa delimitada para conter a foto perfeitamente
  cardImgContainer: {
    width: '120px',
    height: '120px',
    minHeight: '100px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxSizing: 'border-box',
    marginBottom: '1px'
  },

  cardImg: { 
    width: '100%', 
    height: '100%', 
    objectFit: 'contain', 
    objectPosition: 'center', 
    display: 'block' 
  },
  
  cardBody: { padding: '4px 0', width: '100%', display: 'flex', flexDirection: 'column', gap: '2px' },
  cardTitle: { fontSize: '11px', fontWeight: 'bold', height: '26px', color: '#334155', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '13px', marginBottom: '2px', textAlign: 'left' },
  cardPrice: { fontSize: '13px', fontWeight: 'bold', color: '#10b981', textAlign: 'left' },
  markupTag: { fontSize: '9px', background: '#ecfdf5', color: '#059669', padding: '1px 4px', borderRadius: '4px', fontWeight: '800', alignSelf: 'flex-start' },
  
  cardActions: { display: 'flex', flexDirection: 'column', gap: '4px', marginTop: 'auto', width: '100%', paddingBottom: '2px' },
  btnSlim: { padding: '5px', fontSize: '10px', fontWeight: 'bold', border: 'none', borderRadius: '4px', background: '#f1f5f9', cursor: 'pointer', textAlign: 'center', color: '#334155' },
  btnDelete: { padding: '5px', fontSize: '10px', fontWeight: 'bold', border: 'none', borderRadius: '4px', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', textAlign: 'center' },
  
  sideTitle: { fontSize: '15px', fontWeight: 'bold', marginBottom: '15px' },
  input: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '10px', fontSize: '13px', boxSizing: 'border-box' },
  textarea: { width: '100%', height: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '10px', fontSize: '13px', boxSizing: 'border-box', resize: 'none', overflow: 'hidden' },
  freteBox: { padding: '10px', background: '#eff6ff', borderRadius: '8px', marginBottom: '10px', border: '1px solid #dbeafe' },
  checkLabel: { fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
  boxGray: { background: '#f1f5f9', padding: '10px', borderRadius: '8px', marginBottom: '10px' },
  miniLabel: { fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '5px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' },
  inputSmall: { width: '100%', padding: '8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' },
  btnSave: { width: '100%', padding: '14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
  btnCancel: { width: '100%', marginTop: '5px', padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' },
  btnUpload: { width: '100%', padding: '12px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', cursor: 'pointer', marginBottom: '10px', position: 'relative', fontSize: '12px' },
  btnConfirmImgs: { width: '100%', padding: '8px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', marginBottom: '10px', cursor: 'pointer' },
  fileInvis: { position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' },
  previewGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '10px' },
  imgThumb: { width: '100%', height: '40px', objectFit: 'cover', borderRadius: '4px' },
  btnDelImg: { position: 'absolute', top: -5, right: -5, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px' },
  catManager: { background: '#f8fafc', padding: '8px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #e2e8f0' },
  catItem: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px', alignItems: 'center' },
  btnAddCat: { width: '100%', padding: '5px', fontSize: '10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' },
  btnActionSmall: { padding: '10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' },
  btnMini: { border: 'none', background: 'none', cursor: 'pointer', fontSize: '10px' },
  planCard: { padding: '12px', background: '#f8fafc', borderRadius: '10px', marginBottom: '15px', border: '1px solid #e2e8f0' },
  planTitle: { fontSize: '11px', margin: '0 0 8px 0', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' },
  planStats: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', fontWeight: '500' },
  progressBarBg: { width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' },
  progressBarFill: { height: '100%', transition: '0.3s' }
};

export const shopeeStyles: { [key: string]: React.CSSProperties } = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#fff', width: '95%', maxWidth: '800px', height: '90vh', borderRadius: '4px', display: 'flex', flexDirection: 'column' },
  header: { padding: '15px 20px', borderBottom: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '18px', margin: 0, color: '#333333' },
  closeBtn: { border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#f50c0c' },
  content: { flex: 1, overflowY: 'auto', padding: '20px' },
  section: { marginBottom: '25px' },
  label: { display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#494646' },
  varBox: { border: '1px solid #e8e8e8', padding: '15px', borderRadius: '2px', background: '#fafafa' },
  tagsContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' },
  tagInputWrapper: { display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #dcdcdc', borderRadius: '2px' },
  tagInput: { border: 'none', padding: '6px 10px', outline: 'none', width: '100px', fontSize: '13px' },
  delTag: { border: 'none', background: 'none', padding: '0 8px', cursor: 'pointer', color: '#999', borderLeft: '1px solid #eee' },
  addBtn: { border: '1px dashed #ee4d2d', background: '#fff', color: '#ee4d2d', padding: '6px 15px', cursor: 'pointer', borderRadius: '2px' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' }, 
  trHead: { background: '#f6f6f6' },
  th: { padding: '12px', textAlign: 'left', fontSize: '13px', border: '1px solid #e8e8e8' },
  tr: { border: '1px solid #e8e8e8' },
  td: { padding: '10px', border: '1px solid #e8e8e8', verticalAlign: 'middle' },
  tableInput: { width: '100%', padding: '8px', border: '1px solid #dcdcdc', borderRadius: '2px', outline: 'none', textAlign: 'center', boxSizing: 'border-box' },
  footer: { padding: '15px 20px', borderTop: '1px solid #e8e8e8', display: 'flex', justifyContent: 'flex-end' }
};