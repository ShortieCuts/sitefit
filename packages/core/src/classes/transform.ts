import { RelativeCoordinate } from "./coordinate";

export class Transform {
  position: RelativeCoordinate;
  rotation: number;
  size: [number, number];

  constructor() {
    this.position = [0, 0];
    this.rotation = 0;
    this.size = [1, 1];
  }
}
