"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function SpatialScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.6, 7.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const ambient = new THREE.AmbientLight(0x9ddff1, 0.45);
    scene.add(ambient);

    const keyLight = new THREE.PointLight(0x20e7ff, 30, 18);
    keyLight.position.set(-4, 3, 4);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xffc857, 18, 16);
    rimLight.position.set(4, -2, 3);
    scene.add(rimLight);

    const shieldGeometry = new THREE.IcosahedronGeometry(1.35, 2);
    const shieldMaterial = new THREE.MeshStandardMaterial({
      color: 0x0d3a48,
      emissive: 0x062f3b,
      emissiveIntensity: 0.7,
      roughness: 0.28,
      metalness: 0.45,
      transparent: true,
      opacity: 0.45,
      wireframe: true,
    });
    const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
    shield.position.set(2.85, 0.15, -1.3);
    group.add(shield);

    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x21d4e8, transparent: true, opacity: 0.28 });
    const rings = [1.9, 2.25, 2.65].map((radius, index) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.006, 8, 128), ringMaterial.clone());
      ring.position.copy(shield.position);
      ring.rotation.set(Math.PI / 2 + index * 0.34, index * 0.42, index * 0.24);
      group.add(ring);
      return ring;
    });

    const nodeGeometry = new THREE.SphereGeometry(0.035, 12, 12);
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x77f7ff });
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x35d3e5, transparent: true, opacity: 0.22 });
    const nodes: THREE.Mesh[] = [];

    for (let i = 0; i < 34; i++) {
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial.clone());
      const angle = (i / 34) * Math.PI * 2;
      const radius = 1.6 + (i % 6) * 0.28;
      node.position.set(
        Math.cos(angle) * radius - 1.6,
        Math.sin(angle * 1.7) * 0.8 + ((i % 5) - 2) * 0.2,
        Math.sin(angle) * 1.2 - 0.4
      );
      nodes.push(node);
      group.add(node);
    }

    for (let i = 0; i < nodes.length; i += 2) {
      const points = [nodes[i].position, nodes[(i + 7) % nodes.length].position];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      group.add(new THREE.Line(geometry, lineMaterial));
    }

    const particlesGeometry = new THREE.BufferGeometry();
    const particleCount = 560;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particlesGeometry,
      new THREE.PointsMaterial({
        color: 0x87f9ff,
        size: 0.012,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      })
    );
    scene.add(particles);

    const grid = new THREE.GridHelper(16, 32, 0x1b6372, 0x12313f);
    grid.position.y = -2.7;
    grid.rotation.x = 0.05;
    scene.add(grid);

    let frameId = 0;
    const timer = new THREE.Timer();
    timer.connect(document);
    timer.reset();

    const animate = (timestamp?: number) => {
      timer.update(timestamp);
      const elapsed = timer.getElapsed();
      group.rotation.y = Math.sin(elapsed * 0.18) * 0.08;
      shield.rotation.x = elapsed * 0.18;
      shield.rotation.y = elapsed * 0.24;
      rings.forEach((ring, index) => {
        ring.rotation.z = elapsed * (0.12 + index * 0.04);
        ring.rotation.x += 0.0015 + index * 0.0004;
      });
      particles.rotation.y = elapsed * 0.018;
      particles.rotation.x = Math.sin(elapsed * 0.08) * 0.035;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    const resize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", resize);
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      mount.removeChild(renderer.domElement);
      timer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) {
            material.forEach((item) => item.dispose());
          } else {
            material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="pointer-events-none fixed inset-0 -z-20" aria-hidden="true" />;
}
