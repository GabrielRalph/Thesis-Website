import { JSTLGroup } from "../Resources/JSTL/jstl.js";
import { ThreeScene } from "../Resources/Three/basic-scene.js";

export class UR5Scene extends ThreeScene {
    constructor() {
        super();
        this.loadingProm = this.load();
    }

    async load() {
        let ur5Url = this.getAttribute("src");
        let sceneUrl = this.getAttribute("scene-src");

        let [ur5, scene] = await Promise.all([
            JSTLGroup.load(ur5Url),
            JSTLGroup.load(sceneUrl)
        ])


        this.ur5 = ur5;
        this.sceneGroup = scene;
        
        this.q = [Math.PI/4, -Math.PI/2, 0, 0, 0, 0, 0];
        this.add(this.sceneGroup);
        this.add(this.ur5);

    }

    set q(q) {
        if (this.ur5) {
            this.ur5.kinematics.q = q
        }
    }

}

customElements.define("ur5-scene", UR5Scene);