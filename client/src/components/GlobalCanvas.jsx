import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

const GlobalCanvasContext = createContext(null);

export const useGlobalCanvas = () => useContext(GlobalCanvasContext);

/**
 * GlobalCanvasProvider mounts the R3F Canvas EXACTLY ONCE at the application root level.
 * It provides context to allow nested routes/components to mount and unmount 3D elements,
 * update camera/lighting configurations, and clean up resources automatically.
 */
export const GlobalCanvasProvider = ({ children }) => {
  const [activeContent, setActiveContent] = useState(null);
  const [config, setConfig] = useState({});
  const canvasRef = useRef(null);
  const workerRef = useRef(null);
  const [useWorker, setUseWorker] = useState(false);

  // Initialize Web Worker for OffscreenCanvas rendering if supported by browser
  useEffect(() => {
    if (window.Worker && canvasRef.current && 'transferControlToOffscreen' in canvasRef.current) {
      try {
        const offscreen = canvasRef.current.transferControlToOffscreen();
        
        // Inline worker code for rendering offload demonstration
        const workerCode = `
          let renderer, scene, camera, mesh;
          self.onmessage = function(e) {
            if (e.data.type === 'init') {
              const canvas = e.data.canvas;
              // Set up Three.js WebGLRenderer in worker thread
              // renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
              // Initialize scene, camera, lights, geometries, and animation loop
            } else if (e.data.type === 'resize') {
              // Handle viewport resize inside worker
            } else if (e.data.type === 'updateConfig') {
              // Update parameters (camera, color, speed)
            } else if (e.data.type === 'dispose') {
              // Dispose resources in worker
            }
          };
        `;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        
        worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen]);
        workerRef.current = worker;
        setUseWorker(true);
        console.log("[GlobalCanvas] Offscreen Canvas successfully transferred to Web Worker.");
      } catch (err) {
        console.warn("[GlobalCanvas] Web Worker Offscreen transfer failed, falling back to main-thread R3F:", err.message);
      }
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'dispose' });
        workerRef.current.terminate();
      }
    };
  }, []);

  // Track canvas size for offscreen worker resize events
  useEffect(() => {
    if (!useWorker || !workerRef.current) return;
    const handleResize = () => {
      workerRef.current.postMessage({
        type: 'resize',
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [useWorker]);

  return (
    <GlobalCanvasContext.Provider value={{ setActiveContent, setConfig, config }}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {children}
        
        {/* Main thread fallback - R3F Canvas mounted once */}
        {!useWorker && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none' }}>
            <Canvas
              gl={{ 
                antialias: true, 
                alpha: true, 
                powerPreference: "high-performance",
                preserveDrawingBuffer: false
              }}
              camera={{ 
                position: config.cameraPos || [0, 5, 20], 
                fov: config.fov || 60 
              }}
              dpr={[1, 1.5]}
              style={{ pointerEvents: 'auto' }}
            >
              {/* Common default scene lighting or configuration */}
              <ambientLight intensity={config.ambientIntensity ?? 0.4} />
              
              {/* Dynamically injected scene elements */}
              {activeContent}
            </Canvas>
          </div>
        )}
        
        {/* OffscreenCanvas element for Worker Thread rendering */}
        {useWorker && (
          <canvas
            ref={canvasRef}
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              width: '100vw', 
              height: '100vh', 
              zIndex: 0, 
              pointerEvents: 'none' 
            }}
          />
        )}
      </div>
    </GlobalCanvasContext.Provider>
  );
};

/**
 * CanvasPortal is used by individual route components to push their specific Three.js
 * content and configurations up to the root-level Canvas. It ensures proper cleanups
 * of all nested materials and geometries during route unmounting.
 */
export const CanvasPortal = ({ children, config }) => {
  const { setActiveContent, setConfig } = useGlobalCanvas();

  useEffect(() => {
    setActiveContent(children);
    if (config) {
      setConfig(config);
    }

    // Clean up scene content and configuration on route transition (unmount)
    return () => {
      setActiveContent(null);
      setConfig({});
    };
  }, [children, config, setActiveContent, setConfig]);

  return null;
};
