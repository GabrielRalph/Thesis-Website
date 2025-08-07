import { JSTLGroup } from "../Resources/JSTL/jstl.js";
import { M2str, URx } from "../Resources/JSTL/urx-jstl.js";
import {} from "../Resources/Three/basic-scene.js";
import {Matrix3, Vector3, SphereGeometry, AxesHelper, MeshBasicMaterial, MeshStandardMaterial, Matrix4, Group, Mesh, DoubleSide} from "https://cdn.jsdelivr.net/npm/three@0.174.0/+esm";

let data = await (await fetch("./configrefe.bin")).arrayBuffer();

let n = data.byteLength;

let threeScene = document.querySelector("three-scene");
let u8 = new Int8Array(data);
let colors = new Array(u8.length).fill(0).map((_, i) => i%3 == 0 ? 255:0)
// console.log(data)
// threeScene.addPointCloud(u8, colors)

const nodeMaterial = new MeshStandardMaterial({ color: 0x00ff00 });
// const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });

// Create nodes (as spheres)
const nodeGeometry = new SphereGeometry(0.8, 16, 16);
for (let i = 0; i < u8.length; i+=3) {
    let v = [u8[i], u8[i+1], u8[i+2]].map(parseFloat)
    const mesh = new Mesh(nodeGeometry, nodeMaterial);
    mesh.position.set(...v);
    threeScene.add(mesh);
}


// // console.log(u8);
// let a = new Array(50).fill(0).map(() => 
//     new Array(50).fill(0).map(() => 
//         new Array(50).fill(1)
//     )
// )

// for (let i = 0; i < n; i+= 3) {
//     // let v = [u8[i], u8[i+1], u8[i+2]].map(parseFloat)
//     a[u8[i]][u8[i+1]][u8[i+2]] = 0;
// }
// let points = []
// for (let i =0; i < 50; i++) {
//     for (let j = 0; j < 50; j++) {
//         for (let k = 0; k < 50; k++) {
//             if (a[i][j][k] === 1) {
//                 points.push([i,j,k])
//                 threeScene.addSphere(0.5, [i,j,k], 0x0000ff)

//             }
//         }
//     }
// }

threeScene.add(new AxesHelper(100))

threeScene.addSphere(0.5, [0,0,50], 0x0000ff)
threeScene.addSphere(0.5, [0,50, 0], 0x00ff00)
threeScene.addSphere(0.5, [50, 0, 0], 0xff0000)


// for (let i =0; i < 15; i++) {
//     for (let j = 0; j < 15; j++) {

//     }
// }
// // for (let i = 0; i)