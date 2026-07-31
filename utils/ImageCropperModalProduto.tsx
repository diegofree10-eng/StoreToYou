"use client";

import React, { useState, useRef } from "react";

export default function ImageCropperModalProduto({ 
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

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPosition({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  async function handleSave() {
    if (!imgRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imgRef.current;

    // 1. Fundo branco do quadrado final de 800x800
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 800, 800);

    const containerSize = 300; // Tamanho em pixels da caixa tracejada do cropper na tela
    const scaleFactor = 800 / containerSize; // Conversão exata para o canvas de 800x800

    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    // Calcula como a imagem foi contida (object-fit: contain) dentro da caixa de 300x300
    const imgAspect = naturalWidth / naturalHeight;
    let baseDrawW = containerSize;
    let baseDrawH = containerSize;

    if (imgAspect > 1) {
      baseDrawH = containerSize / imgAspect;
    } else {
      baseDrawW = containerSize * imgAspect;
    }

    ctx.save();
    
    // Move para o centro do canvas de 800x800
    ctx.translate(400, 400);

    // Aplica o zoom e a posição (arraste) multiplicados pelo fator de escala
    ctx.scale(zoom, zoom);
    ctx.translate(position.x * scaleFactor, position.y * scaleFactor);

    // Desenha a imagem centralizada com o tamanho proporcional correto em escala real
    const finalW = baseDrawW * scaleFactor;
    const finalH = baseDrawH * scaleFactor;

    ctx.drawImage(
      img,
      -finalW / 2,
      -finalH / 2,
      finalW,
      finalH
    );

    ctx.restore();

    canvas.toBlob((blob) => {
      if (blob) onCropComplete(blob);
    }, "image/jpeg", 0.95);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '16px', maxWidth: '450px', width: '90%', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: '8px', fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>Ajustar Foto para o Card</h3>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
          Arraste e ajuste o zoom para enquadrar perfeitamente no quadrado.
        </p>

        <div 
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          style={{ 
            width: '300px', 
            height: '300px', 
            margin: '0 auto', 
            border: '2px dashed #6366f1', 
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
            alt="Crop source" 
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

        <div style={{ margin: '20px 0 10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Zoom:</span>
          <input 
            type="range" 
            min="0.5" 
            max="3" 
            step="0.05" 
            value={zoom} 
            onChange={(e) => setZoom(parseFloat(e.target.value))} 
            style={{ width: '100%', accentColor: '#6366f1', cursor: 'pointer' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#6366f1', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Cortar e Salvar</button>
        </div>
      </div>
    </div>
  );
}