export class DrawingStateManager {
  constructor() {
    this.operations = [];
    this.maxOperations = 500;
    this.operationTimestamps = new Map();
    this.currentStateIndex = -1;

    this.userOperations = new Map();
  }

  addOperation(operation) {
    if (
      !operation ||
      typeof operation.id === "undefined" ||
      !operation.userId ||
      !operation.type
    ) {
      console.error("Invalid operation:", operation);
      return false;
    }

    if (!operation.timestamp) {
      operation.timestamp = Date.now();
    }

    const conflict = this.detectConflict(operation);

    if (conflict) {
      operation = this.resolveConflict(operation, conflict);
    }

    if (this.currentStateIndex < this.operations.length - 1) {
      this.operations = this.operations.slice(0, this.currentStateIndex + 1);
    }

    this.operations.push(operation);
    this.currentStateIndex++;
    this.operationTimestamps.set(operation.id, operation.timestamp);

    if (!this.userOperations.has(operation.userId)) {
      this.userOperations.set(operation.userId, []);
    }
    this.userOperations.get(operation.userId).push(operation);

    if (this.operations.length > this.maxOperations) {
      const removed = this.operations.shift();
      this.currentStateIndex--;
      this.operationTimestamps.delete(removed.id);
    }

    return true;
  }

  globalUndo() {
    if (this.currentStateIndex >= 0) {
      const undoneOperation = this.operations[this.currentStateIndex];
      this.currentStateIndex--;

      return {
        success: true,
        operation: undoneOperation,
        remainingOperations: this.getActiveOperations(),
      };
    }

    return { success: false };
  }

  globalRedo() {
    if (this.currentStateIndex < this.operations.length - 1) {
      this.currentStateIndex++;
      const redoneOperation = this.operations[this.currentStateIndex];

      return {
        success: true,
        operation: redoneOperation,
        remainingOperations: this.getActiveOperations(),
      };
    }

    return { success: false };
  }

  getActiveOperations() {
    return this.operations.slice(0, this.currentStateIndex + 1);
  }

  getCanvasState() {
    return {
      operations: this.getActiveOperations(),
      currentIndex: this.currentStateIndex,
      timestamp: Date.now(),
    };
  }

  detectConflict(newOperation) {
    const timeWindow = 100;

    const recentOps = this.operations.filter((op) => {
      return (
        Math.abs(op.timestamp - newOperation.timestamp) < timeWindow &&
        op.userId !== newOperation.userId
      );
    });

    if (recentOps.length > 0) {
      return recentOps[recentOps.length - 1];
    }

    return null;
  }

  resolveConflict(newOperation, conflictingOperation) {
    if (newOperation.timestamp < conflictingOperation.timestamp) {
      console.log(
        `Conflict resolved: Operation ${newOperation.id} prioritized over ${conflictingOperation.id}`
      );
    } else {
      console.log(
        `Conflict resolved: Operation ${conflictingOperation.id} has priority over ${newOperation.id}`
      );
    }

    return newOperation;
  }

  clear() {
    const clearOperation = {
      id: `clear_${Date.now()}`,
      type: "clear",
      userId: "system",
      timestamp: Date.now(),
    };

    this.operations = [clearOperation];
    this.currentStateIndex = 0;
    this.operationTimestamps.clear();
    this.userOperations.clear();

    return clearOperation;
  }

  getStats() {
    return {
      totalOperations: this.operations.length,
      currentIndex: this.currentStateIndex,
      activeUsers: this.userOperations.size,
      canUndo: this.currentStateIndex >= 0,
      canRedo: this.currentStateIndex < this.operations.length - 1,
    };
  }
}
