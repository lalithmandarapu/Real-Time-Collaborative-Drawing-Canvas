import express from "express";
import http from "http";
import { Server as SocketIO } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { DrawingStateManager } from "./drawing-state.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const io = new SocketIO(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const PORT = process.env.PORT || 3000;

const drawingState = new DrawingStateManager();
const connectedUsers = new Map();
app.use(express.static(path.join(__dirname, "../client")));

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    users: connectedUsers.size,
    stats: drawingState.getStats(),
  });
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  connectedUsers.set(socket.id, {
    id: socket.id,
    connectedAt: Date.now(),
  });

  io.emit("user-count", connectedUsers.size);

  socket.emit("canvas-state", drawingState.getCanvasState());

  socket.on("draw-path", (operation) => {
    try {
      const added = drawingState.addOperation(operation);

      if (added) {
        socket.broadcast.emit("draw-event", operation);

        socket.emit("operation-ack", operation.id);
      }
    } catch (error) {
      console.error("Error handling draw-path:", error);
    }
  });

  socket.on("draw-batch", (batch) => {
    try {
      socket.broadcast.emit("draw-batch", batch);
    } catch (error) {
      console.error("Error handling draw-batch:", error);
    }
  });

  socket.on("history-event", (operation) => {
    try {
      let result;

      if (operation.type === "undo") {
        result = drawingState.globalUndo();
      } else if (operation.type === "redo") {
        result = drawingState.globalRedo();
      }

      if (result && result.success) {
        io.emit("history-event", {
          type: operation.type,
          userId: operation.userId,
          operation: result.operation,
          timestamp: Date.now(),
        });

        io.emit("canvas-state", drawingState.getCanvasState());

        socket.emit("operation-ack", operation.id);
      }
    } catch (error) {
      console.error("Error handling history-event:", error);
    }
  });

  socket.on("clear-canvas", (operation) => {
    try {
      const clearOp = drawingState.clear();
      io.emit("clear-canvas", {
        userId: operation.userId,
        timestamp: Date.now(),
      });

      socket.emit("operation-ack", operation.id);
    } catch (error) {
      console.error("Error handling clear-canvas:", error);
    }
  });

  socket.on("request-state", () => {
    socket.emit("canvas-state", drawingState.getCanvasState());
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);

    connectedUsers.delete(socket.id);

    io.emit("user-count", connectedUsers.size);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  httpServer.close(() => {
    console.log("HTTP server closed");
  });
});

export { app, httpServer, io };
