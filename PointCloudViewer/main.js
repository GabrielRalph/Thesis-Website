import { PointCloud } from "./pc.js";

import {} from "./Three/basic-scene.js";

async function loadPointcloud(url) {
    let res = await fetch(url);
    let vertices = new Float32Array(0)
    if (res.ok) {
        let data = res.arrayBuffer();
        let view = new DataView(await data);
        let count = view.getUint32(0, true);

        vertices = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            let offset = 4 + 6 * 4 * 2 + i * 3 * 4; // 4 bytes for count, 24 bytes per point (3 floats for position + 3 floats for normal)
            vertices.set([
                view.getFloat32(offset, true),
                view.getFloat32(offset + 4, true),
                view.getFloat32(offset + 8, true)
            ], i * 3);
        }
    }

    console.log(vertices);
    

    return vertices
}

let threeScene = document.querySelector("three-scene");
const pc = new PointCloud([0,0,0], { colors: null, normals: null }, 0.001);
threeScene.add(pc);

function decodeBase64(str) {
    const utf8 = atob(str);
    const bytes = new Uint8Array(utf8.length);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = utf8.charCodeAt(i);
    }
    return bytes
}

function decodeColors(str) {
    const uint8s = decodeBase64(str);
    const colors = new Float32Array(uint8s.length);
    for (let i = 0; i < uint8s.length; i++) {
        colors[i] = uint8s[i] / 255.0;
    }
    return colors
}

async function getDataFromPython() {
    if (window.pywebview) {
        threeScene.clear();

        let response = await pywebview.api.receive("Data from JS");
        console.log(response);
        
        if (!Array.isArray(response)) {
            response = [response];
        }

        for (const r of response) {
            const size = r.size || 0.01;
            const floatArray = new Float32Array(decodeBase64(r.points).buffer);
            const options = r.options || {};
            if (options.colors) {
                options.colors = decodeColors(options.colors);
            }
            console.log("options", options);
            let pc1 = new PointCloud(floatArray, options, size);
            threeScene.add(pc1)
        }
    }
}
getDataFromPython();

let fileList = []
let fileIndex = 0;
async function showFile() {
    if (fileList instanceof FileList && fileList.length > 0) {
        fileIndex = fileIndex % fileList.length;
        let file = fileList[fileIndex];
        let url = URL.createObjectURL(file);
        let points = await loadPointcloud(url);
        // console.log(points);
        
        pc.points = points;
        URL.revokeObjectURL(url);
        fileIndex++;
    }
}

window.clear = () => {
    threeScene.clear();
}
window.getDataFromPython = getDataFromPython;
window.setPoints = (points) => {
    console.log(points);
    pc.points = points;
    
}
window.onkeydown = (e) => {
    if (e.key === "ArrowRight") {
        showFile();
    }
}

window.ondblclick = async () => {
    let input = document.createElement("input");
    input.type = "file";
    input.multiple = true
    input.accept = ".pcd,.bin";
    input.onchange = async (e) => {
        fileList = e.target.files;
        if (fileList && fileList.length > 0) {
            showFile();
        }
    };
    input.click();
};