import { RRT_star, RRT_star_bi, RRTBase, RRTBase3D } from "../RRT/rrt.js";
import { ur5e, checkCol, keyControls, delay } from "./ur5e-scene.js";

function deg(deg) {
    return deg * Math.PI / 180;
}
function rad(rad) {
    return rad * 180 / Math.PI;
}

let POI = [35, -35, 20];
let Radius = 15;

// let ThetaStart = deg(10);
// let ThetaEnd = deg(80);

// let incs = 20;
// let minIncSize = 3; // cm

// let path = new Array(incs).fill(0).map((_, i) => {
//     let theta = ThetaStart + (ThetaEnd - ThetaStart) * i / (incs - 1);
//     let xyCirc= Math.sin(theta) * Radius * 2 * Math.PI;
//     let incs2 = Math.max(Math.round(xyCirc / minIncSize), 1);

//     return new Array(incs2).fill(0).map((_, j) => {
//         let phi = 2 * Math.PI * j / incs2;
//         return ur5e.ik(ur5e.lookAt(POI, Radius, phi, theta));
//     });
// }).flat();

function printT(T) {
    let e = T.elements
    let str = "";
    console.log(T);
    
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            str += e[i + j*4].toFixed(4).padStart(8) + (j < 3 ? ", " : "\n");
        }
    }
    console.log(str);
}

window.printT = printT;
const test = [ 2.25074, -1.431454, 1.600367, -1.572865, -1.77331, 2.268076];
ur5e.q = test;
console.log(ur5e)
printT(ur5e.current_T[5]);
// const T = ur5e.lookAt(POI, Radius, Math.PI/4, Math.PI/4);

// console.log(T);
// let q = ur5e.ik(T);
// q.forEach((qi, i) => {
//     console.log(qi.map(a => a.toFixed(2).padStart(5)).join(", "));
// })

// let i = 0;
// window.onkeydown = (e) => {
//     let num = parseInt(e.key);
//     if (num >= 1 && num <= 8) {
//        i = num - 1;
//        console.log(i);
       
//     }
// }

// let path6 = path.map(q => q[5]);
// let max = new Array(6).fill(0).map((_, i) => Math.max(...path6.map(p => p[i])));
// let min = new Array(6).fill(0).map((_, i) => Math.min(...path6.map(p => p[i])));
// for (let j = 0; j < 6; j++) {
//     if (min[j] > Math.PI) {
//         min[j] -= 2*Math.PI;
//         max[j] -= 2*Math.PI;
//         for (let k = 0; k < path6.length; k++) {
//             path6[k][j] -= 2*Math.PI;
//         }
//     } else if (max[j] < -Math.PI) {
//         min[j] += 2*Math.PI;
//         max[j] += 2*Math.PI;
//         for (let k = 0; k < path6.length; k++) {
//             path6[k][j] += 2*Math.PI;
//         }
//     }
        
//     console.log(`Joint ${j+1}: Min: ${rad(min[j]).toFixed(1)}, Max: ${rad(max[j]).toFixed(1)}`);
// }
// console.log(path6);

// ur5e.q = path6[0];
// while (true) {
//     for (let j = 1; j < path.length; j++) {
//         await ur5e.moveTo(path6[j], 3);
//         // let str = path6[j].map(a => rad(a).toFixed(0)).join(", ");
//         // console.log(str);
//         // await delay(500);
//     }
// }
