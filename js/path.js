/**
 * Path and grid system for the tower defense map
 * Defines enemy path waypoints and placeable tile grid
 */
class GameMap {
  constructor() {
    this.gridCols = 10;
    this.gridRows = 14;
    this.tileSize = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.tiles = [];      // 2D: 0=empty, 1=path, 2=turret
    this.pathWaypoints = [];
    this.pathCells = new Set();
  }

  init(canvasW, canvasH) {
    // Fit grid to screen
    const marginTop = 90;
    const marginBottom = 160;
    const usableH = canvasH - marginTop - marginBottom;
    const usableW = canvasW - 20;

    this.tileSize = Math.floor(Math.min(usableW / this.gridCols, usableH / this.gridRows));
    this.offsetX = Math.floor((canvasW - this.gridCols * this.tileSize) / 2);
    this.offsetY = marginTop;

    // Create grid
    this.tiles = [];
    for (let r = 0; r < this.gridRows; r++) {
      this.tiles[r] = [];
      for (let c = 0; c < this.gridCols; c++) {
        this.tiles[r][c] = 0;
      }
    }

    // Define winding path (grid coords)
    const pathCoords = [
      [0, 1],
      [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1],
      [7, 2], [7, 3],
      [6, 3], [5, 3], [4, 3], [3, 3], [2, 3],
      [2, 4], [2, 5],
      [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5],
      [8, 6], [8, 7],
      [7, 7], [6, 7], [5, 7], [4, 7], [3, 7], [2, 7], [1, 7],
      [1, 8], [1, 9],
      [2, 9], [3, 9], [4, 9], [5, 9], [6, 9], [7, 9],
      [7, 10], [7, 11],
      [6, 11], [5, 11], [4, 11], [3, 11],
      [3, 12], [3, 13]
    ];

    this.pathCells.clear();
    this.pathWaypoints = [];

    for (const [col, row] of pathCoords) {
      if (row < this.gridRows && col < this.gridCols) {
        this.tiles[row][col] = 1;
        this.pathCells.add(`${col},${row}`);
        this.pathWaypoints.push({
          x: this.offsetX + col * this.tileSize + this.tileSize * 0.5,
          y: this.offsetY + row * this.tileSize + this.tileSize * 0.5,
          col, row
        });
      }
    }
  }

  screenToGrid(sx, sy) {
    const col = Math.floor((sx - this.offsetX) / this.tileSize);
    const row = Math.floor((sy - this.offsetY) / this.tileSize);
    if (col < 0 || col >= this.gridCols || row < 0 || row >= this.gridRows) return null;
    return { col, row };
  }

  gridToScreen(col, row) {
    return {
      x: this.offsetX + col * this.tileSize + this.tileSize * 0.5,
      y: this.offsetY + row * this.tileSize + this.tileSize * 0.5
    };
  }

  canPlace(col, row) {
    if (col < 0 || col >= this.gridCols || row < 0 || row >= this.gridRows) return false;
    return this.tiles[row][col] === 0;
  }

  placeTurret(col, row) {
    this.tiles[row][col] = 2;
  }

  removeTurret(col, row) {
    this.tiles[row][col] = 0;
  }
}
