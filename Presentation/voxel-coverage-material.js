import * as THREE from '../Resources/Three/three.js';

// class VoxelGrid {
//     constructor(dimX, dimY, dimZ, voxelSize, voxelOffset) {
//         let totalVoxels = dimX * dimY * dimZ;
//         let numBytes = Math.ceil(totalVoxels / 8);
//         this.bytes = new Uint8Array(numBytes);
//         this.bytes.fill(0);
//         this.voxelSize = voxelSize;
//         this.voxelOffset = voxelOffset;
//         this.dimX = dimX;
//         this.dimY = dimY;
//         this.dimZ = dimZ;
//     }

//     setVoxelIndex(x, y, z, value) {
//         let idx = x + y * this.dimX + z * this.dimX * this.dimY;
//         this.setIndex(idx, value);
//     }

//     setIndex(idx, value) {
//         let byteIndex = Math.floor(idx / 8);
//         let bitIndex = idx % 8;
//         if (value) {
//             this.bytes[byteIndex] |= (1 << bitIndex);
//         } else {
//             this.bytes[byteIndex] &= ~(1 << bitIndex);
//         }
//     }
// }



class VoxelMaskedMaterial extends THREE.MeshStandardMaterial {
  constructor(parameters = {}) {
    super(parameters);

    // Add voxel-specific uniforms
    this.uniforms = {
      uVoxelTex: { value: null },
      uVoxelGridOffset: { value: new THREE.Vector3(0, 0, 0) },
      uVoxelSize: { value: new THREE.Vector3(0.01, 0.01, 0.01) },
      uCoveredColor: { value: new THREE.Color(0xff0000) },
      uUseVoxels: { value: 1 },
    };

    // Optional: store the second "covered" material's properties
    this.coveredMaterial = parameters.coveredMaterial || null;

    this.onBeforeCompile = (shader) => {
      // Inject our uniforms
      shader.uniforms.uVoxelTex = this.uniforms.uVoxelTex;
      shader.uniforms.uGridMin = this.uniforms.uGridMin;
      shader.uniforms.uGridMax = this.uniforms.uGridMax;
      shader.uniforms.uCoveredColor = this.uniforms.uCoveredColor;

      // Inject 3D texture sampling helper
      shader.fragmentShader = `
        uniform sampler3D uVoxelTex;
        uniform vec3 uVoxelGridOffset;
        uniform vec3 uVoxelSize;
        uniform vec3 uCoveredColor;
        
        // returns 1.0 if covered, 0.0 if empty
        float sampleVoxel(vec3 worldPos) {
          vec3 uvw = (worldPos - uVoxelGridOffset) / uVoxelSize;
          if (any(lessThan(uvw, vec3(0.0))) || any(greaterThan(uvw, vec3(1.0)))) {
            return 0.0;
          }
          float value = texture(uVoxelTex, uvw).r; // assume red channel stores occupancy
          return step(0.5, value);
        }
      ` + shader.fragmentShader;

      // Inject sampling before final color output
      shader.fragmentShader = shader.fragmentShader.replace(
        /void main\(\) {/,
        `
        void main() {
          vec3 worldPos = vViewPosition * -1.0; // approximate world pos from view pos
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(/gl_FragColor = vec4\( outgoingLight, diffuseColor\.a \);/,
        `
          float covered = 0.0;
          covered = sampleVoxel(worldPos);
          if (covered > 0.5) {
            vec3 mixColor = uCoveredColor;
            gl_FragColor = vec4(mixColor, diffuseColor.a);
          } else {
            gl_FragColor = vec4(outgoingLight, diffuseColor.a);
          }
        `
      );

      this.userData.shader = shader; // store if you want to tweak later
    };
  }
}
