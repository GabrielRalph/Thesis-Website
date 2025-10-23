import { PointCloud } from "../Resources/pc.js";
import { ThreeScene } from "../Resources/Three/basic-scene.js";

class PCBasic extends ThreeScene {
    constructor() {
        super();
        this.classList.add("tscene");

        this.loadPC()
        
    }

    async loadPC() {
        let url = this.getAttribute("src");
        let isColored = this.hasAttribute("colored");
        let size = parseFloat(this.getAttribute("point-size")) || 0.001;
        let response = await fetch(url);
        let arrayBuffer = await response.arrayBuffer();
        let pc;

        
        if (isColored) {
            let o = arrayBuffer.byteLength / 2;
            let n = o / 4

            let points = new Float32Array(arrayBuffer, 0, n)
            let colors = new Float32Array(arrayBuffer, o, n)
            pc = new PointCloud(points, {colors: colors}, size);
        } else {
            let floatArray = new Float32Array(arrayBuffer);
            pc = new PointCloud(floatArray, {}, size);
        }
        this.pc = pc;
        this.add(pc);
    }


    beforeRender() {
        if (this.pc)
            this.pc.rotation.z += 0.003
    }
}

customElements.define('pc-basic', PCBasic)