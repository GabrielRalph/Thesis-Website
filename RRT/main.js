import {} from "../Resources/Three/basic-scene.js";
import {BufferGeometry, Line, CylinderGeometry, Matrix3, Vector3, SphereGeometry, AxesHelper, MeshBasicMaterial, LineBasicMaterial, MeshStandardMaterial, Matrix4, Group, Mesh, DoubleSide} from "https://cdn.jsdelivr.net/npm/three@0.174.0/+esm";
import { loadSTL } from "../Resources/Three/Loaders/STLLoader.js";
import { isPixelBlack } from "./maze.js";
import { RRT_basic, RRT_bi, RRT_connect, RRT_star, RRT_star_bi, RRTBase, RRTBase3D, RRTThree, RRTThreeLine } from "./rrt.js";
import * as UR5 from "./ur5scene.js";
async function delay(ms) {
    if (ms == null) {
        return await new Promise(requestAnimationFrame);
    } else {
        return await new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
}

const info = document.createElement("div");
info.setAttribute("style", "position: absolute; top: 0; left: 0; z-index: 1000; color: white; font-size: 20px;");
document.body.appendChild(info);

function updateInfo(i, iinc, t1, t2) {
    info.innerHTML = `
        <div>Iteration: ${i * iinc}</div>
        <div>t1: ${t1.nodes.length} nodes</div>
        <div>t2: ${t2?.nodes?.length} nodes</div>
    `;
}

function getPathToRoot(leaf) {
    let path = [[...leaf]];
    while (leaf.parent) {
        leaf = leaf.parent;
        path.push([...leaf]);
    }
    return path
}

function addPath(t, path) {
    for (let i = 1; i < path.length; i++) {
        t.addNode(path[i]);
        t.addEdge([path[i-1], path[i]]);
    }
}

const threeScene = document.querySelector("three-scene");
function holeInWall([x, y, z]) {
    // Check if the node is in a hole
    // This is a placeholder function. You should implement your own hole detection logic.
    return y>= 0 && y<=100 && z>= 0 && z<=100 && 
            ((x >= 0 && x < 45)
            || (x > 55 && x <= 100)
            || ((((y-50)**2 + (z-50)**2)**0.5 < 9) && (x >= 45 && x <= 55)));
}

async function exampleMaze() {
    const start = [10, 90, 0];
    const goal = [10, 25, 0];
    const dt = 2;
    const iinc = 50;
    const maxIter = 1000;

    let mesh = await loadSTL("./maze.stl");
    mesh.material.opacity = 0.2;
    mesh.material.transparent = true;
    threeScene.add(mesh);

    const t1 = new RRTThree(0x0000ff, dt/5, dt, 3, 0x000099);
    const t2 = new RRTThree(0xff0000, dt/5, dt, 3, 0x990000);
    const t1_b = new RRTThreeLine(0x00ff00, dt/5, dt, 3, 0x00ff00);
    const t2_b = new RRTThreeLine(0x00ff00, dt/5, dt, 3, 0x00ff00);

    threeScene.add(t1.root);
    threeScene.add(t2.root);
    threeScene.add(t1_b.root);
    threeScene.add(t2_b.root);

    t1.isFree = ([x, y]) => !isPixelBlack(x, 100-y);
    t2.isFree = ([x, y]) => !isPixelBlack(x, 100-y);
    t1_b.isFree = ([x, y]) => !isPixelBlack(x, 100-y);
    t2_b.isFree = ([x, y]) => !isPixelBlack(x, 100-y);

    const sampler = () => [Math.random() * 100,  Math.random() * 100, 0.5];
    let next = RRT_connect(t1, t2, start, goal);
    let next_b = RRT_star_bi(t1_b, t2_b, [...start], [...goal]);

    let complete = false;
    let complete_b = false;
    let i =0, j=0;
    for (i = 0; i < maxIter; i++) {
        for (j = 0; j < iinc; j++) {
            let sample = sampler();
            if (!complete) complete = next(sample);
            if (!complete_b) complete_b = next_b(sample);
            
            if (complete && complete_b) {
                console.log("Found a paths");
                break;
            }
        }
        updateInfo(i, iinc, t1, t2);
        if (complete && complete_b) break;
        await new Promise((resolve) => setTimeout(resolve, iinc));
    }


    let best1 = t1.nodes[t1.nodes.length - 1];
    let best2 = t2.nodes[t2.nodes.length - 1];
    let path1 = getPathToRoot(best1);
    let path2 = getPathToRoot(best2);
    console.log(path1);

    let cost2 = t1_b.nodes[t1_b.nodes.length - 1].cost + t2_b.nodes[t2_b.nodes.length - 1].cost

    
    let path3 = [...path1.reverse(), ...path2];
    let t3 = new RRTThree(0xff00c8, dt/5, dt, 3, 0xff00c8);
    threeScene.add(t3.root);
    t3.addNode(path3[0]);
    addPath(t3, path3);
    info.innerHTML = `
        <div>Iteration: ${i * iinc + j}</div>
        <div>t1: ${t1.nodes.length} nodes</div>
        <div>t2: ${t2.nodes.length} nodes</div>
        <div>t3: ${t3.nodes.length} nodes</div>
        <div>cost connect: ${path3[path3.length - 1].cost}</div>
        <div>cost star: ${cost2}</div>
        `
}

async function exampleHoleInWall() {
    const start = [0, 0, 0];
    const goal = [100, 0, 0];
    const dt = 4;
    const iinc = 10;
    const maxIter = 1000;

    let mesh = await loadSTL("./hole-in-wall.stl");
    mesh.material.opacity = 0.2;
    mesh.material.transparent = true;
    threeScene.add(mesh);

    const t1 = new RRTThree(0x0000ff, dt/5, dt, 3, 0x000099);
    const t2 = new RRTThree(0xff0000, dt/5, dt, 3, 0x990000);

    threeScene.add(t1.root);
    threeScene.add(t2.root);

    t1.isFree = holeInWall;
    t2.isFree = holeInWall;

    const sampler = () => [Math.random() * 100, Math.random() * 100, Math.random() * 100];
    let next = RRT_bi(t1, t2, start, goal, sampler);

    let complete = false;
    for (let i = 0; i < maxIter; i++) {
        for (let j = 0; j < iinc; j++) {
            complete = next();
            if (complete) {
                console.log("Found a path!");
                break;
            }
        }
        updateInfo(i, iinc, t1, t2);
        if (complete) break;
        await new Promise((resolve) => setTimeout(resolve, iinc));
    }
}

async function exampleBasicHoleInWall() {
    const start = [0, 0, 0];
    const goal = [90, 10, 10];
    const dt = 3;
    const iinc = 100;
    const maxIter = 80;

    let mesh = await loadSTL("./hole-in-wall.stl");
    mesh.material.opacity = 0.2;
    mesh.material.transparent = true;
    threeScene.add(mesh);

    const t1 = new RRTThreeLine(0x0000ff, dt/20, dt, 3, 0x000099);
    const t2 = new RRTThreeLine(0xff0000, dt/19, dt, 3, 0x990000);
    const t3 = new RRTBase(dt);


    threeScene.add(t1.root);
    threeScene.add(t2.root);

    t2.addNode(goal);

    t1.isFree = holeInWall;
    t3.isFree = holeInWall;

    const sampler = () => [Math.random() * 100, Math.random() * 100, Math.random() * 100];
    let nextstar = RRT_star(t1, start, goal);
    let nextbasic = RRT_basic(t3, start, goal);

    let complete = false;
    for (let i = 0; i < maxIter; i++) {
        for (let j = 0; j < iinc; j++) {
            let sample = sampler();
            nextbasic(sample);
            nextstar(sample);
        }
        updateInfo(i, iinc, t1);
        if (complete) break;
        await new Promise((resolve) => setTimeout(resolve, iinc/5));
    }

    let best = t1.nearest(goal)
    let path = [goal, [...best]];
    let costa = best.cost + t1.lineCost(best, goal);
    let best2 = t3.nearest(goal);
    let costb = best2.cost + t3.lineCost(best2, goal);
    while (best.parent) {
        best = best.parent;
        path.push([...best]);
    }


    for (let i = 1; i < path.length; i++) {
        t2.addNode(path[i]);
        t2.addEdge([path[i], path[i-1]]);
    }

    info.innerHTML = `
        <div>Iteration: ${maxIter * iinc}</div>
        <div>cost: ${costb}</div>
        <div>cost*: ${costa} nodes</div>
    `;

}

function getPath(t, goal) {
    let best = t.nearest(goal)
    let path = [goal, [...best]];
    let costa = best.cost + t.lineCost(best, goal);
    while (best.parent) {
        best = best.parent;
        path.push([...best]);
    }
    return [path, costa];
}


async function exampleBasicMaze() {
    const start = [10, 90, 1];
    const goal2 = [10, 25, 1];
    const goal1 = [10, 25, 1];
    const dt = 2;
    const iinc = 10;
    const maxIter = 1000;

    let mesh = await loadSTL("./maze.stl");
    mesh.material.opacity = 0.2;
    mesh.material.transparent = true;
    threeScene.add(mesh);

    const t1 = new RRTThreeLine(0x00ff00, dt/20, dt, 3, 0x00ff00);
    const t2 = new RRTThreeLine(0xff0000, dt/9, dt, 3, 0x990000);
    const t3 = new RRTBase3D(dt);
    const t4 = new RRTThreeLine(0x0000ff, dt/9, dt, 3, 0x0000ff);

    threeScene.add(t1.root);
    threeScene.add(t2.root);
    threeScene.add(t4.root);

    t2.addNode(goal1);
    t4.addNode(goal2);

    t1.isFree = ([x, y]) => !isPixelBlack(x, 100-y);
    t3.isFree = ([x, y]) => !isPixelBlack(x, 100-y);

    const sampler = () => [Math.random() * 100, Math.random() * 100, 1];
    let nextstar = RRT_star(t1, [...start], goal1);
    let nextbasic = RRT_basic(t3, [...start], goal2);

    let complete = false;
    for (let i = 0; i < maxIter; i++) {
        for (let j = 0; j < iinc; j++) {
            let sample = sampler();
            nextbasic(sample);
            nextstar(sample);
        }
        updateInfo(i, iinc, t1);
        if (complete) break;
        await new Promise((resolve) => setTimeout(resolve, 5));
    }

    let [path1, costa] = getPath(t1, goal1);
    let [path2, costb] = getPath(t3, goal2);

    addPath(t2, path1);
    addPath(t4, path2);


    info.innerHTML = `
        <div>Iteration: ${maxIter * iinc}</div>
        <div>cost: ${costb}</div>
        <div>cost*: ${costa} nodes</div>
    `;

}

async function exampleBasic() {
    const start = [50, 50, 1];
    const goal2 = [0, 0, 1];
    const goal1 = [0, 0, 1];
    const dt = 2;
    const iinc = 100;
    const maxIter = 200;

    const t1 = new RRTThreeLine(0x00ff00, dt/100, dt, 3, 0x00ff00);
    const t2 = new RRTThreeLine(0xff0000, dt/9, dt, 3, 0x990000);
    const t3 = new RRTBase3D(dt);
    const t4 = new RRTThreeLine(0x0000ff, dt/9, dt, 3, 0x0000ff);

    threeScene.add(t1.root);
    threeScene.add(t2.root);
    threeScene.add(t4.root);

    t2.addNode(goal1);
    t4.addNode(goal2);

    t1.isFree = ([x, y]) => x >= 0 && x <= 100 && y >= 0 && y <= 100;
    t3.isFree = ([x, y]) => x >= 0 && x <= 100 && y >= 0 && y <= 100;

    const sampler = () => [Math.random() * 100, Math.random() * 100, 1];
    let nextstar = RRT_star(t1, [...start], goal1);
    let nextbasic = RRT_basic(t3, [...start], goal2);

    let complete = false;
    for (let i = 0; i < maxIter; i++) {
        for (let j = 0; j < iinc; j++) {
            let sample = sampler();
            nextbasic(sample);
            nextstar(sample);
        }
        updateInfo(i, iinc, t1);
        if (complete) break;
        await new Promise((resolve) => setTimeout(resolve, 5));
    }

    let [path1, costa] = getPath(t1, goal1);
    let [path2, costb] = getPath(t3, goal2);

    addPath(t2, path1);
    addPath(t4, path2);


    info.innerHTML = `
        <div>Iteration: ${maxIter * iinc}</div>
        <div>cost: ${costb}</div>
        <div>cost*: ${costa} nodes</div>
    `;

}

async function exampleBasicUR5() {
    const start = [...UR5.start];
    const goal = [...UR5.goal];
    const dt = 0.05;
    const iinc = 20;
    const maxIter = 200;

    const t1 = new RRTThreeLine(0x005500, dt, dt, 3, 0x00ff00);
    const t3 = new RRTThreeLine(0xff0000, dt/2, dt, 3, 0x990000);
    const t2 = new RRTThreeLine(0x0000ff, dt/9, dt, 3, 0x0000ff);

    const pi = Math.PI;
    const {min, max} = Math;

    let xrange = [min(start[0], goal[0]) - 5 * dt, max(start[0], goal[0]) + 5 * dt];
    let yrange = [min(start[1], goal[1]) - 5 * dt, max(start[1], goal[1]) + 5 * dt];
    let zrange = [min(start[2], goal[2]) - 5 * dt, max(start[2], goal[2]) + 5 * dt];
    

    const g0 = new Group();
    let g1 = new Group();
    g0.add(new AxesHelper(6));
    g1.add(g0)
    // g1.position.copy(new Vector3(...start));
    let g2 = new Group();
    g2.add(g1)
    g2.scale.copy(new Vector3(100, 100, 100));
    g0.add(t1.root);
    g0.add(t2.root);
    g0.add(t3.root);
    threeScene.add(g2);
    t1.isFree = UR5.isFree
    t2.isFree = UR5.isFree


    t3.addNode(start);
    t3.addNode(goal);

    for (let y = yrange[0]; y < yrange[1]; y += dt) {
        for (let x = xrange[0]; x < xrange[1]; x += dt) {
            for (let z = zrange[0]; z < zrange[1]; z += dt) {
                if (!t1.isFree([x, y, z])) {
                    t1.addNode([x, y, z]);
                    console.log("i");
                    
                }
            }
        }
        await delay(100)
    }

    // t2.addNode(goal);

    // const sampler = () => new Array(3).fill(0).map(() => (Math.random() * 2 - 1) * Math.PI * 2);
    // let nextstar = RRT_star(t1, [...start], goal);

    // let complete = false;
    // for (let i = 0; i < maxIter; i++) {
    //     for (let j = 0; j < iinc; j++) {
    //         let sample = sampler();
    //         nextstar(sample);
    //     }
    //     updateInfo(i, iinc, t1);
    //     if (complete) break;
    //     await new Promise((resolve) => setTimeout(resolve, 5));
    // }

    // let [path1, costa] = getPath(t1, goal);

    // addPath(t2, path1);
    // info.innerHTML = `
    //     <div>Iteration: ${maxIter * iinc}</div>
    //     <div>cost*: ${costa} nodes</div>
    // `;
}


// exampleMaze()
exampleBasicUR5()
// exampleHoleInWall()
// exampleBasicHoleInWall()