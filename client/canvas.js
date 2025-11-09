export class CanvasManager {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d', { 
      willReadFrequently: false,
      desynchronized: true 
    });
    
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    this.isDrawing = false;
    this.currentPath = [];
    this.tool = 'pen';
    this.color = '#000000';
    this.size = 3;
    
    this.layers = [];
    this.currentLayerIndex = -1;
    this.maxLayers = 50; 
    this.lastPoint = null;
    this.drawBuffer = [];
    this.rafId = null;
    
    this.setupContext();
    
    this.saveState();
  }
  
  resizeCanvas() {
    const oldCanvas = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx.putImageData(oldCanvas, 0, 0);
    this.setupContext();
  }
  
  setupContext() {
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }
  
  startDrawing(x, y) {
    this.isDrawing = true;
    this.currentPath = [{ x, y, color: this.color, size: this.size, tool: this.tool }];
    this.lastPoint = { x, y };
    
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }
  
  draw(x, y) {
    if (!this.isDrawing) return;
    
    this.currentPath.push({ x, y, color: this.color, size: this.size, tool: this.tool });
    
    if (this.lastPoint) {
      const midPoint = {
        x: (this.lastPoint.x + x) / 2,
        y: (this.lastPoint.y + y) / 2
      };
      
      this.ctx.strokeStyle = this.tool === 'eraser' ? '#ffffff' : this.color;
      this.ctx.lineWidth = this.size;
      this.ctx.globalCompositeOperation = this.tool === 'eraser' ? 'destination-out' : 'source-over';
      
      this.ctx.quadraticCurveTo(this.lastPoint.x, this.lastPoint.y, midPoint.x, midPoint.y);
      this.ctx.stroke();
      
      this.ctx.beginPath();
      this.ctx.moveTo(midPoint.x, midPoint.y);
    }
    
    this.lastPoint = { x, y };
  }
  
  stopDrawing() {
    if (!this.isDrawing) return;
    
    this.isDrawing = false;
    this.lastPoint = null;
    
    if (this.currentPath.length > 0) {
      this.saveState();
    }
    
    this.currentPath = [];
    this.ctx.globalCompositeOperation = 'source-over';
  }
  
  drawPath(path) {
    if (!path || path.length === 0) return;
    
    this.ctx.save();
    this.ctx.beginPath();
    
    const firstPoint = path[0];
    this.ctx.moveTo(firstPoint.x, firstPoint.y);
    this.ctx.strokeStyle = firstPoint.tool === 'eraser' ? '#ffffff' : firstPoint.color;
    this.ctx.lineWidth = firstPoint.size;
    this.ctx.globalCompositeOperation = firstPoint.tool === 'eraser' ? 'destination-out' : 'source-over';
    
    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1];
      const curr = path[i];
      const midPoint = {
        x: (prev.x + curr.x) / 2,
        y: (prev.y + curr.y) / 2
      };
      
      this.ctx.quadraticCurveTo(prev.x, prev.y, midPoint.x, midPoint.y);
    }
    
    if (path.length > 1) {
      const last = path[path.length - 1];
      this.ctx.lineTo(last.x, last.y);
    }
    
    this.ctx.stroke();
    this.ctx.restore();
    this.saveState();
  }
  
  saveState() {
    this.layers = this.layers.slice(0, this.currentLayerIndex + 1);
    
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.layers.push(imageData);
    this.currentLayerIndex++;

    if (this.layers.length > this.maxLayers) {
      this.layers.shift();
      this.currentLayerIndex--;
    }
  }
  
  restoreState(imageData) {
    this.ctx.putImageData(imageData, 0, 0);
  }

  undo() {
    if (this.currentLayerIndex > 0) {
      this.currentLayerIndex--;
      this.restoreState(this.layers[this.currentLayerIndex]);
      return true;
    }
    return false;
  }

  redo() {
    if (this.currentLayerIndex < this.layers.length - 1) {
      this.currentLayerIndex++;
      this.restoreState(this.layers[this.currentLayerIndex]);
      return true;
    }
    return false;
  }
  
  canUndo() {
    return this.currentLayerIndex > 0;
  }
  
  canRedo() {
    return this.currentLayerIndex < this.layers.length - 1;
  }
  
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.saveState();
  }

  restoreFromOperations(operations) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.layers = [];
    this.currentLayerIndex = -1;
    this.saveState();
    
    operations.forEach(op => {
      if (op.type === 'draw' && op.path) {
        this.drawPath(op.path);
      } else if (op.type === 'clear') {
        this.clear();
      }
    });
  }
  
  setTool(tool) {
    this.tool = tool;
    if (tool === 'eraser') {
      document.body.classList.add('eraser-mode');
    } else {
      document.body.classList.remove('eraser-mode');
    }
  }
  
  setColor(color) {
    this.color = color;
  }
  
  setSize(size) {
    this.size = size;
  }
}
