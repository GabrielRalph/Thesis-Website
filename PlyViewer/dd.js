
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
    constructor(buffer) {
        super(buffer);
        this.i = 0;
        console.log(this);
        
    }

    read(type) {
        try {
            let val = this[BASE_TYPE_SIZES[type][1]](this.i);
            if (this.i < 10) {
                console.log(type, this.i, val, BASE_TYPE_SIZES[type][1]);
            }
            this.i += BASE_TYPE_SIZES[type][0]
            return val
        } catch (e) {
            console.log("ERROR", type, this.i, this.byteLength);
        }
    }
}

/**
 * @param {ArrayBuffer} buffer
 * @return {string}
 */
function extractHeaderString(buffer) {
    const stopString = "end_header\n";
    const chars = new Uint8Array(buffer);
    let count = 0;
    let header = "";
    let char;
    for (let i = 0; i < chars.length; i++) {
        char = String.fromCharCode(chars[i]);
        header += char;
        count = char == stopString[count] ? count + 1 : 0;
        if (count == stopString.length) {
            break;
        }
    }

    return header;
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

/**
 * @param {BufferReader} body
 * @param {ElementProperty} property
 * @param {number} index
 */
function extractProperty(body, property, index) {
    let value = null;
    if (property.type == "list") {
    } else {
        value = body.read(property.type);
    }
    return [value, index]
}

/**
 * @param {BufferReader} body
 * @param {Element} element 
 * @param {number} index
 */
function extractElement(body, element, index) {
    let obj = {};
    let value;
    for (let property of element.properties) {
        [value, index] = extractProperty(body, property, index);
        obj[property.name] = value;
    }
    return [obj, index];
}


/**
 * @param {BufferReader} buffer
 * @param {Header} header
 */
function extractData(buffer, header) {
    let index = 0;
    let obj = {};
    for (let element of header.elements) {
        let fullS = element.properties.map(p => BASE_TYPE_SIZES[p.type][0]).reduce((a,b) => a+b)*element.count;
        console.log("FULL", fullS);
        
        const elementList = new Array(element.count);
        let value;
        for (let i = 0; i < element.count; i++ ) {
            [value, index] = extractElement(buffer, element, index);
            elementList[i] = value;
        }
        obj[element.name] = elementList;
    }
    return obj;
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



export async function loadPLY(filename){
    let t0 = performance.now();
    let buffer = await loadFile(filename)
    // let res = await fetch(filename);
    // let buffer = await res.arrayBuffer();
    console.log(`loaded ${filename}  [${Math.round(performance.now() - t0 / 10) / 100}s]`);


    t0 = performance.now();
    let headerString = extractHeaderString(buffer);
    console.log(`extracted header ${filename} [${Math.round(performance.now() - t0 / 10) / 100}s]`);

    t0 = performance.now();
    let header = parseHeader(headerString);
    console.log(`parsed header ${filename} [${Math.round(performance.now() - t0 / 10) / 100}s]`);

    t0 = performance.now();
    let body = buffer.slice(headerString.length);
    let data = extractData(new BufferReader(body), header);
    console.log(`extracted data ${filename} [${Math.round(performance.now() - t0 / 10) / 100}s]`);

   
    console.log(data);
    
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
