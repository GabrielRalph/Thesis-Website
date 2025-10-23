
import * as THREE from "./three.js";

import { ObjectControls } from './Controls/control.js';
import { RGBELoader } from './Loaders/RGBELoader.js'
import { PointCloud } from "../pc.js";
export function relURL(url, meta) {
    let root = meta.url;
    url = url.replace(/^\.\//, "/");
    if (url[0] != "/") url = "/" + url;
    return root.split("/").slice(0, -1).join("/") + url;
  }
export class ThreeScene extends HTMLElement {
    constructor() {
        super();
        this._viewScale = 3;
        this.sizeObserver = null;
        const scene = new THREE.Scene();

        // ✅ Load an HDRI environment for reflections
        const hdrLoader = new RGBELoader();
        hdrLoader.load(relURL("../Assets/enviro.hdr", import.meta), function (texture) {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = texture;

            // Trasparent background
            scene.background = null;
            // scene.background = new THREE.Color(0x21252b);
        })

        const camera = new THREE.PerspectiveCamera(75, this.innerWidth / this.innerHeight, 0.1, 1000);
        camera.position.set(0, 50, 100);

    // preserveDrawingBuffer ensures toDataURL works reliably for screenshots
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setSize(this.innerWidth * 3, this.innerHeight * 3);
        renderer.toneMapping = THREE.ACESFilmicToneMapping; // Better dynamic range
        renderer.toneMappingExposure = 1.2;
        renderer.outputEncoding = THREE.sRGBEncoding; // Ensure proper color display

        
        const controls = new ObjectControls(renderer.domElement);
        let mat = this.getAttribute("mat");
        if (mat) {
            controls.isCached = false;
            let m = new THREE.Matrix4();
            m.fromArray(mat.split(",").map(e => parseFloat(e)));
            controls.matrix = m;
        }

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
        if (this.onconnected instanceof Function) {
            this.onconnected()
        }
    }


    disconnectedCallback() {
        this.stop();
        this.sizeObserver.disconnect();
        if (this.ondisconnected instanceof Function) {
            this.ondisconnected()
        }
    }


    async start() {
        let stop = false;
        this.stop = () => {
            stop = true;
        }
        while (!stop) {
            await new Promise(requestAnimationFrame)
            if (this.beforeRender instanceof Function) {
                this.beforeRender()
            }
            if (this.root) this.controls.update(this.root);
            if (this.pointclouds) {
                for (let pc of this.pointclouds) {
                    pc.update();
                }
            }

            this.renderer.render(this.scene, this.camera);

            if (this.afterRender instanceof Function) {
                this.afterRender()
            }
        }
    }

    stop() { }

    add(object) {

        if (object instanceof PointCloud) {
            if (!this.pointclouds) this.pointclouds = [];
            this.pointclouds.push(object);
        }
        this.root.add(object);
    }

    clear() {
        function disposeRecursive(obj) {
            for (const child of obj.children) disposeRecursive(child);
            if (obj.isMesh) {
                obj.geometry?.dispose();
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material?.dispose();
            }
        }
        while (this.root.children.length) {
            const child = this.root.children[0];
            disposeRecursive(child);
            this.root.remove(child);
        }
    }
}

customElements.define('three-scene', ThreeScene);