import React, { useState, useEffect, useCallback } from 'react';
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

interface ImageViewerProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export default function ImageViewer({ images, initialIndex, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setZoom(1);
    setIsZoomed(false);
  }, [images.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setZoom(1);
    setIsZoomed(false);
  }, [images.length]);

  const toggleZoom = () => {
    if (isZoomed) {
      setZoom(1);
      setIsZoomed(false);
    } else {
      setZoom(2);
      setIsZoomed(true);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 1));
  const handleReset = () => {
    setZoom(1);
    setIsZoomed(false);
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
    >
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
        className="w-full h-full p-12 overflow-hidden flex items-center justify-center cursor-zoom-in"
        onClick={toggleZoom}
      >
        <motion.img
          key={currentIndex}
          src={images[currentIndex]}
          alt={`Trade Chart ${currentIndex + 1}`}
          animate={{ scale: zoom }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
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
