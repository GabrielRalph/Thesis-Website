import { JSTLGroup } from "../Resources/JSTL/jstl.js";
import { M2str, URx } from "../Resources/JSTL/urx-jstl.js";
import {} from "../Resources/Three/basic-scene.js";
import {Matrix3, Vector3, SphereGeometry, AxesHelper, MeshBasicMaterial, MeshStandardMaterial, Matrix4, Group, Mesh, DoubleSide} from "https://cdn.jsdelivr.net/npm/three@0.174.0/+esm";
const { cos, sin, sqrt, atan2, acos, PI } = Math;
let ur5e = await URx.load("./Data/UR5e.jstl", 1000);
let test = await JSTLGroup.load("./Data/TestScene.jstl")

async function delay(ms) {
    if (ms == null) {
        return await new Promise(requestAnimationFrame);
    } else {
        return await new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
}

ur5e.q = [0, 0, 0, 0, 0, 0];

let threeScene = document.querySelector("three-scene");
threeScene.add(ur5e);
threeScene.add(test);


let lastCol = [];
function checkCol(render = true) {   
    let isColision = false;
    let t = performance.now();
    let col = ur5e.checkSelfCollision();
    if (col[0]) {
        isColision = true;
    } else {
        col = ur5e.checkCollision(test);
        isColision = col[0];
    }
    if (render) {
        lastCol.forEach((co) => { co.highlight = false; });
        if (isColision) {
            let [_, ca, cb] = col;
            ca.highlight = true;
            cb.highlight = true;
            lastCol = [ca, cb];
        }
    }

    let t1 = performance.now() - t;
    if (render) console.log(`Collision Check: ${t1}ms`);
    return isColision;
}



function keyControls(q = [0, 0, 0, 0, 0, 0]){
    let joint = null;
    window.addEventListener("keydown", (e) => { 
        let num = parseInt(e.key);
        if (num >= 1 && num <= 6) {
           joint = num-1;
        } else if (joint != null) {
            if (e.key === "ArrowUp") {
                q[joint] += 0.025;
            }
            if (e.key === "ArrowDown") {
                q[joint] -= 0.025;
            }
            ur5e.q = q;
            console.log(q);
            checkCol();
        }
    });
    window.addEventListener("keyup", (e) => {
        let num = parseInt(e.key);
        if (num >= 1 && num <= 6) {
           joint = null;
        }
    });
}

checkCol();

export {ur5e, threeScene, checkCol, delay, keyControls};




