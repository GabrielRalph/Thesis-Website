import { loadZipFS } from "../Resources/zip.js";
import { ThreeScene } from "../Resources/Three/basic-scene.js";
import { PointCloud } from "../Resources/pc.js";
import * as THREE from "../Resources/Three/three.js";
import * as LoadCount from "./loadCount.js";

async function parseCluster(url) {
    let fs = await loadZipFS(url);
    let rootName = Object.keys(fs)[0];
    let [clusterMin, clusterMax] = rootName.split("_").slice(-2).map(x => parseInt(x));
    let root = fs[rootName];
    let clusterGroups = new Array(Object.keys(root).length);

    let proms = Object.keys(root).map((key) => {
        let index = parseInt(key.split("_")[1]);
        clusterGroups[index] = new Array(Object.keys(root[key]).length);
        return Object.keys(root[key]).map(async (clusterName, i) => {
            let sizeString = clusterName.split(".").slice(0, -1).join(".").split("_")[1];
            let uintu = await root[key][clusterName].getUint8Array()
            let cluster = {
                size: parseFloat(sizeString),
                data: new Float32Array(uintu.buffer)
            }
            clusterGroups[index][i] = cluster;
        })
    })

    
    await Promise.all(proms.flat());

    return {clusterMin, clusterMax, clusterGroups}
}

const { abs, min, max, round } = Math;

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from https://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {Array}           The RGB representation
 */
function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h + 1/3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1/3);
  }

  return [r, g, b];
}

function hueToRgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1/6) return p + (q - p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}


class PCClusterVisual extends ThreeScene {
    constructor() {
        super();
        this.loadPointCloud();
        
    }

    async loadPointCloud() {
        console.log("loading pc-cluster");
        LoadCount.add();
        
        let url = this.getAttribute("src");
        let clusterData = await parseCluster(url);
        LoadCount.done();
        while (true)  {
            for (let pcg of clusterData.clusterGroups) {
                this.clear();
                for (let pc of pcg) {
                    let pointCloud = new PointCloud(pc.data, {
                        color: new THREE.Color().setHSL(pc.size * 0.4, 1, 0.5)
                    }, 0.001);
                    this.add(pointCloud);
                }
                await new Promise((r) => setTimeout(r, 1700));
            }
        }
        

    }
}


customElements.define('pc-cluster-scene', PCClusterVisual);