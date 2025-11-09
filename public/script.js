const canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = 0.98 * window.innerHeight;
const ctx = canvas.getContext("2d");
let x = 0,
  y = 0;
let mousedown = false;

const socket = io();
const lineWidthRange = document.getElementById("lineWidthRange");
ctx.lineWidth = lineWidthRange.value;
let currentColor = "black"; // Set a default color

lineWidthRange.addEventListener("input", (e) => {
  ctx.lineWidth = e.target.value;
});

const setStrokeColor = (color) => {
  ctx.strokeStyle = color;
  currentColor = color;
};

const buttons = document.querySelectorAll(".btn-box button");
buttons.forEach((button) => {
  button.addEventListener("click", () => {
    const color = button.getAttribute("data-color");
    setStrokeColor(color);
  });
});

window.onmousedown = (e) => {
  x = e.clientX;
  y = e.clientY;
  ctx.beginPath();
  ctx.moveTo(x, y);

  socket.emit("down", { x, y, color: currentColor, lineWidth: ctx.lineWidth });
  mousedown = true;
};

window.onmouseup = () => {
  mousedown = false;
  ctx.closePath();
};

socket.on("onDraw", (data) => {
  ctx.strokeStyle = data.color; 
  ctx.lineWidth = data.lineWidth; 
  ctx.lineTo(data.x, data.y);
  ctx.stroke();
});

socket.on("onDown", ({ x, y, color, lineWidth }) => {
  ctx.strokeStyle = color; 
  ctx.lineWidth = lineWidth; 
  ctx.beginPath();u
  ctx.moveTo(x, y);
});

window.onmousemove = (e) => {
  x = e.clientX;
  y = e.clientY;

  if (mousedown) {
    socket.emit("draw", { x, y, color: currentColor, lineWidth: ctx.lineWidth });
    ctx.lineTo(x, y);
    ctx.stroke();
  }
};

setStrokeColor("black");
