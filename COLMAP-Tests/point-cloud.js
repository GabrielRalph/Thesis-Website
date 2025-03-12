
import { loadPLY, PlyElement } from './ply-loader.js';
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.174.0/+esm";

let SPACE_PRESSED = false;
window.addEventListener("keydown", (e) => {
    if (e.key === " ") {
        e.preventDefault();
        SPACE_PRESSED = true;
    }
});
window.addEventListener("keyup", (e) => {
    if (e.key === " ") {
        e.preventDefault();
        SPACE_PRESSED = false;
    }
})

class ObjectControls {
    /** @type {TouchList} */
    lastTouches = [];

    positionDelta = [0, 0];
    angleDelta = [0, 0];
    zoomDelta = 0;
    rotationFactor = 100;
    movementFactor = 40;
    showMat = false;
    moveFlag = 0;
    

    constructor(clickBoxElement) {
        clickBoxElement.addEventListener("touchmove", (e) => {
            this.touchmove(e);
        })
        clickBoxElement.addEventListener("touchend", (e) => {
            this.lastTouches = e.touches;
            if (e.touches.length == 0) this.moveFlag = 0;
        })
        clickBoxElement.addEventListener("mousemove", (e) => {
            let {movementFactor, rotationFactor} = this;
           if (e.buttons) {
                this.angleDelta = [e.movementX/rotationFactor, e.movementY/rotationFactor];
                this.positionDelta = [e.movementX/movementFactor, e.movementY/movementFactor]
                e.preventDefault();
           }
        });
        clickBoxElement.addEventListener("wheel", (e) => {
            this.zoomDelta = e.deltaY / 100;
            e.preventDefault();
        });
        clickBoxElement.addEventListener("dblclick", () => {this.showMat = true});
    }

    /** @param {TouchList} touches */
    touchesToPoints(touches) {
        return [...touches].map(t => [t.clientX, t.clientY])
    }

    /** @param {TouchEvent} e */
    touchmove(e) {
        let {touches} = e;
        let {lastTouches, rotationFactor, movementFactor} = this;

        if (touches.length == 1 && lastTouches.length == 1) {
            let lp = this.touchesToPoints(lastTouches)[0];
            let p = this.touchesToPoints(touches)[0];
            this.angleDelta = p.map((c,i)=>(c - lp[i])/rotationFactor);
            this.positionDelta = this.angleDelta.map(c => 2*rotationFactor*c/movementFactor);
            if (this.moveFlag == 1) this.moveFlag = 2;
        } else if (touches.length == 2 && lastTouches.length == 2) {

            let [p1, p2] = this.touchesToPoints(touches);
            let [lp1, lp2] = this.touchesToPoints(lastTouches);

            let cp = p1.map((c,i)=>(c + p2[i])/2);
            let lcp = lp1.map((c,i)=>(c + lp2[i])/2);
            
            this.positionDelta = cp.map((c,i)=>(c - lcp[i])/(movementFactor/2));

            let lent = p1.map((c,i)=>(c - p2[i])**2).reduce((a,b)=>a+b);
            let lenl = lp1.map((c,i)=>(c - lp2[i])**2).reduce((a,b)=>a+b);
            this.zoomDelta = lent/lenl - 1;
            this.moveFlag = 1;
        }

        this.lastTouches = touches;
        e.preventDefault();
    }
    update(threeObject){
        let m;
        let {angleDelta, positionDelta} = this;
        if (this.moveFlag > 0 || SPACE_PRESSED) {
            let [ddx, ddy] = positionDelta;
            m = new THREE.Matrix4(); 
            m.set(
                1, 0, 0, ddx, 
                0, 1, 0, -ddy, 
                0, 0, 1, 0, 
                0, 0, 0, 1, 
            )
            threeObject.applyMatrix4(m);
        } 
        if (!SPACE_PRESSED && this.moveFlag < 2) {
            let [dx, dy] = angleDelta;
            let rot_v = new THREE.Vector4(dy, dx, 0, 0);
            m = new THREE.Matrix4(); 
            m.identity();
            m = m.multiply((new THREE.Matrix4().makeRotationX(rot_v.x)))
            m = m.multiply((new THREE.Matrix4().makeRotationY(rot_v.y)))
            m = m.multiply((new THREE.Matrix4().makeRotationZ(rot_v.z)))
            m = m.multiplyScalar(1 + this.zoomDelta);
            threeObject.applyMatrix4(m);
        }


        if (this.showMat) {
            let e = threeObject.matrix.elements.map(e=>e.toPrecision(3))
            let str = [0,4,8,12].map(i => [0,1,2,3].map(j => e[i+j]).join(",")).join(",\n");
            console.log(str);
        }

        
        this.showMat = false
        this.angleDelta = angleDelta.map(c => c*0.5)
        this.positionDelta = positionDelta.map(c => c*0.5)
        this.zoomDelta *= 0.5;
    }
}

