import * as zip from "./zip/index.js";

function toNum(str) {
    let res = new Function("pi", "return "+str)(Math.PI);
    return res
}

export class FileObject {
    constructor(name, entry) {
        this.entry = entry;
        this.name = name.split(".").slice(0, -1).join(".");
        this.size = entry.uncompressedSize;
        this.type = entry.filename.split('.').pop();
    }

    async getUint8Array() {
        return await this.entry.getData(new zip.Uint8ArrayWriter()) 
    }
}

class FSObject {
    constructor() {
        this.collisionHulls = [];
        this.visualBodys = [];
        this.children = {};
        this.properties = []
    }

    async set(parts, value) {
        let addNext = false;
        if (parts.length === 0) {
            return
        } else if (parts.length === 1) {
            let key = parts[0];
            if (key.endsWith(".json")) {
                const configText = await value.getData(new zip.TextWriter());
                try {
                    let config = JSON.parse(configText);
                    for (let k in config) {
                        this[k] = config[k];
                        this.properties.push(k);
                    }
                } catch (e) {
                    console.warn("Failed to parse JSON:", e);
                }
            } else {
                key = key.split(".").slice(0, -1).join(".");
                this[key] = value;
                this.properties.push(new FileObject(key, value));
            }
        } else if (parts.length === 2) {
            if (parts[0] === "ConvexHulls") {
                this.collisionHulls.push(new FileObject(parts[1], value));
            } else if (parts[0] === "Visual") {
                this.visualBodys.push(new FileObject(parts[1], value));
            } else {
                addNext = true;
            }
        } else {
            addNext = true;
        }  
        if (addNext) {
            let [category, ...rest] = parts;
            if (!(category in this.children)) {
                this.children[category] = new FSObject();
            }
            await this.children[category].set(rest, value);
        }
    }


    reduce() {
        let childKeys = Object.keys(this.children);
        if (childKeys.length === 1 && this.collisionHulls.length === 0 && this.visualBodys.length === 0) {
            return this.children[childKeys[0]].reduce();
        } else {
            for (let k in this.children) {
                this.children[k] = this.children[k].reduce();
            }
            return this;
        }
    }
}

export async function parseJFS(data) {
    const zipFileReader = new zip.Uint8ArrayReader(data);
    const zipReader = new zip.ZipReader(zipFileReader);
    const entries = await zipReader.getEntries();
    let entriesByName = {};
    let fs = new FSObject();

    await Promise.all(entries.map(async (entry) => {
        let name = entry.filename;
        let isHidden = name.match(/(^|\/)\.[^\/\.]/);
        if (!isHidden && !entry.directory) {
            let path = name.split("/");
            await fs.set(path, entry);
            entriesByName[entry.filename] = entry;
        }
    }));
    
    console.log(entriesByName);
    
    fs = fs.reduce();
    
    return fs
}
    
export async function loadJFS(url) {
    let blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.responseType = "blob";
        xhr.onload = function() {
            if (xhr.status === 200) {
                resolve(xhr.response);
            } else {
                reject(new Error(`Failed to load file: ${xhr.statusText}`));
            }
        };
        xhr.onerror = function() {
            reject(new Error("Network error"));
        };
        xhr.send();
    });


    const zipFileReader = new zip.BlobReader(blob);
    const zipReader = new zip.ZipReader(zipFileReader);
    const entries = await zipReader.getEntries();
    let entriesByName = {};
    let fs = new FSObject();

    await Promise.all(entries.map(async (entry) => {
        let name = entry.filename;
        let isHidden = name.match(/(^|\/)\.[^\/\.]/);
        if (!isHidden && !entry.directory) {
            let path = name.split("/");
            await fs.set(path, entry);
            entriesByName[entry.filename] = entry;
        }
    }));
    
    fs = fs.reduce();
    
    return fs
}
