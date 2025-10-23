import {
    Matrix4,
} from "https://cdn.jsdelivr.net/npm/three@0.174.0/+esm";

const {cos, sin} = Math;
 
 function round(num, dp  = 3) {  
     let factor = 10 ** dp;
     return Math.round(num * factor) / factor;
 }
 
 export function M2str(m) {
     let str = "";
     m = m.toArray().map(e => round(e, 3)+"");
     let maxlen = Math.max(...m.map(e => e.length));
     for (let j = 0; j < 4; j++) {
         str += "";
         for (let i = 0; i < 4; i++) {
             str += m[i*4+j].padStart(maxlen)+ ", ";
         }
         str += "\n";
     }
     return str
 }

export class DHTransform {
    constructor(jstl) {

        let dh_m_scale = 1;
        // console.log("DH scale:", jstl.dh_scale);
        
        let links = [];
        let base = null;

        this.DH = jstl.dh_parameters.map(dhp => {
            let dhn = {...dhp};
            dhn.a = dhp.a * dh_m_scale;
            dhn.d = dhp.d * dh_m_scale;
            if (dhp.to in jstl.childrenByName) {
                links.push(jstl.childrenByName[dhp.to])
            }
            return dhn
        });

        base = this.DH[0].from in jstl.childrenByName ? jstl.childrenByName[this.DH[0].from] : null;

        this.links = links;
        this.base = base;
    }

    getLink(i) {
        return this.links[i];
    }

    setLinkTransform(i, T) {
        let link = this.getLink(i);
        link.matrix.copy(T);
        link.collisionObjects.forEach(co => {
            co.transform = T;
        })
        link.matrixAutoUpdate = false;
    }

    checkSelfCollision() {
        let n = this.DH.length;
        let isCollision = [false, null, null]
        let links = new Array(n).fill(0).map((_, i) => this.getLink(i));
        links.unshift(this.base);
        n = n+1;
        for (let i = 0; i < n - 2; i++) {
            for (let j = i + 2; j < n; j++) {
                let linka = links[i]
                let linkb = links[j]
                
                let isCol = linka.checkCollision(linkb);
                
                if (isCol[0]) {
                    isCollision = isCol
                    break;
                }
            }
            if (isCollision[0]) break;
        }
        return isCollision
    }

    checkCollision(other) {
        let col = null;
        for (let i = 0; i < this.DH.length; i++) {
            col = other.checkCollision(this.getLink(i));
            if (col[0]) {
                break;
            }
        }
        return col;
    }

     /** 
         * Sets the joint angles of the robot
         * @param {Number[]} q */
    set q(q){
        
        if (q.some(e => Number.isNaN(e))) {
            throw new Error("Joint angles must be numbers");
        }

        if (q.length < this.DH.length) {
            q = [...q, ...this.DH.slice(q.length).map(e => e.theta)];
        }

        let T = null;
        let current_T = [];
        this.current_q = [...q];
        for (let i = 0; i < this.DH.length; i++) {
            let T_next = this.TLink(i,q[i]);
            if (T == null) {
                T = T_next
            } else {
                T.multiply(T_next)
            }
            
            
            this.setLinkTransform(i, T);

            current_T.push(T.clone());
        }
        this.current_T = current_T;
    }
    
    /**
     * Get the current joint angles of the robot
     * @returns {number[]} The current joint angles
     */
    get q(){    
        return this.current_q;
    }
    
    /**
     * Get the current transformation matrices of the robot
     * @returns {Matrix4[]} The current transformation matrices
     */
    get currentTLinks(){
        return this.current_T;
    }
    
    /**
     * Get the dimensions of the links
     * @returns {number[]} The dimensions of the links
     */
    get linkDims(){
        let dh = this.DH
        return [dh[0].d, dh[1].a, dh[2].a, dh[3].d, dh[4].d, dh[5].d].map(Math.abs)
    }

    /**
     * Move the robot to the specified joint angles at the specified speed
     * @param {number[]} q - The joint angles to move to
     * @param {number} speed - The speed to move at (0-6) rad/s
     * @returns {Promise<void>} A promise that resolves when the movement is complete
     */
    async moveTo(q, speed = 1) {
        console.log("Moving to:", q, "at speed:", speed);
        q = q.length < this.DH.length ? [...q, ...this.DH.slice(q.length).map(e => e.theta)] : q;
        let q0 = [...this.q];
        let tnow = performance.now();
        let maxDiff = Math.max(...q.map((qi, i) => Math.abs(qi - q0[i])));
        if (speed > 6) speed = 6;
        let t = (maxDiff / speed) * 1000;

        while (performance.now() - tnow < t) {
            let dt = (performance.now() - tnow) / t;
            dt = (1 - Math.cos(dt * Math.PI)) / 2;
            
            
            let qi = q0.map((q0i, i) => q0i + (q[i] - q0i) * dt);

            
            this.q = qi;
            await new Promise(requestAnimationFrame);
        }
        this.q = q;
    }

    
    /**
     * Compute the transformation matrices for all links
     * @param {number[]} q - The joint angles
     * @returns {Matrix4[]} The transformation matrices for all links
     * */
    TLinks(q) {
         // Compute the transposes of the links in their current configurations
         let link_Ts = q.map((q,i) => this.TLink(i, q));
         for (let i = 1; i < link_Ts.length; i++) {
             link_Ts[i].premultiply(link_Ts[i-1]);
         }
         return link_Ts;
    }
    
    /**
     * Compute the transformation matrix from link i-1 to link i
     * @param {number} i - The index of the link
     * @param {number} ti - The joint angle for link i
     * 
     * @returns {Matrix4} The transformation matrix from link i-1 to link i
     */
    TLink(i, ti) {
        let alpha = this.DH[i].alpha;
        let a = this.DH[i].a;
        let d = this.DH[i].d;
    
        let t = [
            cos(ti), -sin(ti)*cos(alpha), sin(ti)*sin(alpha), a*cos(ti),
            sin(ti), cos(ti)*cos(alpha), -cos(ti)*sin(alpha), a*sin(ti),
            0,       sin(alpha),         cos(alpha),          d,
            0,       0,                  0,                   1
        ];
    
        let T = new Matrix4();
        T.set(...t);
        return T;
    }
 }