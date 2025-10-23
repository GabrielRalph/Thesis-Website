let lcel = document.createElement("div");
lcel.classList.add("load-count");
lcel.innerText = "Load Count: 0";
document.body.appendChild(lcel);
let loadCount = 0;
export function add() {
    loadCount ++;
    lcel.innerText = `Load Count: ${loadCount}`;
    console.log(loadCount);
    
}

export function done() {
    loadCount --;
    console.log(loadCount);

    lcel.innerText = `Load Count: ${loadCount}`;
    if (loadCount == 0) {
        lcel.remove();
    }
}