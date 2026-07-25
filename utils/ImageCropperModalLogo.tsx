"use client";

import React, { useState, useRef } from "react";

export default function ImageCropperModalLogo({ 
  file, 
  onCropComplete, 
  onCancel 
}: { 
  file: File, 
  onCropComplete: (croppedBlob: Blob) => void, 
  onCancel: () => void 
}) {
  const [imgSrc] = useState<string>(() => URL.createObjectURL(file));
  const [zoom, setZoom] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  
  const imgRef = useRef<HTMLImageElement>(null);

  // Iniciar o arrasto da imagem
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  // Movimentação da imagem ao arrastar
  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPosition({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Processar e exportar o corte final otimizado para logotipo quadrado (400x400)
  async function handleSave() {
    if (!imgRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imgRef.current;
    
    // Fundo transparente ou limpo para logotipos
    ctx.clearRect(0, 0, 400, 400);

    ctx.save();
    // Centraliza e aplica as transformações de zoom e translação para o canvas quadrado (200x200 no preview -> 400x400 no final)
    ctx.translate(200, 200);
    ctx.scale(zoom, zoom);
    ctx.translate(position.x * 2, position.y * 2);
    
    const aspect = img.naturalWidth / img.naturalHeight;
    let drawWidth = 400;
    let drawHeight = 400;
    if (aspect > 1) {
      drawWidth = 400 * aspect;
      drawHeight = 400;
    } else {
      drawWidth = 400;
      drawHeight = 400 / aspect;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    canvas.toBlob((blob) => {
      if (blob) onCropComplete(blob);
    }, "image/png", 0.95); // PNG para preservar transparências da logo
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '16px', maxWidth: '450px', width: '90%', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: '8px', fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>Ajustar Logotipo</h3>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.4' }}>
          Arraste para posicionar e use o zoom para ajustar sua logo dentro do espaço quadrado.
        </p>

        {/* ÁREA DA MOLDURA QUADRADA PARA LOGO (180x180) */}
        <div 
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          style={{ 
            width: '180px', 
            height: '180px', 
            margin: '0 auto', 
            border: '2px dashed #055bb1', 
            borderRadius: '12px', 
            overflow: 'hidden', 
            backgroundColor: '#f8fafc',
            position: 'relative',
            cursor: isDragging ? 'grabbing' : 'grab',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none'
          }}
        >
          <img 
            ref={imgRef} 
            src={imgSrc} 
            alt="Logo source" 
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              pointerEvents: 'none',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }} 
          />
        </div>

        {/* BARRA DE ZOOM */}
        <div style={{ margin: '20px 0 10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Zoom:</span>
          <input 
            type="range" 
            min="0.5" 
            max="3" 
            step="0.05" 
            value={zoom} 
            onChange={(e) => setZoom(parseFloat(e.target.value))} 
            style={{ width: '100%', accentColor: '#055bb1', cursor: 'pointer' }}
          />
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#055bb1', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Aplicar e Salvar</button>
        </div>
      </div>
    </div>
  );
}
// cortador automático (Cropper) na tela onde cadastra ou edita a foto de LOGOTIPO