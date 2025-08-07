const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

// Load an image
const img = new Image();
img.src = './maze.jpg'; // Replace with your image URL

await new Promise((resolve) => {
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        console.log("loaded");
        
        resolve();
    }
});

// Function to check if a pixel is black
export function isPixelBlack(x, y) {
    const pixel = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
    const [r, g, b, a] = pixel;

    // You can adjust tolerance here if needed
    const isBlack = r < 150 && g < 150 && b < 150;

    return isBlack;
}

document.body.appendChild(canvas);
canvas.setAttribute('style', 'position: absolute; top: 0; right: 0; z-index: 1;');


for (let i =0; i < 100; i+= 5) {
    let str = "";
    for (let j =0; j < 100; j+=5) {
        str += isPixelBlack(j, i) ? "1" : "0";
    }
    console.log(str);
}