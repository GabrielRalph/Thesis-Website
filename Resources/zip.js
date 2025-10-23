import * as zip from "./JSTL/zip/index.js";


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

    async getText() {
        return await this.entry.getData(new zip.TextWriter()) 
    }   

    async getJSON() {
        const text = await this.getText();
        return JSON.parse(text);
    }
}

class FSObject {
    async set(parts, value) {
        if (parts.length === 0) {
            return
        } else if (parts.length === 1) {
            let key = parts[0];
            this[key] = new FileObject(key, value);
        } else {
            let key = parts[0];
            if (!(key in this)) {
                this[key] = new FSObject();
            } 
            await this[key].set(parts.slice(1), value);
        }
    }
}

export async function loadZipFS(url) {
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
    
    return fs
}