// Create a class for the element
class PlyViewer extends HTMLElement {

    static observedAttributes = ["color", "size"];
  
    constructor() {
      super();
      this.viewScale = 3;
    }

    /** @param {number} scale */
    set viewScale(scale){
      this.style.setProperty("--view-scale", scale);
      this._viewScale = scale;
    }

    /** @return {number} */
    get viewScale(){ return this._viewScale}

    async initScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.clientWidth / this.clientHeight, 0.1, 1000);
        this.camera.position.z = 10;

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.clientWidth * this.viewScale, this.clientHeight * this.viewScale);
        this.appendChild(this.renderer.domElement);


        // 4️⃣ Add Light
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(1, 1, 1);
        this.scene.add(light);


        this.controls = new ObjectControls(this);
    }

    onResize(){
        if (this.renderer) {
            console.log("resize");
            
            let {clientWidth, clientHeight, viewScale} = this;
            this.renderer.setSize(clientWidth * viewScale, clientHeight * viewScale);
            this.camera = new THREE.PerspectiveCamera(75, clientWidth / clientHeight, 0.1, 1000);
            this.camera.position.z = 10;
        }
    }


    get pointMaterial(){
        return new THREE.ShaderMaterial({
            transparent: true,
            uniforms: {
                size: {value: 10},
                scale: {value: 1},
                // color: {value: new THREE.Color('maroon')}
            },
            vertexShader: `
                    uniform float size;
                    attribute vec3 color;
                    varying vec3 vColor;
                    void main() {
                        vColor = color;
                        gl_PointSize = size * 1.0;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
            fragmentShader: `
            varying vec3 vColor;
            void main() {
                vec2 xy = gl_PointCoord.xy - vec2(0.5);
                float dist = length(xy);
                float alpha = smoothstep(0.5, 0.4, dist); // Anti-aliased edge
                if (dist > 0.5) discard; // Remove black box
                gl_FragColor = vec4(vColor, 1.0 -dist);
            }
            `
        });
    }

    /** @param {PlyElement} vertices */
    addPointCloudPly(vertices) {
        const geometry = new THREE.BufferGeometry();

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.centeredVertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertices.colors, 3));

        this.pointsMesh = new THREE.Points(geometry, this.pointMaterial);
        this.scene.add(this.pointsMesh);
    }

    /** 
     * @param {PlyElement} vertices 
     * @param {PlyElement} faces 
     * */
    addMeshPly(vertices, faces) {
        const geometry = new THREE.BufferGeometry();

        // Convert face indices into a flat array
        const indices = faces.getAll("vertex_index").flatMap(a => a);
        
        // Set attributes
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.centeredVertices, 3));
        geometry.setIndex(indices);
        
        // Compute vertex normals for shading
        geometry.computeVertexNormals();
    
        // Create a material
        const material = new THREE.MeshStandardMaterial({ color: 0xffffff, wireframe: false });
        
        // Create and return the mesh
        this.pointsMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.pointsMesh)

    }

 
    setPointSize(size) {
        this.pointSize = size;
        this.material.size = size;
    }

    async animate() {
        while (true) {
            await new Promise((r) => requestAnimationFrame(r));
            this.controls.update(this.pointsMesh);
            this.renderer.render(this.scene, this.camera);
        }
    }

    _dispProg(p, total) {
        const event = new Event("progress", {bubbles: true});
        event.progress = p;
        event.total = total;
        this.dispatchEvent(event);
    }

    async loadPly(filename){
        let size = 1;
        let data = await loadPLY(filename, (ss) => {
            size = ss.total;
            this._dispProg(0.9 * ss.bytes / ss.total, ss.total);
        });
        this._dispProg(0.95, size);
        return data;
    }

    
    async connectedCallback() {
        if (!this.sizeObserver) {
            this.sizeObserver = new ResizeObserver(this.onResize.bind(this))
        }
        this.sizeObserver.observe(this);


        let mat = this.getAttribute("mat");
        let filename = this.getAttribute("src");
        /** @type {Object<string, PlyElement>} */
        let data = await this.loadPly(filename);

        
        
        this.initScene();
        let {vertex, face} = data;
        if (face) {
            this.addMeshPly(vertex, face)
        } else {
            this.addPointCloudPly(vertex);
        }

        if (mat !== null) {
            mat = mat.split(",").map(e => parseFloat(e));
            let m = new THREE.Matrix4();
            m.set(...mat)
            m.invert()
            this.pointsMesh.applyMatrix4(m)
        }
        this.animate();
        this.dispatchEvent(new Event("load", {bubbles: true}))
    }
  
    disconnectedCallback() {
      this.sizeObserver.disconnect();
    }
  
    adoptedCallback() {
      console.log("Custom element moved to new page.");
    }
  
    attributeChangedCallback(name, oldValue, newValue) {
      console.log(`Attribute ${name} has changed.`);
    }
  }
  
customElements.define("ply-viewer", PlyViewer);

