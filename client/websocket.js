/**
 * WebSocket Client
 * Handles event streaming with batching and client-side prediction
 */

export class WebSocketClient {
  constructor() {
    this.socket = io();
    this.connected = false;
    this.userId = this.generateUserId();
    this.userCount = 1;
    
    // Event batching for performance
    this.eventBatch = [];
    this.batchTimeout = null;
    this.batchInterval = 16; // ~60fps
    
    // Client-side prediction
    this.pendingOperations = [];
    this.acknowledgedOperations = [];
    
    // Operation sequencing
    this.operationId = 0;
    
    this.setupListeners();
  }
  
  generateUserId() {
    return `user_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  }
  
  setupListeners() {
    this.socket.on('connect', () => {
      this.connected = true;
      this.updateConnectionStatus(true);
      console.log('Connected to server');
      
      // Request current canvas state
      this.socket.emit('request-state');
    });
    
    this.socket.on('disconnect', () => {
      this.connected = false;
      this.updateConnectionStatus(false);
      console.log('Disconnected from server');
    });
    
    this.socket.on('user-count', (count) => {
      this.userCount = count;
      this.updateUserCount(count);
    });
    
    // Handle incoming draw events
    this.socket.on('draw-event', (data) => {
      if (data.userId !== this.userId) {
        this.handleRemoteDrawEvent(data);
      }
    });
    
    // Handle batch draw events
    this.socket.on('draw-batch', (batch) => {
      batch.forEach(data => {
        if (data.userId !== this.userId) {
          this.handleRemoteDrawEvent(data);
        }
      });
    });
    
    // Handle undo/redo events
    this.socket.on('history-event', (data) => {
      this.handleHistoryEvent(data);
    });
    
    // Handle clear canvas
    this.socket.on('clear-canvas', (data) => {
      if (data.userId !== this.userId) {
        this.handleClearCanvas(data);
      }
    });
    
    // Receive full canvas state
    this.socket.on('canvas-state', (state) => {
      this.handleCanvasState(state);
    });
    
    // Operation acknowledgment
    this.socket.on('operation-ack', (operationId) => {
      this.acknowledgeOperation(operationId);
    });
  }
  
  /**
   * Batch drawing events for better performance
   * Reduces network overhead by grouping events
   */
  emitDrawEvent(point) {
    this.eventBatch.push({
      ...point,
      userId: this.userId,
      timestamp: Date.now()
    });
    
    // Debounce batch sending
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    this.batchTimeout = setTimeout(() => {
      this.flushEventBatch();
    }, this.batchInterval);
  }
  
  flushEventBatch() {
    if (this.eventBatch.length === 0) return;
    
    // Send batched events
    this.socket.emit('draw-batch', this.eventBatch);
    this.eventBatch = [];
  }
  
  /**
   * Emit complete path when drawing stops
   * More efficient for stroke-based drawing
   */
  emitPath(path) {
    const operation = {
      id: this.operationId++,
      type: 'draw',
      userId: this.userId,
      path: path,
      timestamp: Date.now()
    };
    
    this.pendingOperations.push(operation);
    this.socket.emit('draw-path', operation);
  }
  
  /**
   * Emit undo operation
   */
  emitUndo() {
    const operation = {
      id: this.operationId++,
      type: 'undo',
      userId: this.userId,
      timestamp: Date.now()
    };
    
    this.pendingOperations.push(operation);
    this.socket.emit('history-event', operation);
  }
  
  /**
   * Emit redo operation
   */
  emitRedo() {
    const operation = {
      id: this.operationId++,
      type: 'redo',
      userId: this.userId,
      timestamp: Date.now()
    };
    
    this.pendingOperations.push(operation);
    this.socket.emit('history-event', operation);
  }
  
  /**
   * Emit clear canvas
   */
  emitClear() {
    const operation = {
      id: this.operationId++,
      type: 'clear',
      userId: this.userId,
      timestamp: Date.now()
    };
    
    this.pendingOperations.push(operation);
    this.socket.emit('clear-canvas', operation);
  }
  
  acknowledgeOperation(operationId) {
    const index = this.pendingOperations.findIndex(op => op.id === operationId);
    if (index !== -1) {
      const op = this.pendingOperations.splice(index, 1)[0];
      this.acknowledgedOperations.push(op);
      
      // Keep only last 100 acknowledged operations
      if (this.acknowledgedOperations.length > 100) {
        this.acknowledgedOperations.shift();
      }
    }
  }
  
  // Event handlers (to be set by main app)
  handleRemoteDrawEvent(data) {
    // Override this in main app
  }
  
  handleHistoryEvent(data) {
    // Override this in main app
  }
  
  handleClearCanvas(data) {
    // Override this in main app
  }
  
  handleCanvasState(state) {
    // Override this in main app
  }
  
  updateConnectionStatus(connected) {
    // Override this in main app
  }
  
  updateUserCount(count) {
    // Override this in main app
  }
}
