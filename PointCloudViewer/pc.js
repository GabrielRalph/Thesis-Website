// import * as THREE from 'three';
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.174.0/+esm";

async function loadShader(url) {
    let shader = null;
    let res = await fetch(url);
    if (res.ok) {
        let text = await res.text();
        let values = text.split(/\/\/\s*~~(\w+)~~/g);
        
        shader = {};
        for (let i = 1; i < values.length; i+=2) {
            shader[values[i]] = values[i + 1].trim();
        }
    }
    return shader;
}

const shaders = await loadShader('PointCloudShader.frag');

function parseVectors(points) {
    if (!(points instanceof Float32Array)) {
        if (Array.isArray(points)) {
            if (Array.isArray(points[0])) {
                points = new Float32Array(points.flat());
            } else if (typeof points[0] === 'number') {
                points = new Float32Array(points);
            } else {
                throw new Error('Invalid points array format.');
            }
        } else {
            throw new Error('Points must be a Float32Array or an array.');
        }
    }

    if (points.length % 3 !== 0) {
        throw new Error('Points array length must be a multiple of 3.');
    }

    return points;
}

class PointCloudGeometry extends THREE.InstancedBufferGeometry {
    constructor(points, normals, colors, sphereGeometry) {
        super();
        this.copy(sphereGeometry); 
        this.instanceCount = points.length / 3;
        if (!(points instanceof THREE.InstancedBufferAttribute)) {
            points = new THREE.InstancedBufferAttribute(points, 3);
        }
        if (!(normals instanceof THREE.InstancedBufferAttribute)) {
            normals = new THREE.InstancedBufferAttribute(normals, 3);
        }
        if (!(colors instanceof THREE.InstancedBufferAttribute)) {
            colors = new THREE.InstancedBufferAttribute(colors, 3);
        }
        this.setAttribute('iPosition', points);
        this.setAttribute('iNormal', normals);
        this.setAttribute('iColor', colors);
    }
}

export class PointCloud extends THREE.Mesh {
    constructor(points, options, size = 0.1) {
        if (!options) options = {};
        points = parseVectors(points);
        let n = points.length / 3;
        
        let mode = 0;
        let colors = null;
        try { 
            colors = parseVectors(options.colors || []);
            if (colors.length !== n * 3) throw new Error('Colors array length must match number of points.');
            mode |= 2; // Use per-point colors
        } catch (e) {
            colors = new Float32Array(n * 3);
        }

        let normals = null;
        try {
            normals = parseVectors(options.normals || []);
            if (normals.length !== n * 3) throw new Error('Normals array length must match number of points.');
            mode |= 1; // Use provided normals
        } catch (e) {
            normals = new Float32Array(n * 3);
        }

        console.log(mode);
        

        const material = new THREE.ShaderMaterial({
            uniforms: {
                mode: { value: mode },
                uColor: { value: new THREE.Color(typeof options.color === "number" ? options.color : 0xff0000) },
                ambient: { value: 0.25 },
                lightIntensity: { value: 0.8 },
                modelMatrixInverse: { value: new THREE.Matrix4() },
                uLightDir: { value: new THREE.Vector3(1, 1, 1).normalize() },
            },
            ...shaders,
            transparent: true,
            depthWrite: true,
        });

        const sphereGeometry = new THREE.SphereGeometry(size, 16, 16);

        const geoRepeat = new PointCloudGeometry(points, normals, colors, sphereGeometry);
      
        super(geoRepeat, material);
        this._size = size;
        this._sphereGeometry = sphereGeometry;
        this.frustumCulled = false; // Prevent disappearing when zoomed out
    }

    /**
     * Set the size of the point cloud spheres.
     * @param {number} size - The new size for the spheres.
     */
    set size(size) {
        // Create new sphere geometry with the updated size
        this._sphereGeometry = new THREE.SphereGeometry(size, 16, 16);
        
        // Dispose old geometry
        this.geometry.dispose();

        // Recreate instanced geometry with the same attributes
        this.geometry = new PointCloudGeometry(
            this.geometry.attributes.iPosition,
            this.geometry.attributes.iNormal,
            this.geometry.attributes.iColor,
            this._sphereGeometry
        );
    }

    set points(points) {
        points = parseVectors(points);
        this.geometry.dispose();
        this.geometry = new PointCloudGeometry(
            points,
            new Float32Array(points.length), 
            new Float32Array(points.length), 
            this._sphereGeometry
        );
        this.material.uniforms.mode.value = 0; // Reset mode since colors and normals are now gone
    }

    /**
     * Set the color of the point cloud.
     * @param {THREE.Color|Array} color - The new color for the point cloud.
     */
    set color(color) {
        if (!(color instanceof THREE.Color)) {
            color = new THREE.Color(...color);
        }
        this.material.uniforms.uColor.value.copy(color);
    }

    set colors(colors) {
        colors = parseVectors(colors);
        if (colors.length !== this.geometry.attributes.iColor.count * 3) {
            throw new Error('Colors array length must match number of points.');
        }
        this.geometry.setAttribute('iColor', new THREE.InstancedBufferAttribute(colors, 3));
        this.material.uniforms.mode.value |= 1; // Enable per-point colors
    }

    set normals(normals) {
        normals = parseVectors(normals);
        if (normals.length !== this.geometry.attributes.iNormal.count * 3) {
            throw new Error('Normals array length must match number of points.');
        }
        this.geometry.setAttribute('iNormal', new THREE.InstancedBufferAttribute(normals, 3));
        this.material.uniforms.mode.value |= 2; // Enable provided normals
    }

    /**
     * Set the light direction for the point cloud.
     * @param {THREE.Vector3|Array} dir - The new light direction.
     */
    set lightDirection(dir) {
        if (!(dir instanceof THREE.Vector3)) {
            dir = new THREE.Vector3(...dir);
        }
        this.material.uniforms.uLightDir.value.copy(dir).normalize();
    }

    update() {
        this.material.uniforms.modelMatrixInverse.value.copy(this.matrixWorld).invert();
    }
}
