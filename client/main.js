/**
 * Main Application
 * Initializes and coordinates canvas and websocket
 */

import { CanvasManager } from './canvas.js';
import { WebSocketClient } from './websocket.js';

class CollaborativeCanvas {
  constructor() {
    // Initialize canvas
    this.canvas = document.getElementById('canvas');
    this.canvasManager = new CanvasManager(this.canvas);
    
    // Initialize websocket
    this.wsClient = new WebSocketClient();
    
    // Setup websocket event handlers
    this.setupWebSocketHandlers();
    
    // Setup UI controls
    this.setupUIControls();
    
    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Setup mouse events with throttling for performance
    this.setupCanvasEvents();
    
    // Make dock draggable
    this.setupDraggableDock();
    
    // Initialize cursor preview
    this.setupCursorPreview();
  }
  
  setupWebSocketHandlers() {
    // Handle remote draw events
    this.wsClient.handleRemoteDrawEvent = (data) => {
      if (data.path) {
        this.canvasManager.drawPath(data.path);
      }
    };
    
    // Handle history events (undo/redo)
    this.wsClient.handleHistoryEvent = (data) => {
      if (data.type === 'undo') {
        this.canvasManager.undo();
      } else if (data.type === 'redo') {
        this.canvasManager.redo();
      }
      this.updateHistoryButtons();
    };
    
    // Handle clear canvas
    this.wsClient.handleClearCanvas = (data) => {
      this.canvasManager.clear();
    };
    
    // Handle full canvas state
    this.wsClient.handleCanvasState = (state) => {
      if (state.operations && state.operations.length > 0) {
        this.canvasManager.restoreFromOperations(state.operations);
      }
      this.updateHistoryButtons();
    };
    
    // Update connection status
    this.wsClient.updateConnectionStatus = (connected) => {
      const statusEl = document.getElementById('connection-status');
      if (connected) {
        statusEl.classList.add('connected');
        statusEl.classList.remove('disconnected');
      } else {
        statusEl.classList.remove('connected');
        statusEl.classList.add('disconnected');
      }
    };
    
    // Update user count
    this.wsClient.updateUserCount = (count) => {
      document.getElementById('user-count').textContent = count;
    };
  }
  
