import {
    Group
} from "https://cdn.jsdelivr.net/npm/three@0.174.0/+esm";
import { CollisionObject } from "../Three/GJK/collisionObject.js";
import { FileObject, loadJFS } from "./jfs.js";
import { parseSTL, STLLoader } from "../Three/Loaders/STLLoader.js";

function isRootGroup(obj) {
    return "Visual" in obj && "ConvexHulls" in obj;
}

export class JSTLGroup extends Group {
    constructor() {
        super();
    }

    async LoadSTLGroup(files, root = "", path = []) {
        this.sub = {};
        this.collisionHulls = [];
        this.isRoot = false;
        this.name = root;
        this.path = path;


        if (isRootGroup(files)) {
            await this.loadRootSTLGroup(files);
        } else {
            await Promise.all(Object.keys(files).map(async key => {
                let subGroup = new JSTLGroup();
                await subGroup.LoadSTLGroup(files[key], key, [...path, key]); // Changed 'value' to 'files[key]'
                this.sub[key] = subGroup;
                this.add(subGroup);
            }))
        }
    }

    /** @param {Object<string, FileObject[]>} files */
    async loadRootSTLGroup(files) {
        let collisionHulls = [];
        let visualBodys = [];
        let {Visual, ConvexHulls} = files;
       
        await Promise.all([
            ...Visual.map(async file => {
                let data = await file.getUint8Array();
                let mesh = parseSTL(data.buffer);
                mesh.name = file.name;
                mesh.path = [...this.path, file.name];
                this.add(mesh);
                visualBodys.push(mesh);
            }),
        
            ...ConvexHulls.map(async file => {
                let data = await file.getUint8Array();
                let mesh = parseSTL(data.buffer);
                mesh.material.transparent = true;
                mesh.material.opacity = 0;
                collisionHulls.push(new CollisionObject(mesh));
                mesh.name = file.name;
                mesh.path = [...this.path, file.name];
                this.add(mesh);
            })
        ]);
        this.visualBodys = visualBodys;
        this.collisionHulls = collisionHulls;
        this.isRoot = true;
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
        if (this.isRoot) {
            return [...this.collisionHulls];
        } else {
            let collisionObjects = [];
            for (let key in this.sub) {
                let subGroup = this.sub[key];
                collisionObjects.push(...subGroup.collisionObjects);
            }
            return collisionObjects;
        }
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
        let config = await loadJFS(url);
        let files = config.files;
    
        
        let group = new this();
        await group.LoadSTLGroup(files);
        group.config = config;
        delete group.config.files;
        return group;
    }
}