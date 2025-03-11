
import { loadPLY, PlyElement } from './ply-loader.js';
import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.174.0/examples/jsm/controls/OrbitControls.js';

// function centerPoints(points) {
//     const axis = [..."xyz"]
//     let avg = axis.map(c => {
//         let vals = points.map(v => v[c]);
//         let sum = vals.reduce((a,b)=>a+b);
//         return sum / vals.length;
//     });

//     points.forEach(v => {
//         axis.forEach((c,i) => v[c] -= avg[i])
//     })
// }

// function centerPoints_(points) {
//     const avg = [0,0,0]
//     points.forEach(p => {
//         avg[0] += p[0]
//         avg[1] += p[1]
//         avg[2] += p[2]
//     })
//     avg[0] /= points.length
//     avg[1] /= points.length
//     avg[2] /= points.length

//     points.forEach(v => {
//        v[0] -= avg[0]
//        v[1] -= avg[1]
//        v[2] -= avg[2]
//     })
// }




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


        // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    }

    onResize(){
        if (this.renderer) {
            console.log("resize");
            
            let {clientWidth, clientHeight, viewScale} = this;
            this.renderer.setSize(clientWidth * viewScale, clientHeight * viewScale);
            this.camera = new THREE.PerspectiveCamera(75, clientWidth / clientHeight, 0.1, 1000);
            this.camera.position.z = 10;
            // this.camera.apsect = clientWidth / clientHeight;
            // this.camera.updateProjectionMatrix();
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
        let space = false;
        let ddx = 0;
        let ddy = 0;
        let dx = 0;
        let dy = 0;
        let dw = 0;
        let set = false;
        window.addEventListener("keydown", (e) => {
            if (e.key === " ") {
                e.preventDefault();
                space = true;
            }
        });
        window.addEventListener("keyup", (e) => {
            if (e.key === " ") {
                e.preventDefault();
                space = false;
            }
        })
        this.addEventListener("mousemove", (e) => {
           if (e.buttons) {
                dx = e.movementX/100;
                dy = e.movementY/100;
                ddx = e.movementX/25;
                ddy = e.movementY/25;
                e.preventDefault();
           }
        });
        this.addEventListener("wheel", (e) => {
            dw = e.deltaY / 100;
            e.preventDefault();
        });
        this.addEventListener("dblclick", () => {set = true});


        while (true) {
            await new Promise((r) => requestAnimationFrame(r));

            let m;
            if (space) {
                m = new THREE.Matrix4(); 
                m.set(
                    1, 0, 0, ddx, 
                    0, 1, 0, -ddy, 
                    0, 0, 1, 0, 
                    0, 0, 0, 1, 
                )
            } else {
                let rot_v = new THREE.Vector4(dy, dx, 0, 0);
                m = new THREE.Matrix4(); 
                m.identity();
                m = m.multiply((new THREE.Matrix4().makeRotationX(rot_v.x)))
                m = m.multiply((new THREE.Matrix4().makeRotationY(rot_v.y)))
                m = m.multiply((new THREE.Matrix4().makeRotationZ(rot_v.z)))
                m = m.multiplyScalar(1 + dw);
            }
          
            this.pointsMesh.applyMatrix4(m);
            this.renderer.render(this.scene, this.camera);

            if (set) {
                let e = this.pointsMesh.matrix.elements.map(e=>e.toPrecision(3))
                let str = [0,4,8,12].map(i => [0,1,2,3].map(j => e[i+j]).join(",")).join(",\n")
                console.log(str);
            }
            
            set = false
            dx *= 0.5;
            dy *= 0.5;
            ddx *= 0.5;
            ddy *= 0.5;
            dw *= 0.5;
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
            this._dispProg(0.7 * ss.bytes / ss.total, ss.total);
        });
        this._dispProg(0.9, size);
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

