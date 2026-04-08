"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';

const GutLoadingAnimation = () => {
  // A flawlessly balanced set of pristine bezier curves mirroring the exact S-topology 
  // of the logo gut. By reverting to mathematically drawn SVGs instead of extracting 
  // rasterized pixel blocks, we guarantee pristine, non-fuzzy retina rendering.
  const gutPath = "M 15 15 C 110 15, 110 32, 55 32 C 0 32, 0 49, 55 49 C 110 49, 110 66, 55 66 C 0 66, 0 83, 15 83";

  return (
    <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>

      {/* Scaled gracefully with plenty of bounding box space to prevent clip squishing */}
      <div style={{ position: 'relative', width: '120px', height: '95px', margin: '0 auto 1.5rem auto' }}>
        
        {/* Layer 1: Base sharp vector layer, completely clean unbroken SVG! */}
        <svg width="120px" height="95px" style={{ position: 'absolute', top: 0, left: 0, display: 'block', overflow: 'visible' }}>
          <path
            d={gutPath}
            fill="none"
            stroke="#2c3e50"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </svg>

        {/* 
          Layer 2: The Masked Bulge layer. Natively scalable perfectly crisp SVG! 
          Takes the same mathematical shape but renders it fatter.
        */}
        <svg width="120px" height="95px" style={{ position: 'absolute', top: 0, left: 0, display: 'block', overflow: 'visible' }}>
          <defs>
            {/* 
              By nesting an <animateMotion> inside a pure SVG <mask id="..."> block, 
              we completely bypass robust CSS offset limitations. It perfectly trails the line!
            */}
            <mask id="travel-mask">
              <rect width="100%" height="100%" fill="black" />
              <circle r="14" fill="url(#softGradient)">
                <animateMotion dur="3s" repeatCount="indefinite" path={gutPath} />
              </circle>
            </mask>
            <radialGradient id="softGradient">
              <stop offset="0%" stopColor="white" />
              <stop offset="50%" stopColor="white" />
              <stop offset="100%" stopColor="black" />
            </radialGradient>
          </defs>

          {/* The physically bloated exact replica version, mapped locally to the dot via mask */}
          <path
            d={gutPath}
            fill="none"
            stroke="#2c3e50"
            strokeWidth="13"
            strokeLinecap="round"
            mask="url(#travel-mask)"
          />
        </svg>

      </div>
      <div style={{ fontWeight: 600, color: 'var(--primary-color)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
        Consulting the gut...
      </div>
    </div>
  );
};


export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setImageUrl(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      setImageUrl(data.imageUrl);
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GFCG-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading image:', err);
      alert('Failed to download image. You can right-click and save it instead.');
    }
  };

  return (
    <main className="container">
      <button className="info-button" aria-label="Information" onClick={() => setShowInfo(true)}>?</button>
      
      {showInfo && (
        <div className="modal-overlay" onClick={() => setShowInfo(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowInfo(false)} aria-label="Close">×</button>
            <h2>💡 How to use the Generator</h2>
            
            <div className="modal-section">
              <h3>Cost & Quality</h3>
              <p>This tool uses a very powerful, high-quality AI model. Each image costs the company about $0.05 to generate, so try to be thoughtful with your prompts and avoid rapid-fire testing!</p>
            </div>
            
            <div className="modal-section">
              <h3>The "Face Swap" Glitch</h3>
              <p>Sometimes, if the scenario is extremely complex or the guys are squished too closely together, the AI might get confused and mix up their faces (like accidentally giving James a mustache). Keep your prompt actions clear and simple for the best results!</p>
            </div>

            <div className="modal-section">
              <h3>Built-in Professional Photography</h3>
              <p>You don't need to type things like "highly detailed photo", "good lighting", or "85mm camera lens". Just type the action you want them doing, and the system automatically wraps your prompt in a professional corporate photography filter.</p>
            </div>

            <div className="modal-section">
              <h3>Patience</h3>
              <p>Good gut feelings take a little time to process! Each image will take about 10 to 15 seconds to fully generate.</p>
            </div>
          </div>
        </div>
      )}

      <header className="header">
        <div className="title-wrapper">
          <img src="/logo-nobg.png" alt="GFCG Logo" className="logo" />
          <h1>Image Generator</h1>
        </div>
        <p>Trust our gut. Generate GFCG Scenarios easily.</p>
      </header>
      
      <div className="layout">
        <section className="control-panel">
          <form className="card" onSubmit={handleGenerate}>
            <h2>Generate Image</h2>
            
            <div className="form-group">
              <label htmlFor="prompt">What should the guys be doing?</label>
              <textarea 
                id="prompt"
                className="form-control"
                rows={5}
                placeholder="e.g., staring confused at a whiteboard full of random numbers..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
                required
              />
            </div>

            {error && (
              <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="cta-button" 
              disabled={isGenerating || !prompt.trim()}
            >
              {isGenerating ? (
                <>Generating (this takes a moment)...</>
              ) : (
                <>Generate Image</>
              )}
            </button>
          </form>

          <div className="card" style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-color)', marginTop: 0, marginBottom: '1.5rem', fontWeight: 600 }}>
              The Characters
            </h3>
            
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', alignItems: 'center' }}>
              <img src="/face_andrew.png" alt="Andrew Clarke" style={{ width: '110px', height: '110px', borderRadius: '50%', flexShrink: 0, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a202c' }}>Andrew Clarke</div>
                <div style={{ fontSize: '0.8rem', color: '#4a5568', marginBottom: '0.5rem', fontWeight: 500 }}>Partner, Strategic Feelings</div>
                <div style={{ fontSize: '0.85rem', fontStyle: 'italic', lineHeight: 1.4, color: '#2d3748' }}>
                  "When in doubt, I trust my gut feel. When not in doubt, I trust it more."
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <img src="/face_james.png" alt="James Wilson" style={{ width: '110px', height: '110px', borderRadius: '50%', flexShrink: 0, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a202c' }}>James Wilson</div>
                <div style={{ fontSize: '0.8rem', color: '#4a5568', marginBottom: '0.5rem', fontWeight: 500 }}>Senior Gut Listener</div>
                <div style={{ fontSize: '0.85rem', fontStyle: 'italic', lineHeight: 1.4, color: '#2d3748' }}>
                  "Strong gut feel often replaces the need for a strong strategy."
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <section className="preview-area">
          <div className={`card ${!imageUrl ? 'preview-card' : ''}`}>
            {!imageUrl && !isGenerating && (
              <div className="preview-placeholder">
                <span>The generated image will appear here.</span>
              </div>
            )}
            
            {isGenerating && (
              <div className="preview-placeholder">
                <GutLoadingAnimation />
              </div>
            )}

            {imageUrl && !isGenerating && (
              <div className="generated-image-container">
                <img src={imageUrl} alt="Generated GFCG character" className="generated-image" />
                <div className="download-bar">
                  <button onClick={handleDownload} className="cta-button" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                    Download Image
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
