import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  ExternalLink, 
  MoreHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Trade } from '../types';

interface ImageMetadata {
  tradeId?: string;
  tradeName?: string;
  dateStr?: string;
  type?: 'buy' | 'sell';
  rr?: number;
  trade?: Trade;
}

interface ImageViewerProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
  metadata?: ImageMetadata[];
  onSelectTrade?: (trade: Trade) => void;
}

export default function ImageViewer({ images, initialIndex, onClose, metadata, onSelectTrade }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const isDraggedRef = useRef(false);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setZoom(1);
    setIsZoomed(false);
    setPosition({ x: 0, y: 0 });
  }, [images.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setZoom(1);
    setIsZoomed(false);
    setPosition({ x: 0, y: 0 });
  }, [images.length]);

  const toggleZoom = (e: React.MouseEvent) => {
    // If we were dragging, don't toggle zoom
    if (isDraggedRef.current) {
      isDraggedRef.current = false;
      return;
    }
    
    if (isZoomed) {
      setZoom(1);
      setIsZoomed(false);
      setPosition({ x: 0, y: 0 });
    } else {
      setZoom(2);
      setIsZoomed(true);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.5, 5));
    setIsZoomed(true);
  };
  
  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.5, 1);
    setZoom(newZoom);
    if (newZoom === 1) {
      setIsZoomed(false);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleReset = () => {
    setZoom(1);
    setIsZoomed(false);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      isDraggedRef.current = false;
      setStartPan({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      isDraggedRef.current = true;
      setPosition({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Note: We don't reset isDraggedRef here because toggleZoom needs to check it
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-[#000000f2] flex flex-col items-center justify-center select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Left Metadata Display */}
      {metadata && metadata[currentIndex] && (
        <div className="fixed top-6 left-6 z-[210] flex flex-col gap-1 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-2.5 shadow-2xl max-w-xs sm:max-w-md">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
              metadata[currentIndex].type === 'buy'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {metadata[currentIndex].type}
            </span>
            <span className="text-sm font-bold text-zinc-100 uppercase tracking-tight">
              {metadata[currentIndex].tradeName}
            </span>
            {metadata[currentIndex].rr !== undefined && (
              <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${
                (metadata[currentIndex].rr || 0) > 0
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : (metadata[currentIndex].rr || 0) < 0
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
              }`}>
                {(metadata[currentIndex].rr || 0) > 0 ? '+' : ''}{(metadata[currentIndex].rr || 0).toFixed(2)} R
              </span>
            )}
          </div>
          <span className="text-[10px] text-zinc-500 font-bold">
            {metadata[currentIndex].dateStr}
          </span>
          {onSelectTrade && metadata[currentIndex].trade && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (metadata[currentIndex].trade) {
                  onSelectTrade(metadata[currentIndex].trade);
                  onClose();
                }
              }}
              className="mt-1.5 self-start text-[10px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-wider flex items-center gap-1 transition-all"
            >
              View Trade Details <ExternalLink size={10} />
            </button>
          )}
        </div>
      )}

      {/* Top Control Bar */}
      <div className="fixed top-6 right-6 z-[210] flex items-center gap-2">
        <div className="flex items-center gap-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full p-1 shadow-2xl">
          <ControlButton icon={ZoomIn} onClick={handleZoomIn} title="Zoom In" />
          <ControlButton icon={ZoomOut} onClick={handleZoomOut} title="Zoom Out" />
          <ControlButton icon={RotateCcw} onClick={handleReset} title="Reset Zoom" />
          <div className="w-[1px] h-4 bg-white/10 mx-1" />
          <a 
            href={images[currentIndex]} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 hover:bg-white/10 rounded-full transition-all text-zinc-400 hover:text-white"
          >
            <ExternalLink size={18} />
          </a>
          <ControlButton icon={MoreHorizontal} onClick={() => {}} title="More Options" />
        </div>
        
        <button 
          onClick={onClose}
          className="p-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-zinc-400 hover:text-white hover:bg-[#ed4245] hover:border-[#ed4245] transition-all shadow-2xl group"
        >
          <X size={20} className="group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button 
            onClick={handlePrev}
            className="fixed left-8 top-1/2 -translate-y-1/2 z-[210] p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/50 hover:text-white transition-all backdrop-blur-md"
          >
            <ChevronLeft size={32} />
          </button>
          <button 
            onClick={handleNext}
            className="fixed right-8 top-1/2 -translate-y-1/2 z-[210] p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/50 hover:text-white transition-all backdrop-blur-md"
          >
            <ChevronRight size={32} />
          </button>
        </>
      )}

      {/* Image Display */}
      <div 
        className={`w-full h-full p-12 overflow-hidden flex items-center justify-center ${zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'}`}
        onClick={toggleZoom}
        onMouseDown={handleMouseDown}
      >
        <motion.img
          key={currentIndex}
          src={images[currentIndex]}
          alt={`Trade Chart ${currentIndex + 1}`}
          animate={{ 
            scale: zoom,
            x: position.x,
            y: position.y
          }}
          transition={isDragging ? { duration: 0 } : { type: "spring", damping: 25, stiffness: 200 }}
          className="max-w-full max-h-full object-contain shadow-2xl pointer-events-none"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[210] flex items-center gap-3 bg-black/40 backdrop-blur-2xl p-3 border border-white/10 rounded-2xl shadow-2xl">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative w-16 h-12 rounded-lg overflow-hidden transition-all transform hover:scale-105 ${
                currentIndex === idx 
                  ? 'ring-2 ring-[#5865f2] opacity-100 scale-110' 
                  : 'opacity-40 hover:opacity-100'
              }`}
            >
              <img 
                src={img} 
                alt={`Thumb ${idx + 1}`} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function ControlButton({ icon: Icon, onClick, title }: { icon: any, onClick: () => void, title: string }) {
  return (
    <button 
      onClick={onClick}
      title={title}
      className="p-2 hover:bg-white/10 rounded-full transition-all text-zinc-400 hover:text-white"
    >
      <Icon size={18} />
    </button>
  );
}
