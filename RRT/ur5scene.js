import { JSTLGroup } from "../Resources/JSTL/jstl.js";
import { URx } from "../Resources/JSTL/urx-jstl.js";

let ur5e = await URx.load("../WebSim/Data/UR5e.jstl", 1000);
let test = await JSTLGroup.load("../WebSim/Data/TestScene.jstl")

export function isFree(q3d) {   
    let q = [...q3d, 0, 0, 0];
    ur5e.q = q;
    let isColision = false;
    let col = ur5e.checkSelfCollision();
    if (col[0]) {
        isColision = true;
    } else {
        col = ur5e.checkCollision(test);
        isColision = col[0];
    }
    return !isColision;
}

export const start = [2.2269792347424304, -0.9923311052470395, 2.6275000189312414]
export const goal = [3.2769792347424267, -0.442331105247039, 0.9775000189312472]