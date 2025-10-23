import { RRT_star, RRT_star_bi, RRTBase, RRTBase3D } from "../RRT/rrt.js";
import { ur5e, checkCol, keyControls, delay } from "./ur5e-scene.js";

// const start = [ 2.7019792347424287,-1.3173311052470384,2.8275000189312407,-1.4862455674741186,Math.PI*2-5.067956569834711,2.4700399290593387 ];
// const goal =  [2.8019792347424284, -0.6173311052470392, 1.2525000189312463, -0.7612455674741201, Math.PI*2-7.742956569834749, 2.4700399290593387]
// // ur5e.q = [ 2.7019792347424287,-1.3173311052470384,2.8275000189312407,-1.4862455674741186,-5.067956569834711,2.4700399290593387 ]


// const t1 = new RRTBase(0.01);
// const t2 = new RRTBase(0.01);

// t1.isFree = (q) => {
//     ur5e.q = q;
//     return !checkCol(false);
// }
// t2.isFree = (q) => {
//     ur5e.q = q;
//     return !checkCol(false);
// }

// const start2 = [2.2269792347424304, -0.9923311052470395, 2.6275000189312414]
// const goal2 = [3.2769792347424267, -0.442331105247039, 0.9775000189312472]
// let start3d = [...start2, 0, 0, 0 ];
// let goal3d = [...goal2, 0, 0, 0 ];

// ur5e.q =goal3d;
// for (let i = 0; i < 1; i+=0.1) {
//     ur5e.q = start3d.map((e, j) => e * (1- i) + goal3d[j] * (i));
//     console.log("i");
    
//     await delay(100);
// }
// const sampler = () => new Array(6).fill(0).map(() => (Math.random() * 2 - 1) * Math.PI * 2);

// let comp = false;
// const itters = 100;
// for (let i = 0; i < itters; i++) {
//     for (let j = 0; j < itters; j++) {
//         let q = sampler();
//        comp = next(q);
//         if (comp) {
//             console.log("found");
//             break;
//         }   
//     }
//     if (comp) {
//         break;
//     }
//     await delay();
// }

// const best1 = t1.q_new;
// const best2 = t2.q_new;
// console.log(best1.cost + best2.cost);
// // const best = t1.nearest([...goal]);

// // console.log(best);
// const itter2 = 100;
// for (let i = 0; i < itter2; i++) {
//     for (let j = 0; j < itter2; j++) {
//         t1.starExtend(sampler());
//         t2.starExtend(sampler());
//         console.log(best1.cost + best2.cost);
        
//     }

//     await delay();
// }
// console.log(best1.cost + best2.cost);

// function getPathToRoot(leaf) {
//     let path = [[...leaf]];
//     while (leaf.parent) {
//         leaf = leaf.parent;
//         path.push([...leaf]);
//     }
//     return path
// }
// // const totalPath = getPathToRoot(best).reverse()
// // totalPath.push([...goal]); 

// // console.log(totalPath);

// let path1 = getPathToRoot(best1);
// let path2 = getPathToRoot(best2);

// let totalPath = [...path1.reverse(), ...path2];
// for (let i = 0; i < totalPath.length; i++) {
//     let q = totalPath[i];
//     ur5e.q = q;
//     await delay();
//     console.log(checkCol(true))
// }

// window.ondblclick = async () => {
//     for (let i = 0; i < totalPath.length; i++) {
//         let q = totalPath[i];
//         ur5e.q = q;
//         await delay(100);
//         console.log(checkCol(true))
//     }
// }
// let T = ur5e.lookAt([60.0, 0, 20.0], 15.0, Math.PI , Math.PI/4);
// let qs = ur5e.ik(T);
// console.log(ur5e.DH);
// console.log(ur5e.ik_giorgio);
// let q = [-28.07, -80.58, -118.42, -32.49, 86.16, 22.31].map(a => a * Math.PI / 180);
let q = [-33.55, -125.12, -65.97, -101.27, 86.21, 22.30].map(a => a * Math.PI / 180);
ur5e.q = q;
console.log(ur5e);

let tcpT = ur5e.current_T[5];
let tx = tcpT.elements[12];
let ty = tcpT.elements[13];
let tz = tcpT.elements[14];
let pos = [tx, ty, tz].map(a => (a*10).toFixed(2)).join(", ");
// let recorded = [322.1, -302.89, 375.08];
let recorded = [507.46, -475.99, 248.95];
let delta = [tx*10 - recorded[0], ty*10 - recorded[1], tz*10 - recorded[2]];
console.log("Position (mm): ", pos);
console.log("Delta (mm): ", delta.map(a => (a).toFixed(2)).join(", "));
console.log("Total Error (mm): ", Math.sqrt(delta.map(a => a**2).reduce((a,b) => a+b, 0)).toFixed(2));



keyControls();