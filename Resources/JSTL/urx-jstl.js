import { JSTLGroup } from "./jstl.js";
import {
    Matrix4,
    Vector3,
} from "https://cdn.jsdelivr.net/npm/three@0.174.0/+esm";
import { cross, norm } from "../Three/GJK/basic-vec3.js";

const {cos, sin, sqrt, atan2, acos, PI, asin} = Math;
function toNum(str) {
    let res = new Function("pi", "return "+str)(Math.PI);
    return res
}

function mul(a, b) {
    let a2 = a.clone();
    a2.multiply(b);
    return a2;
 }
 
 function isZero(i) {
     return Math.abs(i) < 1e-9
 }
 
 function round(num, dp  = 3) {  
     let factor = 10 ** dp;
     return Math.round(num * factor) / factor;
 }
 
 function M4(...values) {
     let m = new Matrix4();
     m.set(...values);
     return m;
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
 
 let N2 = (a, b) => (a**2 + b**2)
 let N23 = (a, b,c) => (a**2 + b**2 + c**2)
 let X_X = (T) => (T.elements[0])
 let X_Y = (T) => (T.elements[1])
 let X_Z = (T) => (T.elements[2])
 
 let Y_X = (T) => (T.elements[4])
 let Y_Y = (T) => (T.elements[5])
 let Y_Z = (T) => (T.elements[6])
 
 let Z_X = (T) => (T.elements[8])
 let Z_Y = (T) => (T.elements[9])
 let Z_Z = (T) => (T.elements[10])
 
 let P_X = (T) => (T.elements[12])
 let P_Y = (T) => (T.elements[13])
 let P_Z = (T) => (T.elements[14])
 
 
 
 
export class URx extends JSTLGroup {

    getLink(i) {
        let group = this.sub["Links"].sub["Link" + i];
        return group;
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
        links.unshift(this.sub["Links"].sub["Base"]);
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
     * Compute the inverse kinematics for the URx
     * @param {Matrix4} T0_6 - The transformation matrix from the base to the end effector
     * @returns {number[][]} The sets of joint angles that satisfy the inverse kinematics
     */
    ik(T0_6) {
        let T_i = this.TLink.bind(this);
        let i = 0;
        let d4 = this.DH[3].d
        let d6 = this.DH[5].d
        let a2 = this.DH[1].a
        let a3 = this.DH[2].a;

        let qSet = []
    
        let temp;
    
        // Compute Theta 1 
        let p0_5x = -d6 * Z_X(T0_6) + P_X(T0_6);
        let p0_5y = -d6 * Z_Y(T0_6) + P_Y(T0_6);
        let p0_5xy = sqrt(N2(p0_5x, p0_5y));

        
        // Check there is a solution for Theta 1.
        if (d4 <= p0_5xy) {
            let si = atan2(p0_5y, p0_5x);
            let phi = acos(d4 / p0_5xy);
    
            // If there is a solution then consider the two cases.
            for (let pm1 = -1; pm1 < 2; pm1+=2) {
                // Theta 1
                let t1 = si + pm1 * phi + PI/2;
    
                
    
                // Compute Theta 5.
                let t5a = acos( ((P_X(T0_6)*sin(t1) - P_Y(T0_6)*cos(t1)) - d4) / d6 );
    
    
                // Compute T6_1 based on Theta 1
                let T0_1 = T_i(0, t1);
                T0_1.invert();
                let T1_6 = mul(T0_1, T0_6);
                let T6_1 = T1_6.clone();
                T6_1.invert();
    
                // For the plus minus cases of Theta 5.
                for (let pm2 = -1; pm2 < 2; pm2+=2) {
                    let t5 = t5a * pm2;
    
                    // Compute Theta 6
                    let dnom = sin(t5);
                    let t6 = 3 * PI;
                    if ((!isZero(Z_X(T6_1)) || !isZero( Z_Y(T6_1))) && !isZero(dnom)) {
                        t6 = atan2(-Z_Y(T6_1)/dnom, Z_X(T6_1)/dnom);
                    }
    
                    // Compute Theta 3
                    let T4_5 = T_i(4, t5);    
                    let T5_6 = T_i(5, t6);    
                    temp = mul(T4_5, T5_6);
                    temp.invert();
                    let T1_4 = mul(T1_6, temp);
    
                    let p1_3x = -d4 * Y_X(T1_4) + P_X(T1_4);
                    let p1_3y = -d4 * Y_Y(T1_4) + P_Y(T1_4);
                    let p1_3z = -d4 * Y_Z(T1_4) + P_Z(T1_4);
    
                    let p1_3n2 = N23(p1_3x, p1_3y, p1_3z);
                    let p1_3 = sqrt(p1_3n2);
    
                    let ct3 = (p1_3n2 - N2(a2,a3)) / (2*a2*a3);
                    let gamma = atan2(p1_3y, -p1_3x);
    
                    if (ct3 >= -1 && ct3 <= 1) {
                        let t3a = acos(ct3);
    
                        // For the plus minus cases of Theta 3.
                        for (let pm3= -1; pm3 < 2; pm3+=2) {
                            
                            // Compute Theta 3.
                            let t3 = pm3 * t3a;
    
                            // Compute Theta 2.
                            let t2 = -gamma + asin(a3 * sin(t3) / p1_3);
    
                            let T1_2 = T_i(1,t2);
                            let T2_3 = T_i(2,t3);
                            temp = mul(T1_2, T2_3);
                            temp.invert();
                            let T3_4 = mul(temp, T1_4);
    
                            let t4 = atan2(X_Y(T3_4), X_X(T3_4));
                            qSet.push([t1, t2, t3, t4, t5, t6]);
                            i++;
                        }
                    }
                }
            } 
        } 
    
        return qSet;
    }

    ik_giorgio(T0_6) {
        const d1 = this.DH[0].d
        const d4 = this.DH[3].d
        const d5 = this.DH[4].d
        const d6 = this.DH[5].d
        const a2 = this.DH[1].a
        const a3 = this.DH[2].a;
        
        const [nx, ny, nz, _0, ox, oy, oz, _1, ax, ay, az, _2, px, py, pz] = T0_6.elements;

        const qs = [];

        /** Equation (9) Theta 1 */
        const q1 = ((ay * d6 - py) ** 2 + (px - ax * d6) ** 2 - d4**2) ** 0.5;
        const q2 = atan2(ay * d6 - py, px - ax * d6)
        const t1s = [
            atan2(d4,  q1) - q2,
            atan2(d4, -q1) - q2,
        ]
        // Iterate over the two possible solutions for theta 1
        for (const t1 of t1s) {
            const s1 = sin(t1);
            const c1 = cos(t1);

            /** Equation (10) Theta 5 */
            const osc1 = ox * s1 - oy * c1;
            const nsc1 = nx * s1 - ny * c1;
            const asc1 = ax * s1 - ay * c1;
            const onsc1 = (nsc1 ** 2 + osc1 ** 2) ** 0.5
            const t5s = [
                atan2(-onsc1, asc1),
                atan2( onsc1 , asc1),
            ]
            // Iterate over the two possible solutions for theta 5
            for (const t5 of t5s) {
                const s5 = sin(t5);

                /** Equation (11) Theta 6 */
                const t6 = atan2(-osc1/s5, nsc1/s5);

                /** Equation (12) Theta 234 */
                const t234 = atan2(-(az/s5), -((ax*c1 + ay*s1)/s5));
                
                const s234 = sin(t234);
                const c234 = cos(t234);

                /** Equation (15) A and B */
                const A = px*c1 + py*s1 - d5*s234 + d6*c234*s5;
                const B = pz - d1 + d5*c234 + d6*s234*s5;

                /** Equation (13)  Theta 2 */
                const w1 = (a3**2) - (a2**2) - (A**2) - (B**2);
                // ~~~~~~ NOTE: this is expression positive in the paper.
                const w2 = -2*a2*((A**2 + B**2)**0.5); 
                const w3 = w1/w2;
                const w4 = atan2(A, B);
                const w5 = (1 - (w3**2))**0.5;
                const t2s = [
                    atan2(w3,  w5) - w4,
                    atan2(w3, -w5) - w4,
                ];

                // Iterate over the two possible solutions for theta 2
                for (const t2 of t2s) {
                    const s2 = sin(t2);
                    const c2 = cos(t2);

                    /** Equation (14) Theta 23 */
                    // ~~~~~~ NOTE: both parameters of atan2 bellow are negated in the paper.
                    const t23 = atan2((B - a2*s2)/(a3), (A - a2*c2)/(a3)); 

                    /** Equation (16) Theta 3 */
                    const t3 = t23 - t2;

                    /** Equation (17) Theta 4 */
                    const t4 = t234 - t23;

                    // Add the solution to the list
                    qs.push([t1, t2, t3, t4, t5, t6]);
                }
            }
        }

        return qs;
    }
    
    /**
     * Compute the transformation matrix from a point of radius r and angles theta and phi
     * from the point of interest.
     * @param {number[]} poi - The point of interest
     * @param {number} r - The radius from the point of interest
     * @param {number} theta - The angle in the x-y plane
     * @param {number} phi - The angle from the z-axis
     * @returns {Matrix4} The transformation matrix
     */
    lookAt(poi, r, theta, phi) {
        let p21 = [-r * cos(theta) * sin(phi), -r * sin(theta) * sin(phi), -r * cos(phi)];
    
        let p2 = poi.map((e, i) => e - p21[i])
    
        let a_z = p21.map(e => e / norm(p21));
        let a_x = [a_z[1], -a_z[0], 0];
        a_x = a_x.map(e => e / norm(a_x));
    
        let temp1 = cross(a_x, a_z);
        let temp2 = cross(a_x, temp1);
        let a_y = a_z.map((e, i) => e - temp1[i] + temp2[i])
        
        let t = new Matrix4();
        t.set(
            a_x[0], a_y[0], a_z[0], p2[0],
            a_x[1], a_y[1], a_z[1], p2[1],
            a_x[2], a_y[2], a_z[2], p2[2],
            0,      0,      0,      1
        )
        // T = [a_x, a_y, a_z, p2; 0, 0, 0, 1];
        return t;
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


    /** 
     * @param {string} url
     * @param {number} dh_m_scale - The scale factor for the length DH parameters
     * @returns {Promise<URx>}
     */
    static async load(url, dh_m_scale = 1) {
        let urx = await super.load(url);
        
        urx.DH = urx.config.dh_parameters.map(dhp => {
            dhp.theta = toNum(dhp.theta);
            dhp.alpha = toNum(dhp.alpha);
            dhp.a *= dh_m_scale;
            dhp.d *= dh_m_scale;
            return dhp;
        });
        console.log(urx.DH);
        
        return urx;
    }
 }