import { Suspense, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { Billboard, Center } from '@react-three/drei';
import * as THREE from 'three';

interface FitTarget {
  w: number;
  h: number;
  d: number;
}

function useFitScale(object: THREE.Object3D, target: FitTarget): [number, number, number] {
  return useMemo(() => {
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    return [
      size.x > 1e-6 ? target.w / size.x : 1,
      size.y > 1e-6 ? target.h / size.y : 1,
      size.z > 1e-6 ? target.d / size.z : 1,
    ];
  }, [object, target.w, target.h, target.d]);
}

function GlbCustomModel({ url, target }: { url: string; target: FitTarget }) {
  const gltf = useLoader(GLTFLoader, url);
  const scale = useFitScale(gltf.scene, target);
  return (
    <group scale={scale}>
      <Center top>
        <primitive object={gltf.scene} />
      </Center>
    </group>
  );
}

function ObjCustomModel({ url, target }: { url: string; target: FitTarget }) {
  const obj = useLoader(OBJLoader, url);
  const withMaterial = useMemo(() => {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh && !child.material) {
        child.material = new THREE.MeshStandardMaterial({ color: '#b7b7b7' });
      }
    });
    return obj;
  }, [obj]);
  const scale = useFitScale(withMaterial, target);
  return (
    <group scale={scale}>
      <Center top>
        <primitive object={withMaterial} />
      </Center>
    </group>
  );
}

/** A user-supplied GLB/OBJ model, non-uniformly scaled to the item's real
 * width/height/depth so it occupies the exact footprint the user specified —
 * space-planning accuracy matters more here than preserving the model's
 * native proportions. */
export function CustomModel({
  url,
  format,
  target,
}: {
  url: string;
  format: 'glb' | 'gltf' | 'obj' | null;
  target: FitTarget;
}) {
  return (
    <Suspense fallback={null}>
      {format === 'obj' ? (
        <ObjCustomModel url={url} target={target} />
      ) : (
        <GlbCustomModel url={url} target={target} />
      )}
    </Suspense>
  );
}

function PhotoBillboardImpl({ url, widthM, heightM }: { url: string; widthM: number; heightM: number }) {
  const texture = useLoader(THREE.TextureLoader, url);
  return (
    <Billboard position={[0, heightM / 2, 0]}>
      <mesh>
        <planeGeometry args={[widthM, heightM]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </Billboard>
  );
}

/** Reference photo shown as a camera-facing card, 3D view only — in the 2D
 * top-down view a billboard would just look like a flat top-down patch, so
 * the item's plain colored footprint (rendered by the caller) is what
 * actually conveys its size there. */
export function PhotoBillboard(props: { url: string; widthM: number; heightM: number }) {
  return (
    <Suspense fallback={null}>
      <PhotoBillboardImpl {...props} />
    </Suspense>
  );
}
