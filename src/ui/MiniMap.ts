import {
  CITY_ROAD_NETWORK,
  CITY_MINIMAP_HALF_SIZE,
  createIslandOutline,
  getNorthernCoastZ,
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
  private mapRotation = 0;

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

  public update(
    x: number,
    z: number,
    heading: number,
    deltaTime: number,
    trackHeading = true
  ): void {
    if (trackHeading) {
      const headingError = Math.atan2(
        Math.sin(heading - this.mapRotation),
        Math.cos(heading - this.mapRotation)
      );
      if (Math.abs(headingError) > 0.015) {
        const response = Math.abs(headingError) > Math.PI / 2 ? 11 : 7;
        this.mapRotation += headingError * (1 - Math.exp(-response * deltaTime));
      }
    }

    this.context.clearRect(0, 0, this.size, this.size);
    const mapCenter = this.worldToMap(x, z);
    mapCenter.x = this.baseSize - mapCenter.x;
    const sourceSize = (this.viewRadius / CITY_MINIMAP_HALF_SIZE) * this.baseSize;
    this.context.save();
    this.context.translate(this.size / 2, this.size / 2);
    this.context.rotate(this.mapRotation);
    this.context.drawImage(
      this.baseCanvas,
      mapCenter.x - sourceSize / 2,
      mapCenter.y - sourceSize / 2,
      sourceSize,
      sourceSize,
      -this.size / 2,
      -this.size / 2,
      this.size,
      this.size
    );
    this.context.restore();
    const ctx = this.context;

    // Keep the promenade destination visible even when it falls outside the
    // minimap's zoomed-in crop. The whole map rotates, so rotate this bearing too.
    const targetX = 0;
    const targetZ = getNorthernCoastZ(0) + 10;
    const zoom = this.size / this.viewRadius;
    const mapDx = -(targetX - x) * zoom;
    const mapDy = -(targetZ - z) * zoom;
    const cos = Math.cos(this.mapRotation);
    const sin = Math.sin(this.mapRotation);
    const bearingX = mapDx * cos - mapDy * sin;
    const bearingY = mapDx * sin + mapDy * cos;
    const bearingLength = Math.hypot(bearingX, bearingY);
    const markerDistance = Math.min(bearingLength, this.size * 0.39);
    const markerX = bearingLength > 0 ? (bearingX / bearingLength) * markerDistance : 0;
    const markerY = bearingLength > 0 ? (bearingY / bearingLength) * markerDistance : -markerDistance;

    if (Math.hypot(targetX - x, targetZ - z) > 48) {
      ctx.save();
      ctx.translate(this.size / 2, this.size / 2);
      // Arrow points from the player toward the destination badge.
      const angle = Math.atan2(markerY, markerX);
      ctx.translate(markerX, markerY);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillStyle = '#f3e7c9';
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(-6, -5);
      ctx.lineTo(6, -5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(this.size / 2 + markerX, this.size / 2 + markerY);
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#087f8c';
      ctx.fill();
      ctx.strokeStyle = '#f3e7c9';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('M', 0, 0.5);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.size / 2, this.size / 2);
    // Keep the marker pointed upward while the entire map turns underneath.
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
    ctx.strokeStyle = '#292d30';
    ctx.lineWidth = this.worldLengthToMap(22);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let x = -228; x <= 228; x += 4) {
      const z = getNorthernCoastZ(x) - 42;
      const mapped = this.worldToMap(x, z);
      if (x === -228) ctx.moveTo(mapped.x, mapped.y);
      else ctx.lineTo(mapped.x, mapped.y);
    }
    ctx.stroke();
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
