# Collaborative Canvas

A real-time collaborative drawing application built with HTML5 Canvas, Socket.IO, and Node.js. Features a minimal floating dock UI similar to Excalidraw, with support for pen, eraser, colors, size control, and global undo/redo functionality.

## 🎨 Features

- **Real-time Collaboration**: Multiple users can draw simultaneously on the same canvas
- **Floating Dock UI**: Minimalist, draggable toolbar with all essential tools
- **Drawing Tools**:
  - Pen tool with customizable colors and sizes
  - Eraser tool
  - Color picker with preset colors
  - Adjustable brush size (1-50px)
- **History Management**:
  - Global undo/redo across all users
  - Conflict resolution for simultaneous operations
  - Operation history tracking
- **Performance Optimized**:
  - Efficient canvas operations with quadratic curve smoothing
  - Event batching to reduce network overhead
  - Client-side prediction
  - RequestAnimationFrame for smooth drawing
- **Keyboard Shortcuts**:
  - `P` - Pen tool
  - `E` - Eraser tool
  - `Ctrl+Z` / `Cmd+Z` - Undo
  - `Ctrl+Y` / `Cmd+Shift+Z` - Redo
- **Mobile Support**: Touch events for drawing on tablets and phones

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd realtime

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`

### Production

```bash
npm start
```

## 📁 Project Structure

```
collaborative-canvas/
├── client/
│   ├── index.html          # Main HTML file with floating dock UI
│   ├── style.css           # Minimalist styling
│   ├── canvas.js           # Canvas drawing logic with optimization
│   ├── websocket.js        # WebSocket client with event batching
│   └── main.js             # App initialization and coordination
├── server/
│   ├── server.js           # Express + Socket.IO server
│   └── drawing-state.js    # Global state management with conflict resolution
├── package.json
├── README.md
└── ARCHITECTURE.md         # Detailed architecture documentation
```

## 🎯 Usage

### For Single User

1. Open the application in your browser
2. Select a tool (pen/eraser) from the floating dock
3. Choose a color and brush size
4. Start drawing on the canvas
5. Use undo/redo to manage your drawing history
6. Clear canvas when needed

### For Multiple Users

1. Multiple users can access the same URL
2. All users share the same canvas in real-time
3. Everyone sees each other's drawings instantly
4. Global undo/redo affects all users (last operation is undone/redone regardless of who performed it)
5. User count is displayed in the floating dock

## 🔧 Configuration

### Environment Variables

- `PORT` - Server port (default: 3000)

### Canvas Settings

Edit `client/canvas.js` to modify:
- `maxLayers` - Maximum undo/redo history (default: 50)
- Canvas rendering quality settings

### Network Settings

Edit `client/websocket.js` to modify:
- `batchInterval` - Event batching interval in ms (default: 16ms ~60fps)

## 🏗️ Architecture Highlights

### 1. Efficient Canvas Operations

- **Path Optimization**: Uses quadratic curves for smooth drawing
- **Layer Management**: Saves canvas states as ImageData for undo/redo
- **Efficient Redrawing**: Only redraws necessary portions
- **High-frequency Event Handling**: Throttled mouse events with RAF

### 2. Event Streaming Strategy

- **Data Serialization**: Paths serialized as point arrays with metadata
- **Batching**: Draw events batched every 16ms to reduce network calls
- **Individual Strokes**: Complete paths sent when stroke finishes
- **Network Latency Handling**: Client-side prediction with operation acknowledgment

### 3. Global Undo/Redo System

- **Operation History**: All operations stored in chronological order
- **Conflict Resolution**: Timestamp-based ordering (Lamport clock style)
- **State Consistency**: Operations applied in the same order on all clients
- **User A undoes User B**: Last operation in history is undone regardless of user

### 4. Performance Optimizations

- Desynchronized canvas context for better animations
- RequestAnimationFrame for smooth drawing
- Event debouncing and throttling
- Limited history size to prevent memory issues
- Efficient ImageData storage for undo/redo

## 🔍 Technical Details

### Canvas Optimization

```javascript
// Quadratic curve smoothing for natural drawing
ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midPoint.x, midPoint.y);

// Optimized context settings
const ctx = canvas.getContext('2d', { 
  willReadFrequently: false,
  desynchronized: true 
});
```

### Event Batching

```javascript
// Batch events every 16ms (~60fps)
this.batchTimeout = setTimeout(() => {
  this.flushEventBatch();
}, this.batchInterval);
```

### Conflict Resolution

```javascript
// Timestamp-based ordering
if (newOperation.timestamp < conflictingOperation.timestamp) {
  // New operation has priority
}
```

## 🧪 Testing

Open multiple browser windows/tabs to test real-time collaboration:

1. Draw in one window, see it appear in others
2. Use undo in one window, see all windows update
3. Test simultaneous drawing by multiple users
4. Verify connection status indicator

## 📊 Monitoring

Access the health check endpoint:

```
GET http://localhost:3000/health
```

Returns:
```json
{
  "status": "healthy",
  "users": 3,
  "stats": {
    "totalOperations": 150,
    "currentIndex": 150,
    "activeUsers": 3,
    "canUndo": true,
    "canRedo": false
  }
}
```

## 🎨 UI Features

- **Draggable Dock**: Click and drag the dock handle (⋮⋮) to reposition
- **Cursor Preview**: Shows brush size preview while drawing
- **Connection Status**: Live indicator with user count
- **Responsive Design**: Works on desktop and mobile devices

## 🔐 Security Considerations

For production deployment:
- Add authentication/authorization
- Implement rate limiting
- Add input validation and sanitization
- Use HTTPS/WSS
- Add CORS restrictions
- Implement session management

## 🚀 Deployment

### Docker

```bash
docker build -t collaborative-canvas .
docker run -p 3000:3000 collaborative-canvas
```

### Heroku

```bash
heroku create your-app-name
git push heroku main
```

## 📝 License

MIT License

## 🤝 Contributing

Contributions welcome! Please read the contributing guidelines first.

## 📧 Support

For issues and questions, please open a GitHub issue.
