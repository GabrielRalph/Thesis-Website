import { loadSTL, STLLoader } from "../Resources/Three/Loaders/STLLoader.js";
import { UR5Scene } from "./ur5-scene.js";
import * as THREE from '../Resources/Three/three.js';
import * as LoadCount from "./loadCount.js";
class VoxelMaskedMaterial extends THREE.MeshStandardMaterial {
  constructor(voxelGridOffset, voxelSize, voxelShape, coverColor, parameters = {}) {
    super(parameters);

    const totalCount = voxelShape[0] * voxelShape[1] * voxelShape[2];
    const voxelArray = new Uint8Array(totalCount);
    const voxelTexture = new THREE.Data3DTexture(voxelArray, ...voxelShape);
    voxelTexture.format = THREE.RedFormat;
    voxelTexture.type = THREE.UnsignedByteType;
    voxelTexture.minFilter = THREE.NearestFilter;
    voxelTexture.magFilter = THREE.NearestFilter;
    voxelTexture.unpackAlignment = 1;
    voxelTexture.needsUpdate = true;

    this.voxelTexture = voxelTexture;
    this.voxelArray = voxelArray;

    let totalSize = voxelShape.map((v, i) => v * voxelSize[i]);
    console.log(totalSize);
    

    this.uniforms = {
      uVoxelTex: { value: voxelTexture },
      uVoxelGridOffset: { value: new THREE.Vector3(...voxelGridOffset) },
      uVoxelSize: { value: new THREE.Vector3(...voxelShape.map((v, i) => v * voxelSize[i])) },
      uCoveredColor: { value: coverColor },
    };

  this.onBeforeCompile = (shader) => {
  Object.assign(shader.uniforms, this.uniforms);

  // Vertex shader: only declare vObjectPos
  shader.vertexShader =
    `varying vec3 vObjectPos;\n` +
    shader.vertexShader.replace(
      `#include <worldpos_vertex>`,
      `#include <worldpos_vertex>
       vObjectPos = position;
      `
    );

  // Fragment shader: prepend voxel helper
  const voxelPrelude = `
    uniform sampler3D uVoxelTex;
    uniform vec3 uVoxelGridOffset;
    uniform vec3 uVoxelSize;
    uniform vec3 uCoveredColor;
    varying vec3 vObjectPos;

    float sampleVoxel(vec3 pos) {
      vec3 uvw = (pos - uVoxelGridOffset) / uVoxelSize;
      if (any(lessThan(uvw, vec3(0.0))) || any(greaterThan(uvw, vec3(1.0)))) return 0.0;
      float value = texture(uVoxelTex, uvw).r;
      return step(0.5, value);
    }
  `;
  shader.fragmentShader = voxelPrelude + "\n" + shader.fragmentShader;

  // Replace outgoingLight application
  shader.fragmentShader = shader.fragmentShader.replace(
    /vec3 outgoingLight = totalDiffuse \+ totalSpecular \+ totalEmissiveRadiance;/,
    `
      vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
      float covered = sampleVoxel(vObjectPos);
      if (covered > 0.5) {
          outgoingLight *= uCoveredColor; // voxel color modulated by lighting
      }
    `
  );

  this.userData.shader = shader;
};
  }
}


class UR5Episode extends UR5Scene {
    constructor() {
        super();
    }

    async load() {
        LoadCount.add();
        let baseProm = super.load();
        let epUrl = this.getAttribute("episode-src");
        this.episode = await (await fetch(epUrl)).json();

        let objectName = this.episode.object;
        let url = "./Assets/Objects/" + objectName + ".stl";

        let data = await (await fetch(url)).arrayBuffer()
        const loader = new STLLoader();
        const geometry = loader.parse(data);
        const material = new VoxelMaskedMaterial(
            this.episode.voxelGridOffset,
            this.episode.voxelSize,
            this.episode.voxelGridSize,
            new THREE.Color(0x33ff00),
            { 
            roughness: 0.3,
            metalness: 0.3, 
            side: THREE.DoubleSide,
            flatShading: false,
            vertexColors: false
        });
        this.objectMaterial = material;
        const mesh = new THREE.Mesh( geometry, material );
        this.add(mesh);

        mesh.matrix.set(...this.episode.transform);
        mesh.matrixAutoUpdate = false;

        await baseProm
        LoadCount.done();
    }

    async onconnected() {
        console.log("connected");
        console.log(this.anim_prom);
        
        if (this.anim_prom) {
            this._stop = true;
            await this.anim_prom;
        }

        console.log("finised waiting");
        
        this.anim_prom = this.animate_ep()
    }

    ondisconnected() {
        console.log("disconnected");
        this._stop = true;
    }

    

    async animate_ep() {
        this._stop = false;
        await this.loadingProm;
        console.log("here");
        
        for (let i = 0; i < this.objectMaterial.voxelArray.length; i++) {
            this.objectMaterial.voxelArray[i] = 0;
        }
        this.objectMaterial.voxelTexture.needsUpdate = true;

        this.q = this.episode.jointPositions[0];
        // Play through the episode
        console.log("here2");

        await new Promise(r => setTimeout(r, 2000));
        
        for (let i = 0; i < this.episode.jointPositions.length; i++) {
            if (this._stop) break;
            for (let v of this.episode.voxelsAdded[i]) {
                if (v < 0 || v >= this.objectMaterial.voxelArray.length) {
                    console.warn("Voxel index out of bounds:", v);
                }
                this.objectMaterial.voxelArray[v] = 255;
            }
            this.objectMaterial.voxelTexture.needsUpdate = true;
            let q = this.episode.jointPositions[i];
            await this.ur5.kinematics.moveTo(q, 3);
        }
    }
}

customElements.define("ur5-episode", UR5Episode);