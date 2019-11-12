var socket;

function setup() {
    createCanvas(600, 600);
    background(50);
    socket = io.connect('http://10.99.99.131:3000/', { query: "game=1234" });
}