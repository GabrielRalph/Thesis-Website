import {BufferGeometry, Line, CylinderGeometry, Matrix3, Vector3, SphereGeometry, AxesHelper, MeshBasicMaterial, LineBasicMaterial, MeshStandardMaterial, Matrix4, Group, Mesh, DoubleSide} from "https://cdn.jsdelivr.net/npm/three@0.174.0/+esm";
const {log, min} = Math;

const EXTEND = {
    ADVANCED: 1,
    TRAPPED: 0,
    REACHED: 2
}

export class RRTBase {
    constructor(dt) {
        this.dt = dt;
        this.nodes = [];
        // this.edges = [];
    }

    addNode(node) {
        this.q_new = node;
        node.parent = null;
        node.children = [];
        node.cost = 0;
        this.nodes.push(node);
    }

    addEdge(edge) {
        let [start, end] = edge;
        if (!("children" in start)) {
            start.children = [];
        }
        start.children.push(end);
        end.parent = start;
        end.cost = start.cost + this.lineCost(start, end);
    }

    removeEdge(edge) {
        let [start, end] = edge;
        if (start.children) {
            start.children = start.children.filter(child => child !== end);
        }
        end.parent = null;
        end.cost = 0;
    }

    randomSample() {
        let x = Math.random() * 100;
        let y = Math.random() * 100;
        let z = 1;
        return [x, y, z];
    }

    nodeDistance(node1, node2) {
        return node1.map((v, i) => (node2[i] - v) ** 2).reduce((a, b) => a + b, 0);
    }

    lineCost(x1, x2) {
        return Math.sqrt(this.nodeDistance(x1, x2));
    }

    nearest(node) {
        let nearestNode = null;
        let minDistance = Infinity;

        for (const n of this.nodes) {
            const distance = this.nodeDistance(node, n);
            if (distance < minDistance) {
                minDistance = distance;
                nearestNode = n;
            }
        }
        return nearestNode;
    }

    near(node, radius) {
        radius = radius ** 2;
        let nearNodes = [];
        for (const n of this.nodes) {
            const distance = this.nodeDistance(node, n);
            if (distance < radius) {
                nearNodes.push(n);
            }
        }
        return nearNodes;
    }

    near_k(node, k) {   
        let sortedNodes = [...this.nodes];
        sortedNodes.sort((a, b) => this.nodeDistance(node, a) - this.nodeDistance(node, b));
        return sortedNodes.slice(0, k);
    }

    steer(x1, x2) {
        let x_dir = x1.map((v, i) => x2[i] - v);
        let length = this.lineCost(x1, x2);
        let x_dir_norm = x_dir.map(v => v / length);
        
        return [x1.map((v, i) => v + x_dir_norm[i] * this.dt), length]
    }

    extend(x){
        const {dt} = this;
        let x_near = this.nearest(x);
        let [x_new, length] = this.steer(x_near, x);
        
        if (!this.isFree(x_new)) {
            return EXTEND.TRAPPED;
        } else {
            if (length > dt) {
                this.addNode(x_new);
                this.addEdge([x_near, x_new]);
                return EXTEND.ADVANCED;
            } else {
                return EXTEND.REACHED;
            }
        }
    }

    connect(x) {
        let s = this.extend(x);
        
        while (s === EXTEND.ADVANCED) {
            s = this.extend(x);
        }
        
        return s;
    }

    // yRRT = 500;
    dim = 6;
    starGetNearest(x) {
        const {dim} = this;
        let nv = this.nodes.length
        let yRRT = 2 * (1 + 1/dim)**(1/dim) * (12**dim / (3.14)) ** (1/dim)
        let radis = min(yRRT * (log(nv) / nv) ** (1 / 3), this.dt *1.7);
        
        return this.near(x, radis);
    }

    starGetNearest2(x) {
        let k = Math.round(2 * 2.7 * Math.log(this.nodes.length));
        return this.near_k(x, k);
    }

    starExtend(x_rand) {
        console.log("i");
        
        let x_nearest = this.nearest(x_rand);
        let [x_new] = this.steer(x_nearest, x_rand);
        if (this.isFree(x_new)) {
            let X_near = this.starGetNearest(x_new);
            
            this.addNode(x_new);

            let xmin = x_nearest;
            let cmin = x_nearest.cost + this.lineCost(x_nearest, x_new);
            for (let x_near of X_near) {
                const isFreeLine = true;
                const cost = x_near.cost + this.lineCost(x_near, x_new);
                if (isFreeLine && cost < cmin) {
                    xmin = x_near;
                    cmin = cost
                }
            }

            this.addEdge([xmin, x_new]);


            for (let x_near of X_near) {
                const isFreeLine = true;
                const cost = x_new.cost + this.lineCost(x_new, x_near);
                if (isFreeLine && cost < x_near.cost) {
                    this.removeEdge([x_near.parent, x_near]);
                    this.addEdge([x_new, x_near]);
                    console.log("reconnect");
                }
            }

            if (this.lineCost(x_new, x_rand) < this.dt) {
                return EXTEND.REACHED;
            } else {
                return EXTEND.ADVANCED;
            }
        } else {
            return EXTEND.TRAPPED;
        }
    }

    isFree(x) {
        // Check if the node is free (not in collision)
        // This is a placeholder function. You should implement your own collision detection logic.
        return true;
    }

}

