import {
    Group
} from "https://cdn.jsdelivr.net/npm/three@0.174.0/+esm";
import { CollisionObject } from "../Three/GJK/collisionObject.js";
import { loadJFS, parseJFS } from "./jfs.js";
import { parseSTL } from "../Three/Loaders/STLLoader.js";
import { DHTransform } from "./dh-movement.js";


export class JSTLGroup extends Group {
    constructor() {
        super();
        this.collisionHulls = [];
        this.visualBodys = [];
        this.childrenByName = {};
    }

    async checkForKinematicCollisions() {

    }

    async LoadSTLGroup(fs) {
        for (let key of fs.properties) {
            this[key] = fs[key];
        }
        await Promise.all([
            ...fs.collisionHulls.map(f => this.addConvexHullFile(f)),
            ...fs.visualBodys.map(f => this.addVisualFile(f)),
            ...Object.keys(fs.children).map((k) => this.addChildGroup(k, fs.children[k]))
        ])

        if (this.dh_parameters) {
            this.kinematics = new DHTransform(this);
        } else {
            this.kinematics = null;
        }
    }

    async addChildGroup(name, fs) {
        let group = new JSTLGroup();
        group.name = name;
        await group.LoadSTLGroup(fs);
        this.childrenByName[name] = group;
        this.add(group);
    }

    async addConvexHullFile(file) {
        let data = await file.getUint8Array();
        let mesh = parseSTL(data.buffer);
        mesh.material.transparent = true;
        mesh.material.opacity = 0;
        this.collisionHulls.push(new CollisionObject(mesh));
        mesh.name = file.name;
        this.add(mesh);
    }

    async addVisualFile(file) {
        let data = await file.getUint8Array();
        let mesh = parseSTL(data.buffer);
        mesh.name = file.name;
        this.visualBodys.push(mesh);
        this.add(mesh);
    }

    /** @param {number} value */
    set opacity(value) {
        if (this.isRoot) {
            this.visualBodys.forEach(c => {
                c.material.opacity = value;
                c.material.transparent = true;
            });
        } else {
            for (let key in this.sub) {
                let subGroup = this.sub[key];
                subGroup.opacity = value;
            }
        }
    }

    get collisionObjects() {
        let colisionObjects = [...this.collisionHulls];
        for (let key in this.childrenByName) {
            let subGroup = this.childrenByName[key];
            colisionObjects.push(subGroup.collisionObjects);
        }
        return colisionObjects.flat();
    }

    /** @param {JSTLGroup} other */
    checkCollision(other) {
        let colObjects = this.collisionObjects;
        let otherColObjects = other.collisionObjects;
        
        for (let i = 0; i < colObjects.length; i++) {
            for (let j = 0; j < otherColObjects.length; j++) {
                if (colObjects[i].checkCollision(otherColObjects[j])) {
                    return [true, colObjects[i], otherColObjects[j]];
                }
            }
        }
        return [false, null, null];
    }

    /** 
     * @param {string} url 
     * @returns {Promise<JSTLGroup>} 
     * */
    static async load(url) {
        let fs = await loadJFS(url);
        let group = new this();
        await group.LoadSTLGroup(fs);
        return group;
    }

    static async fromBuffer(data) {
        let fs = await parseJFS(data);
        let group = new this();
        await group.LoadSTLGroup(fs)
        return group;
    }
}