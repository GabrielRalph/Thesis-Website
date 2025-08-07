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
    entries.forEach((entry) => {
        entriesByName[entry.filename] = entry;
    });

    let jfs = null;
    if ("config.json" in entriesByName) {
        const configText = await entriesByName["config.json"].getData(new zip.TextWriter());
        const config = JSON.parse(configText);

        let recurse = (obj, path) => {
            for (let key in obj) {
                let fullPath = path ? path + "/" + key : key;

                if (typeof obj[key] === "string" || Array.isArray(obj[key])) {
                    let fileNames = typeof obj[key] === "string" ? [obj[key]] : obj[key];
                    
                    obj[key] = fileNames.map(name => {
                        let fileObject = null;
                        let fullName = fullPath + "/" + name;
                        if (!(fullName in entriesByName)) {
                            console.warn(`File not found: ${fullName}`);
                        } else {
                            fileObject = new FileObject(name, entriesByName[fullName]);
                        }
                        return fileObject;
                    });
                } else if (typeof obj[key] === "object") {
                    recurse(obj[key], fullPath);
                }
            }
        }

        recurse(config.files, "") 

        jfs = config
    }
    
    return jfs
}
