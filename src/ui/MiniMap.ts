import {
  CITY_ROAD_NETWORK,
  CITY_MINIMAP_HALF_SIZE,
  createIslandOutline,
  makeRoadCurve,
} from '../world/CityMap';

export class MiniMap {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly baseCanvas: HTMLCanvasElement;
  private readonly baseContext: CanvasRenderingContext2D;
  private readonly roads = CITY_ROAD_NETWORK;
  private readonly size = 190;
  private readonly baseSize = 1024;
  private readonly viewRadius = 170;

  constructor() {
    this.canvas = document.getElementById('city-minimap') as HTMLCanvasElement;
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.context = this.canvas.getContext('2d')!;
    this.baseCanvas = document.createElement('canvas');
    this.baseCanvas.width = this.baseSize;
    this.baseCanvas.height = this.baseSize;
    this.baseContext = this.baseCanvas.getContext('2d')!;
    this.drawBaseMap();
  }

  public update(x: number, z: number, facingAngle: number): void {
    this.context.clearRect(0, 0, this.size, this.size);
    const mapCenter = this.worldToMap(x, z);
    mapCenter.x = this.baseSize - mapCenter.x;
    const sourceSize = (this.viewRadius / CITY_MINIMAP_HALF_SIZE) * this.baseSize;
    this.context.drawImage(
      this.baseCanvas,
      mapCenter.x - sourceSize / 2,
      mapCenter.y - sourceSize / 2,
      sourceSize,
      sourceSize,
      0,
      0,
      this.size,
      this.size
    );
    const ctx = this.context;

    ctx.save();
    ctx.translate(this.size / 2, this.size / 2);
    // Keep the map north-up and rotate only the player pointer to match yaw.
    ctx.rotate(-facingAngle);
    ctx.fillStyle = '#f8fbff';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 7);
    ctx.lineTo(0, 4);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#06d6c7';
    ctx.beginPath();
    ctx.arc(0, 0, 3.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

  }

  private drawBaseMap(): void {
    const ctx = this.baseContext;
    const size = this.baseSize;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#237e99';
    ctx.fillRect(0, 0, size, size);

    const islandOutline = createIslandOutline();
    ctx.beginPath();
    islandOutline.forEach(([x, z], index) => {
      const mapped = this.worldToMap(x, z);
      if (index === 0) ctx.moveTo(mapped.x, mapped.y);
      else ctx.lineTo(mapped.x, mapped.y);
    });
    ctx.closePath();
    ctx.fillStyle = '#587b43';
    ctx.fill();
    ctx.strokeStyle = '#c4ad72';
    ctx.lineWidth = this.worldLengthToMap(48);
    ctx.stroke();

    ctx.strokeStyle = '#252a2c';
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    ctx.save();
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    for (const road of this.roads) {
      const curve = makeRoadCurve(road);
      const segments = Math.max(2, Math.ceil(curve.getLength() / 6));
      const points = curve.getPoints(segments);
      ctx.lineWidth = this.worldLengthToMap(road.width);
      ctx.beginPath();
      points.forEach((point, index) => {
        const mapped = this.worldToMap(point.x, point.z);
        if (index === 0) ctx.moveTo(mapped.x, mapped.y);
        else ctx.lineTo(mapped.x, mapped.y);
      });
      ctx.stroke();
    }

    // The existing street directly outside the villa gate.
    this.drawHorizontalRoad(-60, 60, 29, 10);
    ctx.restore();

    // Mark the villa parcel so the player's surroundings are easy to identify.
    const topLeft = this.worldToMap(-25, -50);
    const bottomRight = this.worldToMap(25, 20);
    ctx.fillStyle = '#8a6548';
    ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    ctx.strokeStyle = '#f4dc9b';
    ctx.lineWidth = 1;
    ctx.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    ctx.fillStyle = '#fff2cd';
    ctx.font = 'bold 6px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VILLA', (topLeft.x + bottomRight.x) / 2, (topLeft.y + bottomRight.y) / 2 + 2);

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  }

  private drawHorizontalRoad(fromX: number, toX: number, z: number, width: number): void {
    const start = this.worldToMap(fromX, z);
    const end = this.worldToMap(toX, z);
    this.baseContext.strokeStyle = '#252a2c';
    this.baseContext.lineWidth = this.worldLengthToMap(width);
    this.baseContext.beginPath();
    this.baseContext.moveTo(start.x, start.y);
    this.baseContext.lineTo(end.x, end.y);
    this.baseContext.stroke();
  }

  private worldLengthToMap(length: number): number {
    return (length / (CITY_MINIMAP_HALF_SIZE * 2)) * this.baseSize;
  }

  private worldToMap(x: number, z: number): { x: number; y: number } {
    return {
      x: ((x + CITY_MINIMAP_HALF_SIZE) / (CITY_MINIMAP_HALF_SIZE * 2)) * this.baseSize,
      y: ((CITY_MINIMAP_HALF_SIZE - z) / (CITY_MINIMAP_HALF_SIZE * 2)) * this.baseSize,
    };
  }
}