export class RRTBase3D extends RRTBase {
    constructor(dt) {
        super(dt);
    }

    nodeDistance(node1, node2) {
        return (node1[0] - node2[0]) ** 2 + (node1[1] - node2[1]) ** 2 + (node1[2] - node2[2]) ** 2;
    }
}

export class RRTThree extends RRTBase {
    constructor(color, radius, length, edge2radius = 1, edgeColor = color) {
        super(length);
        this.nodeMaterial = new MeshStandardMaterial({ color: edgeColor });
        this.nodeGlowMaterial = new MeshStandardMaterial({ color, 
        });
        this.edgeMaterial = new LineBasicMaterial({ color });
        this.nodeGeometry = new SphereGeometry(radius, 16, 16);
        this.edgeGeometry = new CylinderGeometry(radius / edge2radius, radius / edge2radius, length, 16);
        this.root = new Group();
    }


    makeCylinder(edge) {
        let [start, end] = edge;
        let direction = new Vector3(...end).sub(new Vector3(...start));
        let midPoint = new Vector3(...start).add(direction.clone().multiplyScalar(0.5));
        let geometry = new Mesh(this.edgeGeometry, this.nodeMaterial);
        geometry.quaternion.setFromUnitVectors(
            new Vector3(0, 1, 0),
            direction.clone().normalize()
        );
        geometry.position.copy(midPoint);
        this.root.add(geometry);
        return geometry;
    }

    addNode(node) {
        super.addNode(node);
        const mesh = new Mesh(this.nodeGeometry, this.nodeGlowMaterial);
        mesh.position.set(...node);
        this.root.add(mesh);
    }

    addEdge(edge) {
        super.addEdge(edge);
        edge[1].geometry = this.makeCylinder(edge);
    }

    removeEdge(edge) {
        this.root.remove( edge[1].geometry);
        super.removeEdge(edge);
    }
}

console.log("yRRT-3D", 2 * (1 + 1/3)**(1/3) * (100**3 / (3.14 * 4 / 3)) ** (1/3));
console.log("yRRT-2D", 2 * 2 * (1 + 1/2)**(1/2) * (100**2 / (3.14)) ** (1/2));

export class RRTThreeLine extends RRTThree {
    constructor(...args) {
        super(...args);
        this.edgeMaterial = new LineBasicMaterial({ color: args[4] });
    }

    makeCylinder(edge) {
        const start = new Vector3(...edge[0]);
        const end = new Vector3(...edge[1]);
        const points = [start, end];
        const geometry = new BufferGeometry().setFromPoints(points);
        const line = new Line(geometry, this.edgeMaterial);
        this.root.add(line);
        return line;
    }

}

export function RRT_basic(T, xinit, xgoal) {
    T.addNode(xinit);
    let itterator = (x) => {
        return T.extend(x);
    }
    return itterator;
}

export function RRT_bi(T1, T2, xstart, xgoal) {
    let Complete = false;
    T1.addNode(xstart);
    T2.addNode(xgoal);
    let itterator = (x_rand) => {
        if (Complete) return true;
    
        if (T1.extend(x_rand) != EXTEND.TRAPPED) {
            if (T2.extend(T1.q_new) == EXTEND.REACHED) {
                Complete = true;
                return true;
            }
        }
        [T1, T2] = [T2, T1];   
        return false
    }

    return itterator;
}

export function RRT_connect(T1, T2, xstart, xgoal) {
    let Complete = false;
    T1.addNode(xstart);
    T2.addNode(xgoal);
    let itterator = (x_rand) => {
        if (Complete) return true;

        if (T1.extend(x_rand) != EXTEND.TRAPPED) {
            if (T2.connect(T1.q_new) == EXTEND.REACHED) {
                Complete = true;
                return true;
            }
        }
        [T1, T2] = [T2, T1];   
        return false
    }

    return itterator;
}

export function RRT_greedy(T1, T2, xstart, xgoal) {
    let Complete = false;
    T1.addNode(xstart);
    T2.addNode(xgoal);
    let itterator = (x_rand) => {
        if (Complete) return true;

        if (T1.connect(x_rand) != EXTEND.TRAPPED) {
            if (T2.connect(T1.q_new) == EXTEND.REACHED) {
                Complete = true;
                return true;
            }
        }
        [T1, T2] = [T2, T1];   
        return false
    }

    return itterator;
}

/**
 * @param {RRTBase} T1
 * @param {number[]} xstart
 * @param {number[]} xgoal
 * 
 * @return {(number[]) => boolean}
 */
export function RRT_star(T1, xstart, xgoal) {
    let Complete = false;
    if (xstart != null) T1.addNode(xstart);

    let itterator = (x_rand) => {
        if (Complete) return true;
        T1.starExtend(x_rand);
    }

    return itterator;
}

export function RRT_star_bi(T1, T2, xstart, xgoal) {
    let Complete = false;
    T1.addNode(xstart);
    T2.addNode(xgoal);
    let itterator = (x_rand) => {
        if (Complete) return true;
    
        if (T1.starExtend(x_rand) != EXTEND.TRAPPED) {
            if (T2.starExtend(T1.q_new) == EXTEND.REACHED) {
                Complete = true;
                return true;
            }
        }
        [T1, T2] = [T2, T1];   
        return false
    }

    return itterator;
}