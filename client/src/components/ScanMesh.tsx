import { Suspense, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { Html, Center } from '@react-three/drei';
import * as THREE from 'three';
import type { Scan } from '../types';
import { scanFileUrl } from '../api';

function GlbScan({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url);
  return <primitive object={gltf.scene} />;
}

function ObjScan({ url }: { url: string }) {
  const obj = useLoader(OBJLoader, url);
  const withMaterial = useMemo(() => {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh && !child.material) {
        child.material = new THREE.MeshStandardMaterial({ color: '#b7b7b7' });
      }
    });
    return obj;
  }, [obj]);
  return <primitive object={withMaterial} />;
}

function UnsupportedScan({ format }: { format: string }) {
  return (
    <Html center>
      <div className="scan-unsupported-note">
        Preview isn't available for <strong>.{format}</strong> scans in the browser yet.
        <br />
        Export your scan as GLB or OBJ for a full 3D/2D preview — the file is still stored
        and attached to this project.
      </div>
    </Html>
  );
}

export function ScanMesh({ scan }: { scan: Scan }) {
  const url = scanFileUrl(scan);

  if (scan.format === 'usdz') {
    return <UnsupportedScan format="usdz" />;
  }

  return (
    <Suspense fallback={<Html center>Loading scan…</Html>}>
      <Center bottom>
        {scan.format === 'obj' ? <ObjScan url={url} /> : <GlbScan url={url} />}
      </Center>
    </Suspense>
  );
}
