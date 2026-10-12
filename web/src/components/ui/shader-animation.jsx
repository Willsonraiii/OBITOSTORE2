import { useEffect, useRef } from "react";
import * as THREE from "three";

export function ShaderAnimation() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    let renderer = null;
    let canvas = null;
    let animationId = null;

    try {
      // Vertex shader
      const vertexShader = `
        void main() {
          gl_Position = vec4( position, 1.0 );
        }
      `;

      // Fragment shader
      const fragmentShader = `
        #define TWO_PI 6.2831853072
        #define PI 3.14159265359

        precision highp float;
        uniform vec2 resolution;
        uniform float time;

        void main(void) {
          vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
          float t = time*0.05;
          float lineWidth = 0.002;

          vec3 color = vec3(0.0);
          for(int j = 0; j < 3; j++){
            for(int i=0; i < 5; i++){
              color[j] += lineWidth*float(i*i) / abs(fract(t - 0.01*float(j)+float(i)*0.01)*5.0 - length(uv) + mod(uv.x+uv.y, 0.2));
            }
          }
          
          gl_FragColor = vec4(color[0],color[1],color[2],1.0);
        }
      `;

      // Initialize Three.js scene
      const camera = new THREE.Camera();
      camera.position.z = 1;

      const scene = new THREE.Scene();
      const geometry = new THREE.PlaneGeometry(2, 2);

      const uniforms = {
        time: { type: "f", value: 1.0 },
        resolution: { type: "v2", value: new THREE.Vector2() },
      };

      const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
      });

      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

      canvas = renderer.domElement;
      canvas.style.position = "fixed";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.right = "0";
      canvas.style.bottom = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "0";
      canvas.style.display = "block";
      container.appendChild(canvas);

      // Handle window resize
      const onWindowResize = () => {
        const width = window.innerWidth || document.documentElement.clientWidth;
        const height = window.innerHeight || document.documentElement.clientHeight;
        renderer.setSize(width, height, false);
        const pr = renderer.getPixelRatio ? renderer.getPixelRatio() : 1;
        uniforms.resolution.value.x = width * pr;
        uniforms.resolution.value.y = height * pr;
      };

      onWindowResize();
      window.addEventListener("resize", onWindowResize, false);
      window.addEventListener("orientationchange", onWindowResize, false);

      let isVisible = true;
      let isIntersecting = true;

      const animate = () => {
        if (isVisible && isIntersecting) {
          uniforms.time.value += 0.05;
          renderer.render(scene, camera);
        }
        animationId = requestAnimationFrame(animate);
      };

      const observer = new IntersectionObserver((entries) => {
        if (entries[0]) isIntersecting = entries[0].isIntersecting;
      });
      observer.observe(canvas);

      const handleVisibilityChange = () => {
        isVisible = document.visibilityState !== "hidden";
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);

      animate();

      return () => {
        window.removeEventListener("resize", onWindowResize);
        window.removeEventListener("orientationchange", onWindowResize);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        observer.disconnect();

        if (animationId) cancelAnimationFrame(animationId);
        if (container && canvas) {
          try { container.removeChild(canvas); } catch {}
        }
        renderer?.dispose();
        geometry?.dispose();
        material?.dispose();
      };
    } catch (e) {
      console.warn("WebGL Shader animation disabled on this device:", e);
      return () => {};
    }
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100dvh",
        minHeight: "100vh",
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
        backgroundColor: "#000000",
      }}
    />
  );
}
