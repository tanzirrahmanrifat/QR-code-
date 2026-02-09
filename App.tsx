
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  QrCode, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Download, 
  Settings, 
  Palette, 
  Sparkles, 
  RefreshCw, 
  Info, 
  Circle, 
  Square, 
  Type as TypeIcon, 
  Layout, 
  Maximize2 
} from 'lucide-react';
import Button from './components/Button';
import { AIAnalysisResult } from './types';
import { analyzeDesignWithAI } from './services/geminiService';

const App: React.FC = () => {
  // QR Content & Logo State
  const [url, setUrl] = useState('https://google.com');
  const [logo, setLogo] = useState<string | null>(null);
  const [processedLogo, setProcessedLogo] = useState<string | null>(null);
  
  // Customization States
  const [logoSize, setLogoSize] = useState(480); // Native pixel size in a 2048px QR code
  const [logoPadding, setLogoPadding] = useState(15); // % of padding inside the shape
  const [logoShape, setLogoShape] = useState<'square' | 'circle'>('circle');
  const [logoBgColor, setLogoBgColor] = useState('#f97316'); 
  const [logoBorderWidth, setLogoBorderWidth] = useState(6); // % of container size
  const [logoBorderColor, setLogoBorderColor] = useState('#000000');
  
  // QR Styling State
  const [fgColor, setFgColor] = useState('#0284c7'); 
  const [bgColor, setBgColor] = useState('#ffffff');
  const [isExcavated, setIsExcavated] = useState(true);

  // Frame State
  const [frameEnabled, setFrameEnabled] = useState(true);
  const [frameText, setFrameText] = useState('SCAN ME');
  const [frameColor, setFrameColor] = useState('#0284c7');
  const [frameTextColor, setFrameTextColor] = useState('#ffffff');
  const [frameStyle, setFrameStyle] = useState<'bottom-label' | 'full-border'>('bottom-label');

  // App State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  
  const qrRef = useRef<HTMLDivElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Ultra-High Resolution Logo Pre-processor
  useEffect(() => {
    if (!logo) {
      setProcessedLogo(null);
      return;
    }

    const img = new Image();
    img.src = logo;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Use 2048 for the internal high-res coordinate system to match the QR native size
      const size = 2048;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 1. Draw External Border
      if (logoBorderWidth > 0) {
        ctx.fillStyle = logoBorderColor;
        if (logoShape === 'circle') {
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(0, 0, size, size);
        }
      }

      // 2. Draw Background Shape
      const borderThickness = (logoBorderWidth / 100) * size;
      const innerShapeSize = size - (borderThickness * 2);
      ctx.fillStyle = logoBgColor;
      
      if (logoShape === 'circle') {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, innerShapeSize / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(borderThickness, borderThickness, innerShapeSize, innerShapeSize);
      }

      // 3. Draw Logo with Padding
      const paddingPx = (logoPadding / 100) * innerShapeSize + borderThickness;
      const drawAreaSize = size - (paddingPx * 2);
      
      const scale = Math.min(drawAreaSize / img.width, drawAreaSize / img.height);
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      const x = (size - drawWidth) / 2;
      const y = (size - drawHeight) / 2;

      ctx.drawImage(img, x, y, drawWidth, drawHeight);
      setProcessedLogo(canvas.toDataURL('image/png', 1.0));
    };
  }, [logo, logoShape, logoBgColor, logoPadding, logoBorderWidth, logoBorderColor]);

  const handleAIDesign = async () => {
    if (!url) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeDesignWithAI(url, logo || undefined);
      setAiResult(result);
      if (result.suggestedColors.length > 0) {
        setFgColor(result.suggestedColors[0]);
        setFrameColor(result.suggestedColors[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const downloadQR = useCallback(() => {
    const qrCanvas = qrRef.current?.querySelector('canvas');
    if (!qrCanvas) return;

    const finalCanvas = document.createElement('canvas');
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) return;

    // Output is based on the 2048px source
    const qrSize = qrCanvas.width; 
    
    // Minimal standard quiet zone (approx 2 modules equivalent)
    // We keep this just large enough for scanners but as small as possible for a "full" look.
    const margin = qrSize * 0.04; 
    
    const isBanner = frameEnabled && frameStyle === 'bottom-label';
    const labelHeight = isBanner ? qrSize * 0.28 : 0;

    // Tight canvas dimensions
    finalCanvas.width = qrSize + (margin * 2);
    finalCanvas.height = qrSize + (margin * 2) + labelHeight;

    // Fill the tightly cropped background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

    if (frameEnabled) {
      ctx.fillStyle = frameColor;
      if (frameStyle === 'bottom-label') {
        const rectX = margin;
        const rectY = margin + qrSize - (qrSize * 0.03); 
        const rectWidth = qrSize;
        const rectHeight = labelHeight + (qrSize * 0.03);
        const radius = qrSize * 0.04;

        ctx.beginPath();
        ctx.roundRect(rectX, rectY, rectWidth, rectHeight, [0, 0, radius, radius]);
        ctx.fill();

        ctx.fillStyle = frameTextColor;
        ctx.font = `900 ${qrSize * 0.11}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(frameText.toUpperCase(), finalCanvas.width / 2, rectY + (rectHeight / 2) + (qrSize * 0.01));
      } else if (frameStyle === 'full-border') {
        ctx.strokeStyle = frameColor;
        ctx.lineWidth = margin * 1.6;
        ctx.strokeRect(
          margin / 2, 
          margin / 2, 
          finalCanvas.width - margin, 
          finalCanvas.height - margin
        );
      }
    }

    // Draw high-res QR onto the cropped final canvas
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(qrCanvas, margin, margin);

    const pngUrl = finalCanvas.toDataURL("image/png", 1.0);
    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `qr-tight-studio-${Date.now()}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }, [frameEnabled, frameText, frameColor, frameTextColor, frameStyle, bgColor]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
              <QrCode size={24} />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">QR Logo Studio <span className="text-blue-600">PRO</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200">
              <Sparkles size={12} className="text-amber-500" />
              Pro Export Logic
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Controls Column */}
        <div className="lg:col-span-7 space-y-8 pb-32 lg:pb-8">
          
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <LinkIcon size={20} />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Destination URL</h2>
            </div>
            <div className="space-y-4">
              <div className="group relative">
                <input 
                  type="url" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full pl-5 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-slate-700 font-medium"
                />
                <LinkIcon size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <Button 
                variant="outline" 
                onClick={handleAIDesign}
                isLoading={isAnalyzing}
                className="bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100 px-6 py-3 rounded-xl border-2"
              >
                <Sparkles size={18} className="animate-pulse" />
                AI Smart Design
              </Button>
            </div>
          </section>

          <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <ImageIcon size={20} />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Logo Clarity Settings</h2>
            </div>
            
            <div className="space-y-8">
              <div className="flex items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl p-8 hover:border-blue-400 hover:bg-blue-50 transition-all group relative cursor-pointer overflow-hidden bg-slate-50">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleLogoUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <ImageIcon size={24} className="text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <p className="text-sm text-slate-600 font-bold uppercase tracking-wider">{logo ? 'Replace Center Image' : 'Upload Center Logo'}</p>
                </div>
              </div>

              {logo && (
                <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Logo Container Shape</label>
                        <div className="flex gap-4">
                          <button onClick={() => setLogoShape('circle')} className={`flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all shadow-sm ${logoShape === 'circle' ? 'border-blue-500 bg-white text-blue-600 ring-4 ring-blue-50' : 'border-slate-200 bg-white text-slate-400'}`}>
                            <Circle size={24} />
                            <span className="text-[10px] font-black uppercase">Circle</span>
                          </button>
                          <button onClick={() => setLogoShape('square')} className={`flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all shadow-sm ${logoShape === 'square' ? 'border-blue-500 bg-white text-blue-600 ring-4 ring-blue-50' : 'border-slate-200 bg-white text-slate-400'}`}>
                            <Square size={24} />
                            <span className="text-[10px] font-black uppercase">Square</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Logo Internal Padding</label>
                          <span className="text-xs font-mono text-blue-600 font-bold">{logoPadding}%</span>
                        </div>
                        <input type="range" min="0" max="45" value={logoPadding} onChange={(e) => setLogoPadding(Number(e.target.value))} className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Center Size</label>
                          <span className="text-xs font-mono text-blue-600 font-bold">{logoSize}px</span>
                        </div>
                        <input type="range" min="200" max="600" step="10" value={logoSize} onChange={(e) => setLogoSize(Number(e.target.value))} className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Backdrop Color</label>
                        <div className="flex items-center gap-3 p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-sm">
                          <input type="color" value={logoBgColor} onChange={(e) => setLogoBgColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent" />
                          <input type="text" value={logoBgColor} onChange={(e) => setLogoBgColor(e.target.value)} className="bg-transparent text-sm font-mono w-full outline-none uppercase font-bold text-slate-600" />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ring Border Thickness</label>
                          <span className="text-xs font-mono text-blue-600 font-bold">{logoBorderWidth}%</span>
                        </div>
                        <div className="flex gap-4 items-center">
                          <input type="range" min="0" max="25" value={logoBorderWidth} onChange={(e) => setLogoBorderWidth(Number(e.target.value))} className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                          <input type="color" value={logoBorderColor} onChange={(e) => setLogoBorderColor(e.target.value)} className="w-8 h-8 rounded-full border-none cursor-pointer shadow-md" />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-sm">
                        <input 
                          type="checkbox" 
                          id="excavate" 
                          checked={isExcavated}
                          onChange={(e) => setIsExcavated(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="excavate" className="text-sm text-slate-700 font-bold cursor-pointer">
                          Excavate Pattern behind Logo
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3 text-slate-900">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                  <Layout size={20} />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Promotional Frame</h2>
              </div>
              <button 
                onClick={() => setFrameEnabled(!frameEnabled)}
                className={`w-14 h-7 rounded-full relative transition-all duration-300 shadow-inner ${frameEnabled ? 'bg-blue-600' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${frameEnabled ? 'left-8' : 'left-1'}`} />
              </button>
            </div>

            {frameEnabled && (
              <div className="space-y-8 animate-in fade-in duration-500 slide-in-from-top-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Call to Action Text</label>
                    <div className="relative group">
                      <input 
                        type="text" 
                        value={frameText}
                        onChange={(e) => setFrameText(e.target.value.slice(0, 15))}
                        className="w-full pl-5 pr-12 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-bold text-slate-700"
                      />
                      <TypeIcon size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Frame Color</label>
                    <div className="flex items-center gap-4 p-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl">
                      <input type="color" value={frameColor} onChange={(e) => setFrameColor(e.target.value)} className="w-10 h-10 border-none bg-transparent rounded-lg cursor-pointer" />
                      <input type="text" value={frameColor} onChange={(e) => setFrameColor(e.target.value)} className="bg-transparent text-sm font-mono w-full outline-none uppercase font-bold text-slate-600" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Visual Style</label>
                  <div className="grid grid-cols-2 gap-6">
                    <button 
                      onClick={() => setFrameStyle('bottom-label')}
                      className={`p-5 rounded-3xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${frameStyle === 'bottom-label' ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-md ring-4 ring-blue-50' : 'border-slate-100 bg-white text-slate-400'}`}
                    >
                      <Layout size={24} />
                      <span className="text-xs font-black uppercase tracking-widest">Banner Box</span>
                    </button>
                    <button 
                      onClick={() => setFrameStyle('full-border')}
                      className={`p-5 rounded-3xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${frameStyle === 'full-border' ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-md ring-4 ring-blue-50' : 'border-slate-100 bg-white text-slate-400'}`}
                    >
                      <Square size={24} />
                      <span className="text-xs font-black uppercase tracking-widest">Border Frame</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-pink-50 rounded-lg text-pink-600">
                <Palette size={20} />
              </div>
              <h2 className="text-lg font-bold text-slate-800">QR Pattern & Background</h2>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pattern Color</label>
                <div className="flex items-center gap-4 p-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl">
                  <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="w-10 h-10 border-none bg-transparent rounded-lg cursor-pointer" />
                  <input type="text" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="bg-transparent text-sm font-mono w-full outline-none uppercase font-bold text-slate-600" />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Background Color</label>
                <div className="flex items-center gap-4 p-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl">
                  <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-10 h-10 border-none bg-transparent rounded-lg cursor-pointer" />
                  <input type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="bg-transparent text-sm font-mono w-full outline-none uppercase font-bold text-slate-600" />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Preview Column */}
        <div className="lg:col-span-5">
          <div className="sticky top-24">
            <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-200 flex flex-col items-center overflow-hidden relative">
              <button 
                onClick={() => {
                  setFgColor('#0284c7');
                  setBgColor('#ffffff');
                  setLogo(null);
                  setFrameEnabled(true);
                  setFrameText('SCAN ME');
                  setFrameColor('#0284c7');
                  setLogoBgColor('#f97316');
                  setLogoBorderWidth(6);
                  setLogoSize(480);
                }}
                className="absolute top-6 right-6 p-3 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-white rounded-2xl transition-all shadow-sm border border-slate-100 z-10"
                title="Reset Design"
              >
                <RefreshCw size={20} />
              </button>

              <div className="w-full mb-8">
                <h3 className="font-black text-slate-900 text-2xl tracking-tighter uppercase">Live Studio</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Direct WYSIWYG Rendering</p>
              </div>

              {/* QR Preview Wrapper */}
              <div 
                className={`relative p-8 rounded-[2.5rem] transition-all duration-500 flex flex-col items-center justify-center shadow-inner`}
                style={{ backgroundColor: bgColor }}
              >
                <div 
                  className={`relative flex flex-col items-center transition-all duration-500 ${frameEnabled ? 'p-3' : ''}`}
                >
                  <div 
                    ref={qrRef} 
                    className="bg-white p-3 rounded-2xl shadow-sm"
                    style={{ backgroundColor: bgColor }}
                  >
                    {/* Rendered at high-res 2048 natively, scaled via CSS to look sharp in preview */}
                    <QRCodeCanvas
                      value={url || ' '}
                      size={2048}
                      style={{ width: '280px', height: '280px' }}
                      fgColor={fgColor}
                      bgColor={bgColor}
                      level="H"
                      includeMargin={false}
                      imageSettings={processedLogo ? {
                        src: processedLogo,
                        height: logoSize,
                        width: logoSize,
                        excavate: isExcavated,
                      } : undefined}
                    />
                  </div>
                  
                  {frameEnabled && frameStyle === 'bottom-label' && (
                    <div 
                      className="w-full -mt-2 py-5 rounded-b-[2rem] shadow-xl flex items-center justify-center border-t-0"
                      style={{ backgroundColor: frameColor, width: '280px' }}
                    >
                      <span 
                        className="text-lg font-black tracking-widest text-center"
                        style={{ color: frameTextColor }}
                      >
                        {frameText.toUpperCase()}
                      </span>
                    </div>
                  )}

                  {frameEnabled && frameStyle === 'full-border' && (
                    <div 
                      className="absolute inset-0 border-[8px] rounded-[2.5rem] pointer-events-none"
                      style={{ borderColor: frameColor, width: 'calc(280px + 1.5rem)', height: 'calc(280px + 1.5rem)', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                    />
                  )}
                </div>
              </div>

              <div className="w-full text-center mt-10 mb-10 space-y-2">
                <p className="text-slate-900 font-black text-xl truncate px-4 leading-tight">
                  {aiResult?.suggestedDescription || "Custom Designer Code"}
                </p>
                <p className="text-slate-400 text-xs truncate px-8 italic font-medium">
                  {url || "Add a URL destination..."}
                </p>
              </div>

              <div className="w-full space-y-4">
                <Button 
                  onClick={downloadQR} 
                  className="w-full py-5 text-xl font-black rounded-2xl shadow-2xl shadow-blue-200 bg-gradient-to-r from-blue-600 to-indigo-700 transition-transform active:scale-95"
                >
                  <Download size={24} className="mr-2" />
                  EXPORT CROPPED PNG
                </Button>
                <div className="flex items-center justify-center gap-2 text-slate-400">
                  <Maximize2 size={14} className="opacity-50" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">High Resolution Composite</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8 text-slate-400 text-sm font-medium">
          <p>© 2024 QR Logo Studio Engine • Professional Assets</p>
          <div className="flex gap-10 font-bold uppercase tracking-widest text-[10px]">
            <a href="#" className="hover:text-blue-600 transition-colors">Privacy Cloud</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Usage Terms</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
