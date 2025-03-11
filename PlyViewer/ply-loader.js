
const BASE_TYPE_SIZES = {
    "uchar": [1, 'getUint8'],
    "char": [1, 'getInt8'],
    "short": [2, 'getInt16'],
    "ushort": [2, 'getUint16'],
    "int": [4, 'getInt32'],
    "uint": [4, 'getUint32'],
    "float": [4, 'getFloat32'],
    "double": [8, 'getFloat64'],
    "int8": [1, 'getInt8'],
    "uint8": [1, 'getUint8'],
    "int16": [2, 'getInt16'],
    "uint16": [2, 'getUint16'],
    "int32": [4, 'getInt32'],
    "uint32": [4, 'getUint32'],
    "float32": [4, 'getFloat32'],
    "float64": [8, 'getFloat64'],
}
/**
 * @typedef {("uchar"|"char"|"short"|"ushort"|"int"|"uint"|"float"|"double"|"int8"|"uint8"|"int16"|"uint16"|"int32"|"uint32"|"float32"|"float64")} BASE_TYPE
 */

/**
 * @typedef {Object} ElementProperty
 * @property {(BASE_TYPE|"list")} type
 * @property {string} name
 * @property {string} [itemType]
 * @property {string} [lengthType]
 * @property {ElementProperty[]} properties
 */

/**
 * @typedef {Object} Element
 * @property {string} name
 * @property {number} count
 * @property {ElementProperty[]} properties
 */

/**
 * @typedef {Object} Header
 * @property {Element[]} elements
 * @property {string} format
 */



class BufferReader extends DataView {
    constructor(buffer, mode = true, i_0 = 0) {
        super(buffer);
        this.i = i_0;
        this.mode = mode;     
    }

    read(type) {
        let val = this[BASE_TYPE_SIZES[type][1]](this.i, this.mode);
        this.i += BASE_TYPE_SIZES[type][0]
        return val
    }
}

/**
 * @param {Uint8Array} buffer
 * @return {string}
 */
function getHeaderSize(buffer) {
    const stopString = [..."end_header\n"].map(c => c.charCodeAt(0));
    let count = 0;
    for (let i = 0; i < buffer.length; i++) {
        count = buffer[i] == stopString[count] ? count + 1 : 0;
        if (count == stopString.length) {
            return i;
        }
    }
    return null;
}

/**
 * @param {string} header 
 * @return {Header}
 */
function parseHeader(header) {
    header = header.replace("end_header\n", "");
    header = header.replace(/comment.*\n/g, "");

    let elementStrings = [...header.matchAll(/element\s+(\w+)\s+(\d+)/g)];
    let descriptors = header.split(/element\s+\w+\s+\d+\n/g);

    let format = descriptors.shift();

    if (elementStrings.length != descriptors.length) throw "invalid elements to descriptors";
    
    let elements = elementStrings.map(([_, name, count], i) => {
        let props = descriptors[i].trim().replace(/property\s+/g, "").split("\n").map(e => {
            let vals = e.split(/\s+/);
            let type = vals[0];
            if (type == "list") {
                return {type, lengthType: vals[1], itemType: vals[2], name: vals[3]}
            } else {
                return {type, name: vals[1]}
            }
        })

        let element = {
            name: name,
            count: parseFloat(count),
            properties: props,
        }

        return element;
    });

    return {elements, format}
}

export class PlyElement extends Array {
    /** @param {Element} element */
    constructor(element) {
        let n = element.count
        let np = element.properties.length;
        super(n * np);

        this.element = element;
        this.np = np;
        this.n = n;
        this.poffset = {};
        let i = 0;
        for (let prop of element.properties) {
            this.poffset[prop.name] = i;
            i++;
        }
    }

    getAll(key) {
        let res = null;
        let {poffset, np, n} = this;
        if (typeof key === "string") {
            if (key in poffset){
                let offset = this.poffset[key];
                res = new Array(n);
                for (let i = 0; i < n; i++) {
                    res[i] = this[i*np + offset];
                }
            } else {
                throw `The key "${key}" is not in this element.`
            }
        } else if (Array.isArray(key)) {
            for (let k of key) {
                if (!(k in poffset)) throw `The key "${k}" is not in this element.`
            }
            let nk = key.length;
            res = new Array(n * nk);
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < key.length; j++) {
                    res[i*nk + j] = this[i*np + poffset[key[j]]]
                }
            }
        }
        return res;
    }

    get colors(){
        let colors = this.getAll(["red", "green", "blue"]);
        for (let i = 0; i < colors.length; i++) {
            colors[i] /= 255;
        }
        return colors;
    }

    get centeredVertices() {
        let {n} = this;
        let vertices = this.getAll(["x", "y", "z"]);
        
        let avg = [0, 0, 0]

        for (let i = 0; i < n; i++) {
            avg[0] += vertices[i*3]
            avg[1] += vertices[i*3+1]
            avg[2] += vertices[i*3+2]
        }

        avg[0] /= n
        avg[1] /= n
        avg[2] /= n

        for (let i = 0; i < n; i++) {
            vertices[i*3] -= avg[0];
            vertices[i*3+1] -= avg[1];
            vertices[i*3+2] -= avg[2];
        }


        return vertices;
    }
}

