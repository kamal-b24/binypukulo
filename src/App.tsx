/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Camera, 
  Upload, 
  Loader2, 
  Image as ImageIcon, 
  X, 
  BookOpen,
  Sparkles,
  Heart,
  RefreshCcw,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

type AppState = 'IDLE' | 'ANALYZING' | 'RESULT';

export default function App() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string>('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        processImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setSelectedImage(dataUrl);
        stopCamera();
        processImage(dataUrl);
      }
    }
  };

  const processImage = async (imageData: string) => {
    setAppState('ANALYZING');
    setAnswer('');

    try {
      const model = "gemini-3-flash-preview";
      const [header, base64Data] = imageData.split(',');
      const mimeType = header.split(':')[1].split(';')[0];

      const systemInstruction = `
        तपाईं एक विशेषज्ञ शिक्षक हुनुहुन्छ जसले त्रिभुवन विश्वविद्यालय (TU) BBS तेस्रो वर्षको पाठ्यक्रम (Syllabus) मा आधारित प्रश्नहरूको उत्तर दिनुहुन्छ।
        
        नियमहरू:
        १. सबै उत्तरहरू अनिवार्य रूपमा नेपाली भाषामा हुनुपर्छ, प्रश्न अंग्रेजीमा भए पनि।
        २. उत्तरको लम्बाइ प्रश्नको अंक (Marks) अनुसार हुनुपर्छ:
           - १ अंक: छोटो र सटीक (१-२ वाक्य)
           - २ अंक: अलि लामो (३-४ वाक्य)
           - ५ अंक: विस्तृत व्याख्या (१५०-२०० शब्द)
           - १० अंक: धेरै विस्तृत र बुँदागत व्याख्या (४००-५०० शब्द)
        ३. यदि प्रश्नमा अंक उल्लेख छैन भने, प्रश्नको प्रकृति हेरेर उपयुक्त लम्बाइ छान्नुहोस्।
        ४. उत्तर सरल, स्पष्ट र विद्यार्थीले बुझ्ने खालको हुनुपर्छ।
        ५. BBS तेस्रो वर्षका विषयहरू (Business Environment & Strategy, Fundamental of Financial Management, Business Law, Taxation in Nepal, Organizational Behavior & HRM) मा केन्द्रित रहनुहोस्।
        ६. यदि प्रश्न BBS तेस्रो वर्षको पाठ्यक्रम बाहिरको छ भने, नम्रतापूर्वक भन्नुहोस् कि तपाईं केवल BBS तेस्रो वर्षको लागि मात्र मद्दत गर्न सक्नुहुन्छ।
      `;

      const response = await ai.models.generateContent({
        model,
        contents: [{
          parts: [
            { text: "यस फोटोमा भएको प्रश्नको उत्तर दिनुहोस्।" },
            { inlineData: { mimeType: mimeType || "image/jpeg", data: base64Data } }
          ]
        }],
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      setAnswer(response.text || "माफ गर्नुहोस्, मैले उत्तर फेला पार्न सकिन।");
      setAppState('RESULT');
    } catch (error) {
      console.error("AI Error:", error);
      setAnswer("प्राविधिक त्रुटि भयो। कृपया फेरि प्रयास गर्नुहोस्।");
      setAppState('RESULT');
    }
  };

  const resetApp = () => {
    setAppState('IDLE');
    setSelectedImage(null);
    setAnswer('');
  };

  return (
    <div className="min-h-screen bg-[#FFF5F7] font-sans text-slate-800 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-pink-100 py-4 px-6 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-400 rounded-full flex items-center justify-center text-white shadow-lg">
              <BookOpen size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-pink-600 tracking-tight">Biney Butki Pukulo</h1>
              <p className="text-xs text-pink-400 font-medium uppercase tracking-widest flex items-center gap-1">
                TU BBS 3rd Year Assistant <Heart size={10} fill="currentColor" />
              </p>
            </div>
          </div>
          {appState !== 'IDLE' && (
            <button 
              onClick={resetApp}
              className="text-pink-500 hover:bg-pink-50 p-2 rounded-full transition-colors"
            >
              <RefreshCcw size={20} />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 max-w-4xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {appState === 'IDLE' && (
            <motion.div 
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full space-y-8 text-center"
            >
              <div className="inline-block px-4 py-1.5 bg-pink-100 text-pink-600 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                Step 1: Upload Question
              </div>
              <div className="space-y-4">
                <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center text-pink-400 mx-auto">
                  <ImageIcon size={48} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-slate-700">नमस्ते बिने!</h2>
                  <p className="text-slate-500 max-w-xs mx-auto">
                    आफ्नो प्रश्नको फोटो खिच्नुहोस् वा अपलोड गर्नुहोस्। म तुरुन्तै नेपालीमा उत्तर दिनेछु।
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg mx-auto">
                <button 
                  onClick={startCamera}
                  className="flex flex-col items-center gap-4 p-8 bg-white rounded-3xl border-2 border-pink-100 hover:border-pink-300 hover:shadow-xl transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-pink-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10 w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                    <Camera size={32} />
                  </div>
                  <div className="relative z-10 text-center">
                    <span className="block text-lg font-bold text-slate-700">फोटो खिच्नुहोस्</span>
                    <span className="text-sm text-slate-400">क्यामेरा प्रयोग गर्नुहोस्</span>
                  </div>
                </button>

                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-4 p-8 bg-white rounded-3xl border-2 border-pink-100 hover:border-pink-300 hover:shadow-xl transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-pink-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10 w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                    <Upload size={32} />
                  </div>
                  <div className="relative z-10 text-center">
                    <span className="block text-lg font-bold text-slate-700">अपलोड गर्नुहोस्</span>
                    <span className="text-sm text-slate-400">ग्यालरीबाट छान्नुहोस्</span>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {appState === 'ANALYZING' && (
            <motion.div 
              key="analyzing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center space-y-8"
            >
              <div className="inline-block px-4 py-1.5 bg-pink-100 text-pink-600 rounded-full text-xs font-bold uppercase tracking-widest">
                Step 2: Analyzing Question
              </div>
              <div className="relative">
                <div className="w-48 h-48 rounded-3xl overflow-hidden border-4 border-white shadow-2xl">
                  <img src={selectedImage!} alt="Analyzing" className="w-full h-full object-cover" />
                </div>
                <motion.div 
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-1 bg-pink-400 shadow-[0_0_15px_rgba(244,114,182,0.8)] z-10"
                />
              </div>
              <div className="flex flex-col items-center space-y-3">
                <Loader2 size={40} className="animate-spin text-pink-500" />
                <h3 className="text-xl font-bold text-pink-600">प्रश्न विश्लेषण गर्दै...</h3>
                <p className="text-slate-400 text-sm">कृपया केही समय पर्खनुहोस्</p>
              </div>
            </motion.div>
          )}

          {appState === 'RESULT' && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-500">
                  <CheckCircle2 size={24} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Step 3: Result</span>
                    <span className="font-bold">उत्तर तयार छ!</span>
                  </div>
                </div>
                <button 
                  onClick={resetApp}
                  className="text-sm font-semibold text-pink-500 hover:underline flex items-center gap-1"
                >
                  <RefreshCcw size={14} /> अर्को प्रश्न सोध्नुहोस्
                </button>
              </div>

              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-pink-50">
                <div className="p-6 sm:p-8">
                  <div className="prose prose-pink prose-lg max-w-none text-slate-700 leading-relaxed">
                    <Markdown>{answer}</Markdown>
                  </div>
                </div>
                <div className="bg-pink-50 px-6 py-4 flex items-center justify-between border-t border-pink-100">
                  <div className="flex items-center gap-2 text-pink-400 text-xs font-bold uppercase tracking-widest">
                    <Sparkles size={14} /> TU BBS 3rd Year Guide
                  </div>
                  <div className="text-pink-300">
                    <Heart size={16} fill="currentColor" />
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <button 
                  onClick={resetApp}
                  className="bg-pink-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-pink-200 hover:bg-pink-600 transition-all active:scale-95 flex items-center gap-2"
                >
                  अर्को प्रश्नको फोटो खिच्नुहोस् <Camera size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Hidden Inputs */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*,application/pdf" 
        className="hidden" 
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Modal */}
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4"
          >
            <div className="relative w-full max-w-2xl bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white/10">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-auto"
              />
              <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-12">
                <button 
                  onClick={stopCamera}
                  className="w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <X size={28} />
                </button>
                <button 
                  onClick={capturePhoto}
                  className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 group"
                >
                  <div className="w-full h-full rounded-full bg-white group-active:scale-90 transition-transform" />
                </button>
                <div className="w-14 h-14" />
              </div>
            </div>
            <div className="mt-8 text-center space-y-2">
              <p className="text-white text-lg font-bold">प्रश्नको फोटो खिच्नुहोस्</p>
              <p className="text-white/40 text-sm">सुनिश्चित गर्नुहोस् कि अक्षरहरू स्पष्ट छन्</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Decoration */}
      <footer className="py-6 text-center text-pink-200 text-xs font-medium tracking-widest uppercase">
        Made with Love for BBS Students
      </footer>
    </div>
  );
}