  setupUIControls() {
    // Tool selection
    document.getElementById('pen-tool').addEventListener('click', () => {
      this.selectTool('pen');
    });
    
    document.getElementById('eraser-tool').addEventListener('click', () => {
      this.selectTool('eraser');
    });
    
    // Color picker
    const colorPicker = document.getElementById('color-picker');
    const colorDisplay = document.getElementById('color-display');
    
    colorDisplay.addEventListener('click', () => {
      colorPicker.click();
    });
    
    colorPicker.addEventListener('input', (e) => {
      this.setColor(e.target.value);
    });
    
    // Preset colors
    document.querySelectorAll('.preset-color').forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.dataset.color;
        this.setColor(color);
        colorPicker.value = color;
      });
    });
    
    // Size slider
    const sizeSlider = document.getElementById('size-slider');
    const sizeValue = document.getElementById('size-value');
    
    sizeSlider.addEventListener('input', (e) => {
      const size = parseInt(e.target.value);
      this.canvasManager.setSize(size);
      sizeValue.textContent = size;
      this.updateCursorPreview();
    });
    
    // History controls
    document.getElementById('undo-btn').addEventListener('click', () => {
      this.undo();
    });
    
    document.getElementById('redo-btn').addEventListener('click', () => {
      this.redo();
    });
    
    // Clear canvas
    document.getElementById('clear-btn').addEventListener('click', () => {
      if (confirm('Clear entire canvas? This will affect all users.')) {
        this.clearCanvas();
      }
    });
    
    // Initialize button states
    this.updateHistoryButtons();
  }
  
  setupCanvasEvents() {
    let isDrawing = false;
    
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => {
      isDrawing = true;
      const { x, y } = this.getCanvasCoordinates(e);
      this.canvasManager.startDrawing(x, y);
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      if (isDrawing) {
        const { x, y } = this.getCanvasCoordinates(e);
        this.canvasManager.draw(x, y);
      }
      
      // Update cursor preview
      const { x, y } = this.getCanvasCoordinates(e);
      this.updateCursorPreviewPosition(x, y);
    });
    
    this.canvas.addEventListener('mouseup', () => {
      if (isDrawing) {
        isDrawing = false;
        const path = this.canvasManager.currentPath;
        this.canvasManager.stopDrawing();
        
        // Emit path to other users
        if (path.length > 0) {
          this.wsClient.emitPath(path);
        }
      }
    });
    
    this.canvas.addEventListener('mouseleave', () => {
      if (isDrawing) {
        isDrawing = false;
        const path = this.canvasManager.currentPath;
        this.canvasManager.stopDrawing();
        
        if (path.length > 0) {
          this.wsClient.emitPath(path);
        }
      }
      this.hideCursorPreview();
    });
    
    this.canvas.addEventListener('mouseenter', () => {
      this.showCursorPreview();
    });
    
    // Touch events for mobile
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      isDrawing = true;
      const touch = e.touches[0];
      const { x, y } = this.getCanvasCoordinates(touch);
      this.canvasManager.startDrawing(x, y);
    });
    
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (isDrawing) {
        const touch = e.touches[0];
        const { x, y } = this.getCanvasCoordinates(touch);
        this.canvasManager.draw(x, y);
      }
    });
    
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (isDrawing) {
        isDrawing = false;
        const path = this.canvasManager.currentPath;
        this.canvasManager.stopDrawing();
        
        if (path.length > 0) {
          this.wsClient.emitPath(path);
        }
      }
    });
  }
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Z or Cmd+Z - Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      }
      
      // Ctrl+Y or Cmd+Shift+Z - Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        this.redo();
      }
      
      // P - Pen tool
      if (e.key === 'p' || e.key === 'P') {
        this.selectTool('pen');
      }
      
      // E - Eraser tool
      if (e.key === 'e' || e.key === 'E') {
        this.selectTool('eraser');
      }
    });
  }
  
  setupDraggableDock() {
    const dock = document.getElementById('floating-dock');
    const handle = dock.querySelector('.dock-handle');
    
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    
    handle.addEventListener('mousedown', (e) => {
      isDragging = true;
      dock.classList.add('dragging');
      
      initialX = e.clientX - dock.offsetLeft;
      initialY = e.clientY - dock.offsetTop;
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        
        dock.style.transform = 'none';
        dock.style.left = currentX + 'px';
        dock.style.top = currentY + 'px';
        dock.style.bottom = 'auto';
      }
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
      dock.classList.remove('dragging');
    });
  }
  
  setupCursorPreview() {
    this.cursorPreview = document.getElementById('cursor-preview');
    this.updateCursorPreview();
  }
  
  updateCursorPreview() {
    const size = this.canvasManager.size;
    this.cursorPreview.style.width = size + 'px';
    this.cursorPreview.style.height = size + 'px';
    this.cursorPreview.style.borderColor = this.canvasManager.tool === 'eraser' ? '#ff0000' : this.canvasManager.color;
  }
  
  updateCursorPreviewPosition(x, y) {
    this.cursorPreview.style.left = x + 'px';
    this.cursorPreview.style.top = y + 'px';
  }
  
  showCursorPreview() {
    this.cursorPreview.classList.add('active');
  }
  
  hideCursorPreview() {
    this.cursorPreview.classList.remove('active');
  }
  
  getCanvasCoordinates(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }
  
  selectTool(tool) {
    this.canvasManager.setTool(tool);
    
    // Update UI
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    if (tool === 'pen') {
      document.getElementById('pen-tool').classList.add('active');
    } else if (tool === 'eraser') {
      document.getElementById('eraser-tool').classList.add('active');
    }
    
    this.updateCursorPreview();
  }
  
  setColor(color) {
    this.canvasManager.setColor(color);
    document.getElementById('color-display').style.background = color;
    this.updateCursorPreview();
  }
  
  undo() {
    if (this.canvasManager.undo()) {
      this.wsClient.emitUndo();
      this.updateHistoryButtons();
    }
  }
  
  redo() {
    if (this.canvasManager.redo()) {
      this.wsClient.emitRedo();
      this.updateHistoryButtons();
    }
  }
  
  clearCanvas() {
    this.canvasManager.clear();
    this.wsClient.emitClear();
    this.updateHistoryButtons();
  }
  
  updateHistoryButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    
    undoBtn.disabled = !this.canvasManager.canUndo();
    redoBtn.disabled = !this.canvasManager.canRedo();
  }
}

// Initialize app when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new CollaborativeCanvas();
});