/**
 * @param {BufferReader} buffer
 * @param {Header} header
 */
async function extractData(buffer, header) {
    const data = {};
    for (let element of header.elements) {
        let np = element.properties.length;
        const elementList = new PlyElement(element);
        for (let i = 0; i < element.count; i++ ) {
            element.properties.forEach((property, j) => {
                 if (property.type == "list") {
                    let length = buffer.read(property.lengthType);
                    elementList[np*i+j] = new Array(length);
                    for (let k = 0; k < length; k++) elementList[np*i+j][k] = buffer.read(property.itemType);
                } else {
                    elementList[np*i+j] = buffer.read(property.type);
                }
            } );
        }
        data[element.name] = elementList;
    }
    return data;
}


function getBBox(verts){
    return [..."xyz"].map(comp => {
       let comps = verts.map(v => v[comp]);
       let r = comps.map((a, i)=>[a,i]).filter(a => Number.isNaN(a[0]));
       
       return {
            max: Math.max(...comps),
            min: Math.min(...comps),
       }
    })
}

function logBin(arr) {
    let bin = arr.map(byte => {
        let str = "";
        for (let i = 0; i < 8; i++) {
            str += ((byte >> i) & 1) + "";
        }
        return str;
    })
    console.log(bin.join(" "));
    
}

function round(a, b = 0) {
    let p = 10 ** b
    return Math.round(a * p) / p
}



export async function loadPLY(filename, onprogress){
    let t0 = performance.now();

    let res = await fetch(filename);
    let size = parseInt(res.headers.get("Content-Length"));

    let tprep= round((performance.now() - t0)/1000, 2);
    console.log(`loading ${filename}  ${round(size/1024)} kB ${tprep}s`);

    if (onprogress instanceof Function) onprogress({bytes: 0, total: size})

    t0 = performance.now();
    let reader = res.body.getReader();
    const fullBuffer = new ArrayBuffer(size);
    const int8View = new Int8Array(fullBuffer);
    let index = 0;
    let header = null;
    let headerEnd = null;
    while (true) {
        let {done,value} = await reader.read(1024);
        
        if (done) {
            break;
        } else {
            for (let i = 0; i < value.length; i++) {
                int8View[index+i] = value[i];
            }
            index += value.length;
            
            if (onprogress instanceof Function) onprogress({bytes: index, total: size})
            
            if (headerEnd === null) {
                headerEnd = getHeaderSize(int8View);
                if (headerEnd !== null) {
                    let headerString = "";
                    for (let i = 0; i < headerEnd-11; i++) {
                        headerString += String.fromCharCode(int8View[i]);
                    }
                    header = parseHeader(headerString);
                }
            }
        }
    }   
    let tload = round((performance.now() - t0)/1000, 2);
    
    
    t0 = performance.now();
    const buffer = new BufferReader(fullBuffer, true, headerEnd+1);
    

    // let vecs = 
    
    // let nvecs = header.elements[0].count
    // let vecs = new Float32Array(nvecs * 3);
    // let cols = new Float32Array(nvecs * 3);
    
    // for (let i = 0; i < nvecs; i++) {
    //     vecs[i*3] = buffer.getFloat32(headerEnd+1 + i * (4 * 6 + 3), true)
    //     vecs[i*3+1] = buffer.getFloat32(headerEnd+1+ i * (4 * 6 + 3) + 4, true)
    //     vecs[i*3+2] = buffer.getFloat32(headerEnd+1+ i * (4 * 6 + 3) + 8, true)
    //     cols[i*3] = buffer.getUint8(headerEnd+1 + i * (4 * 6 + 3) + 4 * 6, true) / 255
    //     cols[i*3+1] = buffer.getUint8(headerEnd+1+ i * (4 * 6 + 3) + 4 * 6 + 1, true) / 255
    //     cols[i*3+2] = buffer.getUint8(headerEnd+1+ i * (4 * 6 + 3) + 4 * 6 + 2, true) / 255
    // }
    let data = await extractData(buffer, header);
    // // console.log(header);
    // console.log(data);
    
    // console.log(vecs, cols);
    
    let tdatams = performance.now() - t0
    let tdata = round(tdatams/1000, 2);
    console.log(`${filename}\n\tload: [${tload+tprep}s]\n\textract data: [${tdata}s]\n\textract/size time: [${tdatams/size}]`);
    
    return data;
}

/**
 * @param {string} fileURL
 * @returns {ArrayBuffer} 
 */
async function loadFile(fileURL) {
    console.log("loading ", fileURL);
    
    const xhr = new XMLHttpRequest();
    xhr.responseType = "arraybuffer"
    const success = await new Promise((resolve) => {
      xhr.upload.addEventListener("progress", (event) => {
        console.log("HERE");
        
        if (event.lengthComputable) {
            console.log(event.loaded / event.total);
        }
      });
      xhr.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          console.log(event.loaded / event.total);
        }
      });
      xhr.addEventListener("loadend", () => {
        resolve(xhr.readyState === 4 && xhr.status === 200);
      });
      xhr.open("GET",fileURL, true);
      xhr.send(null);
      console.log("XHR started");
      
    });

    return xhr.response;
  }
