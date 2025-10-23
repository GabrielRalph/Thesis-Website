
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.174.0/+esm";
import { ObjectControls } from './Controls/control.js';
import { RGBELoader } from './Loaders/RGBELoader.js'
export function relURL(url, meta) {
    let root = meta.url;
    url = url.replace(/^\.\//, "/");
    if (url[0] != "/") url = "/" + url;
    return root.split("/").slice(0, -1).join("/") + url;
  }
class ThreeScene extends HTMLElement {
    _viewScale = 3;
    sizeObserver = null;

    constructor() {
        super();
        const scene = new THREE.Scene();

        // ✅ Load an HDRI environment for reflections
        const hdrLoader = new RGBELoader();
        hdrLoader.load(relURL("../Assets/enviro.hdr", import.meta), function (texture) {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = texture;
            scene.background = new THREE.Color(0x000000);
        })

        const camera = new THREE.PerspectiveCamera(75, this.innerWidth / this.innerHeight, 0.1, 1000);
        camera.position.set(0, 50, 100);

        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(this.innerWidth * 3, this.innerHeight * 3);
        renderer.toneMapping = THREE.ACESFilmicToneMapping; // Better dynamic range
        renderer.toneMappingExposure = 1.2;
        renderer.outputEncoding = THREE.sRGBEncoding; // Ensure proper color display

        const controls = new ObjectControls(renderer.domElement);

        const light = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(light);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 10);
        scene.add(directionalLight);

        const root = new THREE.Group();
        scene.add(root);

        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.root = root;
        this.controls = controls;
    }

    /** @param {number} scale */
    set viewScale(scale) {
        this.style.setProperty("--view-scale", scale);
        this._viewScale = scale;
    }

    /** @return {number} */
    get viewScale() { return this._viewScale }


    addSphere(radius = 1, pos, color = 0x00ff00) {
        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const material = new THREE.MeshStandardMaterial({ color: color });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(...pos);
        this.root.add(sphere);
        return sphere;
    }

    resize() {
        if (this.renderer) {
            let { clientWidth, clientHeight, viewScale } = this;
            this.renderer.setSize(clientWidth * viewScale, clientHeight * viewScale);
            this.camera = new THREE.PerspectiveCamera(75, clientWidth / clientHeight, 0.1, 1000);
            this.camera.position.z = 10;
            // this.camera.position.x = 50;
            // this.camera.position.y = 50;
        }
    }

    connectedCallback() {
        this.appendChild(this.renderer.domElement);
        if (!this.sizeObserver) {
            this.sizeObserver = new ResizeObserver(this.resize.bind(this))
            this.viewScale = 3;
        }
        this.sizeObserver.observe(this);
        this.start();
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
        addPointCloud(vertices, colors) {
            const geometry = new THREE.BufferGeometry();
    
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            if (Array.isArray(colors)) {
                geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            }
    
            this.pointsMesh = new THREE.Points(geometry, this.pointMaterial);
            this.root.add(this.pointsMesh);
        }
    

    disconnectedCallback() {
        this.stop();
        this.sizeObserver.disconnect();
    }


    async start() {
        let stop = false;
        this.stop = () => {
            stop = true;
        }
        while (!stop) {
            await new Promise(requestAnimationFrame)
            if (this.root) this.controls.update(this.root);

            this.renderer.render(this.scene, this.camera);
        }
    }

    stop() { }

    add(object) {
        this.root.add(object);
    }

    clear() {
        this.root.clear();
    }
}

customElements.define('three-scene', ThreeScene);