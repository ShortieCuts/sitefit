import { GeoCoordinate, RelativeCoordinate } from "./coordinate";
import { CadID, ObjectID, UserID } from "./ids";
import { Material } from "./material";
import { RichText } from "./richText";
import { Transform } from "./transform";
import { Serializable } from "./serializable";

import Flatten from "@flatten-js/core";
import { Rectangle } from "../../lib/quadtree/index.esm";

const {
  Polygon,
  point,
  Circle: FlatCircle,
  Multiline,
  arc,
  matrix,
  Box,
} = Flatten;

export type Object2DShape =
  | Flatten.Line
  | Flatten.Ray
  | Flatten.Circle
  | Flatten.Box
  | Flatten.Segment
  | Flatten.Arc
  | Flatten.Polygon;

export enum ObjectType {
  Path = "path",
  Group = "group",
  Note = "note",
  Text = "text",
  Arc = "arc",
  Circle = "circle",
  Waypoint = "waypoint",
  Cornerstone = "cornerstone",
  SVG = "svg",
}

export type Object2DGuides = {
  segments: Flatten.Segment[];
  points: Flatten.Point[];
  arcs: Flatten.Arc[];
};

export class Object2D implements Serializable {
  id: ObjectID;
  type: ObjectType;
  name?: string;
  transform: Transform = new Transform();
  visible: boolean = true;
  locked: boolean = false;
  parent?: ObjectID;
  originalCad?: CadID;
  style: Material;
  order: number = 0;
  pinned?: boolean;

  quadtreeObject: Rectangle | null = null;

  flatShape: Object2DShape[] | null = null;

  computeShape(): void {
    return null;
  }

  getGuides(): Object2DGuides {
    return { segments: [], points: [], arcs: [] };
  }

  getBounds(): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } {
    this.computeShape();
    if (!this.flatShape) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let shape of this.flatShape) {
      let box: Flatten.Box;
      if (shape instanceof Flatten.Box) {
        box = shape;
      } else {
        box = shape.box;
      }

      if (box.xmin < minX) minX = box.xmin;
      if (box.ymin < minY) minY = box.ymin;
      if (box.xmax > maxX) maxX = box.xmax;
      if (box.ymax > maxY) maxY = box.ymax;
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
    };
  }

  makeQuadtreeObject(): Rectangle<Object2D> | null {
    this.computeShape();
    if (!this.flatShape) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let shape of this.flatShape) {
      let box: Flatten.Box;
      if (shape instanceof Flatten.Box) {
        box = shape;
      } else {
        box = shape.box;
      }

      if (box.xmin < minX) minX = box.xmin;
      if (box.ymin < minY) minY = box.ymin;
      if (box.xmax > maxX) maxX = box.xmax;
      if (box.ymax > maxY) maxY = box.ymax;
    }

    if (
      minX === Infinity ||
      minY === Infinity ||
      maxX === -Infinity ||
      maxY === -Infinity
    ) {
      minX = 0;
      minY = 0;
      maxX = 0;
      maxY = 0;
    }

    return new Rectangle<Object2D>({
      data: this,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    });
  }

  getMatrix(): Flatten.Matrix {
    try {
      return matrix(1, 0, 0, 1, 0, 0)
        .translate(this.transform.position[0], this.transform.position[1])
        .rotate(this.transform.rotation)
        .scale(this.transform.size[0], this.transform.size[1]);
    } catch (e) {
      console.error(e);
      return matrix(1, 0, 0, 1, 0, 0);
    }
  }

  serialize() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      transform: this.transform,
      visible: this.visible,
      locked: this.locked,
      parent: this.parent,
      originalCad: this.originalCad,
      style: this.style,
      order: this.order ?? 0,
      pinned: this.pinned ?? false,
    };
  }

  deserialize(data: any) {
    if ("id" in data) this.id = data.id;
    if ("type" in data) this.type = data.type;
    if ("name" in data) this.name = data.name;
    if ("transform" in data) {
      this.transform = structuredClone(data.transform);
      if (!this.transform) {
        this.transform = new Transform();
      }

      if (invalidNumber(this.transform.position[0]))
        this.transform.position[0] = 0;
      if (invalidNumber(this.transform.position[1]))
        this.transform.position[1] = 0;
      if (invalidNumber(this.transform.rotation)) this.transform.rotation = 0;
      if (invalidNumber(this.transform.size[0])) this.transform.size[0] = 1;
      if (invalidNumber(this.transform.size[1])) this.transform.size[1] = 1;
    }
    if ("visible" in data) this.visible = data.visible;
    if ("locked" in data) this.locked = data.locked;
    if ("parent" in data) this.parent = data.parent;
    if ("originalCad" in data) this.originalCad = data.originalCad;
    if ("style" in data) this.style = data.style;
    if ("order" in data) this.order = data.order;
    if ("pinned" in data) this.pinned = data.pinned;
  }
}

function invalidNumber(n: any) {
  return typeof n !== "number" || isNaN(n) || !isFinite(n);
}

export class BezierHandle {
  A: RelativeCoordinate;
  B: RelativeCoordinate;
}

export class Path extends Object2D implements Serializable {
  type: ObjectType.Path = ObjectType.Path;
  segments: RelativeCoordinate[] = [];
  bezier: boolean = false;
  bezierHandles: BezierHandle[] = [];
  closed: boolean = false;
  width: number = 1;
  measurementFontSize?: number;

  measurement?: boolean = false;

  smartObject?: string;
  smartProperties?: any;

  disconnected?: boolean = false;

  computeShape() {
    try {
      const m = this.getMatrix();
      let segs = [];
      let points: Flatten.Point[] = [];

      if (!this.disconnected) {
        for (let i = 0; i < this.segments.length; i++) {
          if (i == 0) continue;

          let p1 = point(
            this.segments[i - 1][0],
            this.segments[i - 1][1]
          ).transform(m);

          let p2 = point(this.segments[i][0], this.segments[i][1]).transform(m);

          if (i == 1) {
            points.push(p1);
          }

          points.push(p2);
          segs.push(new Flatten.Segment(p1, p2));
        }
      } else {
        if (this.style?.filled) {
          let poly = new Flatten.Polygon();
          for (let i = 0; i < Math.min(this.segments.length, 9); i += 3) {
            let p1 = point(this.segments[i][0], this.segments[i][1]).transform(
              m
            );
            if (i == 0) {
              points.push(p1);
            }

            let p2 = point(
              this.segments[i + 1][0],
              this.segments[i + 1][1]
            ).transform(m);

            let p3 = point(
              this.segments[i + 2][0],
              this.segments[i + 2][1]
            ).transform(m);

            points.push(p1);
            points.push(p2);
            points.push(p3);
            poly.addFace([
              new Flatten.Segment(p1, p2),
              new Flatten.Segment(p2, p3),
              new Flatten.Segment(p3, p1),
            ]);
          }
          segs.push(poly);
        } else {
          for (let i = 0; i < this.segments.length; i += 2) {
            let p1 = point(this.segments[i][0], this.segments[i][1]).transform(
              m
            );

            let p2 = point(
              this.segments[i + 1][0],
              this.segments[i + 1][1]
            ).transform(m);

            points.push(p1);
            points.push(p2);
            segs.push(new Flatten.Segment(p1, p2));
          }
        }
      }

      if (this.closed) {
        let p1 = point(
          this.segments[this.segments.length - 1][0],
          this.segments[this.segments.length - 1][1]
        ).transform(m);

        let p2 = point(this.segments[0][0], this.segments[0][1]).transform(m);

        segs.push(new Flatten.Segment(p1, p2));

        points.push(p2);
      }
      if (this.style && this.style.filled) {
        let poly = new Flatten.Polygon(points);
        segs.push(poly);
      }

      if (this.smartObject) {
        let tempObjs = smartObjectRender(
          this,
          this.smartObject,
          this.smartProperties
        );
        for (let obj of tempObjs) {
          obj.computeShape();
          for (let seg of obj.flatShape) {
            segs.push(seg);
          }
        }
      }
      this.flatShape = segs;
    } catch (e) {
      console.error(e);

      this.flatShape = [];
    }
  }

  getGuides(): Object2DGuides {
    let points = [];
    let segs = [];
    for (let seg of this.flatShape) {
      if (seg instanceof Flatten.Segment) {
        segs.push(seg);
        points.push(seg.start);
        points.push(seg.end);
      }
    }
    return {
      segments: segs,
      points,
      arcs: [],
    };
  }

  serialize() {
    return {
      ...super.serialize(),
      segments: this.segments.map((s) => [...s]),
      bezier: this.bezier,
      bezierHandles: this.bezierHandles,
      width: this.width,
      closed: this.closed,
      measurement: this.measurement,
      measurementFontSize: this.measurementFontSize,
      smartObject: this.smartObject,
      smartProperties: this.smartProperties,
      disconnected: this.disconnected,
    };
  }

  deserialize(data: any) {
    super.deserialize(data);
    if ("segments" in data) this.segments = data.segments;
    if ("bezier" in data) this.bezier = data.bezier;
    if ("bezierHandles" in data) this.bezierHandles = data.bezierHandles;
    if ("width" in data) this.width = data.width;
    if ("closed" in data) this.closed = data.closed;
    if ("measurement" in data) this.measurement = data.measurement;
    if ("measurementFontSize" in data)
      this.measurementFontSize = data.measurementFontSize;
    if ("smartObject" in data) this.smartObject = data.smartObject;
    if ("smartProperties" in data) this.smartProperties = data.smartProperties;
    if ("disconnected" in data) this.disconnected = data.disconnected;
  }
}

export class Group extends Object2D implements Serializable {
  type: ObjectType.Group = ObjectType.Group;
  iconKind: "cad" | "folder" | "file" | "map" | "layer";

  serialize() {
    return {
      ...super.serialize(),
      iconKind: this.iconKind,
    };
  }

  deserialize(data: any) {
    super.deserialize(data);
    if ("iconKind" in data) this.iconKind = data.iconKind;
  }
}

export class SVG extends Object2D implements Serializable {
  type: ObjectType.SVG = ObjectType.SVG;
  svg: string;
  sourceWidth: number;
  sourceHeight: number;

  computeShape() {
    const m = this.getMatrix();
    let segs = [];

    let topLeft = point(0, 0).transform(m);
    let topRight = point(this.sourceWidth, 0).transform(m);
    let bottomLeft = point(0, this.sourceHeight).transform(m);
    let bottomRight = point(this.sourceWidth, this.sourceHeight).transform(m);

    let poly = new Flatten.Polygon([
      topLeft,
      topRight,
      bottomRight,
      bottomLeft,
    ]);
    segs.push(poly);
    this.flatShape = segs;
  }

  serialize() {
    return {
      ...super.serialize(),
      svg: this.svg,
      sourceWidth: this.sourceWidth,
      sourceHeight: this.sourceHeight,
    };
  }

  deserialize(data: any) {
    super.deserialize(data);
    if ("svg" in data) this.svg = data.svg;
    if ("sourceWidth" in data) this.sourceWidth = data.sourceWidth;
    if ("sourceHeight" in data) this.sourceHeight = data.sourceHeight;
  }
}

export class Note extends Object2D implements Serializable {
  type: ObjectType.Note = ObjectType.Note;
  owner: UserID;
  body: RichText;

  computeShape() {
    const m = this.getMatrix();

    let min = point(0, 0).transform(m);
    this.flatShape = [new Box(min.x, min.y, min.x + 1, min.y + 1)];
  }

  serialize() {
    return {
      ...super.serialize(),
      owner: this.owner,
      body: this.body,
    };
  }

  deserialize(data: any) {
    super.deserialize(data);
    if ("owner" in data) this.owner = data.owner;
    if ("body" in data) this.body = data.body;
  }
}

export class Text extends Object2D implements Serializable {
  type: ObjectType.Text = ObjectType.Text;
  text: string;
  size: number = 1;
  maxWidth: number = 0;

  computeShape() {
    const fontRatio = 0.6002113885585942; // Calculated by dividing the monospace font height by a single character width
    const m = this.getMatrix();
    let width = this.text.length * fontRatio * this.size;
    let height = this.size;

    if (this.maxWidth > 0) {
      height = Math.ceil(width / this.maxWidth) * this.size;
      width = Math.min(width, this.maxWidth);
    } else {
      let lines = this.text.split("\n");
      let longest = 0;
      for (let line of lines) {
        if (line.length > longest) longest = line.length;
      }

      width = longest * fontRatio * this.size;
      height = lines.length * this.size;
    }
    let topLeft = point(0, 0).transform(m);
    let topRight = point(width, 0).transform(m);
    let bottomLeft = point(0, height).transform(m);
    let bottomRight = point(width, height).transform(m);

    this.flatShape = [
      new Flatten.Polygon([topLeft, topRight, bottomRight, bottomLeft]),
    ];
  }

  serialize() {
    return {
      ...super.serialize(),
      text: this.text,
      size: this.size,
      maxWidth: this.maxWidth ?? 0,
    };
  }

  deserialize(data: any) {
    super.deserialize(data);
    if ("text" in data) this.text = data.text;
    if ("size" in data) this.size = data.size;
    if ("maxWidth" in data) this.maxWidth = data.maxWidth;
    else this.maxWidth = 0;
  }
}

export class Arc extends Object2D implements Serializable {
  type: ObjectType.Arc = ObjectType.Arc;
  radius: number;
  startAngle: number;
  endAngle: number;

  computeShape() {
    const m = this.getMatrix();
    let clockwise = true;

    const twoPi = Math.PI * 2;
    let deltaAngle = this.endAngle - this.startAngle;
    const samePoints = Math.abs(deltaAngle) < Number.EPSILON;

    while (deltaAngle < 0) deltaAngle += twoPi;
    while (deltaAngle > twoPi) deltaAngle -= twoPi;

    if (deltaAngle < Number.EPSILON) {
      if (samePoints) {
        deltaAngle = 0;
      } else {
        deltaAngle = twoPi;
      }
    }

    if (clockwise === true && !samePoints) {
      if (deltaAngle === twoPi) {
        deltaAngle = -twoPi;
      } else {
        deltaAngle = deltaAngle - twoPi;
      }
    }

    this.flatShape = [
      arc(point(0, 0), this.radius, this.startAngle, this.endAngle, true)
        // Swap x and y coordinates
        .rotate(Math.PI / 2, point(0, 0))
        .scale(-1, 1)
        .transform(m),
    ];
  }

  getGuides(): Object2DGuides {
    let points = [];
    let arcs = [];
    for (let arc of this.flatShape) {
      if (arc instanceof Flatten.Arc) {
        arcs.push(arc);
        points.push(arc.start);
        points.push(arc.end);
      }
    }
    return {
      segments: [],
      points: [],
      arcs,
    };
  }

  serialize() {
    return {
      ...super.serialize(),
      radius: this.radius,
      startAngle: this.startAngle,
      endAngle: this.endAngle,
    };
  }

  deserialize(data: any) {
    super.deserialize(data);
    if ("radius" in data) this.radius = data.radius;
    if ("startAngle" in data) this.startAngle = data.startAngle;
    if ("endAngle" in data) this.endAngle = data.endAngle;
  }
}

export class Circle extends Object2D implements Serializable {
  type: ObjectType.Circle = ObjectType.Circle;
  radius: number;

  computeShape() {
    const m = this.getMatrix();
    this.flatShape = [new FlatCircle(point(0, 0).transform(m), this.radius)];
  }

  getGuides(): Object2DGuides {
    let points = [];
    let arcs = [];
    for (let arc of this.flatShape) {
      if (arc instanceof Flatten.Circle) {
        arcs.push(Flatten.arc(arc.pc, arc.r, 0, 2 * Math.PI, true));
        points.push(arc.box.center.clone().translate(arc.r, 0));
        points.push(arc.box.center.clone().translate(-arc.r, 0));
        points.push(arc.box.center.clone().translate(0, arc.r));
        points.push(arc.box.center.clone().translate(0, -arc.r));
      }
    }
    return {
      segments: [],
      points: [],
      arcs,
    };
  }

  serialize() {
    return {
      ...super.serialize(),
      radius: this.radius,
    };
  }

  deserialize(data: any) {
    super.deserialize(data);
    if ("radius" in data) this.radius = data.radius;
  }
}

export class Waypoint extends Object2D implements Serializable {
  type: ObjectType.Waypoint = ObjectType.Waypoint;
  geo: GeoCoordinate;
  kind: "generic" | "utility" | "question" | "pedestrian";

  computeShape() {
    const m = this.getMatrix();
    this.flatShape = [new FlatCircle(point(0, 0).transform(m), 2)];
  }

  serialize() {
    return {
      ...super.serialize(),
      geo: this.geo,
      kind: this.kind,
    };
  }

  deserialize(data: any) {
    super.deserialize(data);
    if ("geo" in data) this.geo = data.geo;
    if ("kind" in data) this.kind = data.kind;
  }
}

export class Cornerstone extends Object2D implements Serializable {
  type: ObjectType.Cornerstone = ObjectType.Cornerstone;
  geo: GeoCoordinate;
  heading: number;

  computeShape() {
    const m = this.getMatrix();
    this.flatShape = [new FlatCircle(point(0, 0).transform(m), 2)];
  }

  serialize() {
    return {
      ...super.serialize(),
      geo: [...this.geo],
      heading: this.heading,
    };
  }

  deserialize(data: any) {
    super.deserialize(data);
    if ("geo" in data) this.geo = data.geo;
    if ("heading" in data) this.heading = data.heading;
  }
}

export function makeObject(data: any) {
  let obj = new Object2D();
  if (data.type == "path") {
    obj = new Path();
  } else if (data.type == "group") {
    obj = new Group();
  } else if (data.type == "note") {
    obj = new Note();
  } else if (data.type == "text") {
    obj = new Text();
  } else if (data.type == "arc") {
    obj = new Arc();
  } else if (data.type == "circle") {
    obj = new Circle();
  } else if (data.type == "waypoint") {
    obj = new Waypoint();
  } else if (data.type == "cornerstone") {
    obj = new Cornerstone();
  } else if (data.type == "svg") {
    obj = new SVG();
  }

  return obj;
}

export type ObjectProperty = {
  name: string;
  displayName?: string;
  type?:
    | "number"
    | "angle"
    | "string"
    | "boolean"
    | "color"
    | "select"
    | "text"
    | "geo"
    | "transform"
    | "meters"
    | "color-toggle";
  options?: string[];
  condition?: (obj: Object2D) => boolean;
  multiplier?: number;
};

export const ObjectProperties: {
  [key in ObjectType]: ObjectProperty[];
} = {
  [ObjectType.Path]: [
    {
      name: "measurementFontSize",
      type: "number",
      condition: (obj: Path) => {
        return !!obj.measurement;
      },
      multiplier: 10,
    },
  ],
  [ObjectType.Group]: [],
  [ObjectType.Note]: [
    {
      name: "owner",
    },
    {
      name: "body",
      type: "text",
    },
  ],
  [ObjectType.Text]: [
    {
      name: "text",
      type: "string",
    },
    {
      name: "size",
      type: "number",
    },
  ],
  [ObjectType.Arc]: [
    {
      name: "radius",
      type: "number",
    },
    {
      name: "startAngle",
      type: "angle",
    },
    {
      name: "endAngle",
      type: "angle",
    },
  ],
  [ObjectType.Circle]: [
    {
      name: "radius",
      type: "number",
    },
  ],
  [ObjectType.Waypoint]: [
    {
      name: "kind",
      type: "select",
      options: ["generic", "utility", "question", "pedestrian"],
    },
  ],
  [ObjectType.Cornerstone]: [
    {
      name: "heading",
      type: "number",
    },
    {
      name: "geo",
      type: "geo",
    },
  ],
  [ObjectType.SVG]: [],
};

export type SmartObject<
  T extends {
    [key: string]: {
      default: any;
      type: ObjectProperty;
    };
  } = any
> = {
  id: string;
  properties: T;
  render: (
    path: Path,
    properties: {
      [key in keyof T]: T[key]["default"];
    }
  ) => Object2D[];
};

function makeSmartObject<
  T extends {
    [key: string]: {
      default: any;
      type: ObjectProperty;
    };
  }
>(obj: SmartObject<T>): SmartObject<T> {
  return obj;
}

function walkPath(
  path: Path,
  step: number,
  fn: (
    position: [number, number],
    normal: [number, number],
    tangent: [number, number]
  ) => void
) {
  let distanceCounter = 0;
  if (path.segments.length <= 1) return;

  let currentSegment = 0;
  while (true) {
    let start = path.segments[currentSegment];
    let end = path.segments[currentSegment + 1];
    let dx = end[0] - start[0];
    let dy = end[1] - start[1];
    let segmentLength = Math.sqrt(dx * dx + dy * dy);

    let t = distanceCounter / segmentLength;
    let normal: [number, number] = [dy, -dx];
    let tangent: [number, number] = [dx, dy];
    fn([start[0] + dx * t, start[1] + dy * t], normal, tangent);
    distanceCounter += step;
    if (distanceCounter > segmentLength) {
      distanceCounter -= segmentLength;
      currentSegment++;
      if (currentSegment >= path.segments.length - 1) break;
      continue;
    }
    if (currentSegment >= path.segments.length - 1) break;
  }
}

const Parking = makeSmartObject({
  id: "parking",
  properties: {
    spacing: {
      default: 2.59, // Meters
      type: {
        name: "spacing",
        type: "meters",
      },
    },
    angle: {
      default: 90, // Degrees
      type: {
        name: "angle",
        type: "number",
      },
    },
    distance: {
      default: 5, // Meters
      displayName: "space length",
      type: {
        name: "distance",
        type: "meters",
      },
    },
    direction: {
      default: 1,
      type: {
        name: "direction",
        type: "number",
      },
    },
    double: {
      default: false,
      type: {
        name: "double",
        type: "boolean",
      },
    },
    rowSpacing: {
      default: 10,
      type: {
        name: "rowSpacing",
        type: "meters",
      },
    },
    showLine: {
      default: true,
      type: {
        name: "showLine",
        type: "boolean",
      },
    },
    showAisleCurb: {
      default: true,
      type: {
        name: "showAisleCurb",
        type: "boolean",
      },
    },
    curbDistance: {
      default: 10,
      type: {
        name: "curbDistance",
        type: "meters",
      },
    },
  },
  render(path: Path, props) {
    let objs: Path[] = [];

    let spacing = props.spacing;
    let angle = props.angle;
    let distance = props.distance;
    let direction = props.direction ?? 1;
    let showAisleCurb = props.showAisleCurb ?? true;

    let x = 0;
    let y = 0;

    const DEG2RAD = Math.PI / 180;

    const generateOnPath = (p: Path, flip = false) => {
      let i = 0;
      let matrix = p.getMatrix();
      walkPath(p, spacing, ([x, y], normal, tangent) => {
        i++;
        let obj = new Path();
        obj.id = `${p.id}-parking-${i}`;
        obj.name = `Parking Line ${i}`;
        let normalAngle = Math.atan2(tangent[1], tangent[0]);
        let applyAngle = angle;
        if (flip) {
          applyAngle = -applyAngle;
        }
        let dx =
          Math.cos(normalAngle + applyAngle * DEG2RAD) * distance * direction;
        let dy =
          Math.sin(normalAngle + applyAngle * DEG2RAD) * distance * direction;
        obj.segments = [
          matrix.transform([x, y]),
          matrix.transform([x + dx, y + dy]),
        ];

        obj.style = new Material();
        obj.style.strokeWidth = path.style.strokeWidth;
        obj.style.color = [...p.style.color];

        objs.push(obj);
      });
    };

    generateOnPath(path);

    if (props.showLine) {
      let p = new Path();
      p.id = `${path.id}-parking-line`;
      p.name = `${path.name} (Line)`;
      p.segments = path.segments.map((s) => [...s]);
      p.style = new Material();
      p.style.strokeWidth = path.style.strokeWidth;
      p.style.color = [...path.style.color];
      p.transform.position = [...path.transform.position];
      p.transform.rotation = path.transform.rotation;
      p.transform.size = [...path.transform.size];

      objs.push(p);
    }

    if (props.double) {
      let p = new Path();
      p.id = `${path.id}-parking-double`;
      p.name = `${path.name} (Double)`;
      p.segments = path.segments.map((s) => [...s]);
      p.style = new Material();
      p.style.color = [...path.style.color];
      p.style.strokeWidth = path.style.strokeWidth;
      p.transform.position = [...path.transform.position];
      p.transform.rotation = path.transform.rotation;
      p.transform.size = [...path.transform.size];

      let newSegments: [number, number][] = [];

      let gap = props.rowSpacing;
      for (let i = 1; i < p.segments.length; i++) {
        let [x1, y1] = p.segments[i - 1];
        let [x2, y2] = p.segments[i];
        let dx = x2 - x1;
        let dy = y2 - y1;
        let length = Math.sqrt(dx * dx + dy * dy);
        let normalAngle = Math.atan2(dy, dx);
        let normal: [number, number] = [
          Math.cos(normalAngle),
          Math.sin(normalAngle),
        ];
        let tangent: [number, number] = [
          Math.cos(normalAngle + Math.PI / 2),
          Math.sin(normalAngle + Math.PI / 2),
        ];

        newSegments.push([x1 + tangent[0] * gap, y1 + tangent[1] * gap]);
        newSegments.push([x2 + tangent[0] * gap, y2 + tangent[1] * gap]);
      }

      p.segments = newSegments;

      generateOnPath(p, true);
      if (props.showLine) {
        objs.push(p);
      }
    } else {
      if (props.showAisleCurb) {
        let p = new Path();
        p.id = `${path.id}-parking-aisle`;
        p.name = `${path.name} (Aisle)`;
        p.segments = path.segments.map((s) => [...s]);
        p.style = new Material();
        p.style.strokeWidth = path.style.strokeWidth;
        p.style.color = [...path.style.color];
        p.transform.position = [...path.transform.position];
        p.transform.rotation = path.transform.rotation;
        p.transform.size = [...path.transform.size];

        let newSegments: [number, number][] = [];

        let gap = props.curbDistance;
        for (let i = 1; i < p.segments.length; i++) {
          let [x1, y1] = p.segments[i - 1];
          let [x2, y2] = p.segments[i];
          let dx = x2 - x1;
          let dy = y2 - y1;
          let length = Math.sqrt(dx * dx + dy * dy);
          let normalAngle = Math.atan2(dy, dx);
          let normal: [number, number] = [
            Math.cos(normalAngle),
            Math.sin(normalAngle),
          ];
          let tangent: [number, number] = [
            Math.cos(normalAngle + Math.PI / 2),
            Math.sin(normalAngle + Math.PI / 2),
          ];

          newSegments.push([x1 + tangent[0] * gap, y1 + tangent[1] * gap]);
          newSegments.push([x2 + tangent[0] * gap, y2 + tangent[1] * gap]);
        }

        p.segments = newSegments;

        objs.push(p);
      }
    }

    return objs;
  },
});

type Matrix = [[number, number], [number, number]];

export function makeRotationMatrix(angle: number): Matrix {
  let c = Math.cos(angle);
  let s = Math.sin(angle);
  return [
    [c, -s],
    [s, c],
  ];
}

export function multiplyMatrix(
  point: [number, number],
  matrix: Matrix
): [number, number] {
  return [
    matrix[0][0] * point[0] + matrix[0][1] * point[1],
    matrix[1][0] * point[0] + matrix[1][1] * point[1],
  ];
}

export function addPoints(
  a: [number, number],
  b: [number, number]
): [number, number] {
  return [a[0] + b[0], a[1] + b[1]];
}

const SmartRectangle = makeSmartObject({
  id: "rectangle",
  properties: {},
  render: (path, props) => {
    let objs: Path[] = [];

    let x1 = path.segments[0][0];
    let y1 = path.segments[0][1];

    let x2 = path.segments[path.segments.length - 1][0];
    let y2 = path.segments[path.segments.length - 1][1];

    let minX = Math.min(x1, x2);
    let minY = Math.min(y1, y2);
    let maxX = Math.max(x1, x2);
    let maxY = Math.max(y1, y2);

    let translate = path.transform.position;
    let angle = path.transform.rotation;

    let matrix = makeRotationMatrix(angle);

    let obj = new Path();
    obj.id = `${path.id}-rectangle`;
    obj.name = `${path.name} (Rectangle)`;
    obj.segments = [
      addPoints(translate, multiplyMatrix([minX, minY], matrix)),
      addPoints(translate, multiplyMatrix([maxX, minY], matrix)),
      addPoints(translate, multiplyMatrix([maxX, maxY], matrix)),
      addPoints(translate, multiplyMatrix([minX, maxY], matrix)),
    ];
    obj.style = new Material();
    obj.style.color = [...path.style.color];
    obj.closed = true;

    objs.push(obj);

    return objs;
  },
});

const SmartCircle = makeSmartObject({
  id: "circle",
  properties: {},
  render: (path, props) => {
    let objs: Circle[] = [];

    let x1 = path.segments[0][0];
    let y1 = path.segments[0][1];

    let x2 = path.segments[path.segments.length - 1][0];
    let y2 = path.segments[path.segments.length - 1][1];

    let translate = path.transform.position;
    let angle = path.transform.rotation;

    let matrix = makeRotationMatrix(angle);

    let realStart = addPoints(translate, multiplyMatrix([x1, y1], matrix));
    let realEnd = addPoints(translate, multiplyMatrix([x2, y2], matrix));

    let obj = new Circle();
    obj.id = `${path.id}-circle`;
    obj.name = `${path.name} (Circle)`;
    let dx = realStart[0] - realEnd[0];
    let dy = realStart[1] - realEnd[1];
    obj.transform.position = [...realStart];
    let radius = Math.sqrt(dx * dx + dy * dy);
    obj.radius = radius;
    obj.style = new Material();
    obj.style.color = [...path.style.color];

    objs.push(obj);

    return objs;
  },
});

const SmartTriangle = makeSmartObject({
  id: "triangle",
  properties: {},
  render: (path, props) => {
    let objs: Path[] = [];

    let x1 = path.segments[0][0];
    let y1 = path.segments[0][1];

    let x2 = path.segments[path.segments.length - 1][0];
    let y2 = path.segments[path.segments.length - 1][1];

    let translate = path.transform.position;
    let angle = path.transform.rotation;

    let matrix = makeRotationMatrix(angle);

    let realStart = addPoints(translate, multiplyMatrix([x1, y1], matrix));
    let realEnd = addPoints(translate, multiplyMatrix([x2, y2], matrix));

    let dx = realStart[0] - realEnd[0];
    let dy = realStart[1] - realEnd[1];

    let normal: [number, number] = [dy, -dx];
    let tangent: [number, number] = [dx, dy];

    let scaleMatrix = [
      [1, 0],
      [0, 1],
    ] as Matrix;

    let obj = new Path();
    obj.id = `${path.id}-triangle`;
    obj.name = `${path.name} (Triangle)`;
    obj.segments = [
      addPoints(realStart, multiplyMatrix(tangent, scaleMatrix)),
      addPoints(realStart, multiplyMatrix(normal, scaleMatrix)),
      addPoints(
        realStart,
        multiplyMatrix([-tangent[0], -tangent[1]], scaleMatrix)
      ),
    ];

    obj.closed = true;
    obj.style = new Material();
    obj.style.color = [...path.style.color];

    objs.push(obj);

    return objs;
  },
});

const SmartPath = makeSmartObject({
  id: "path",
  properties: {
    measureEdges: {
      default: false,
      type: {
        name: "measureEdges",
        type: "boolean",
      },
    },
    measureArea: {
      default: false,
      type: {
        name: "measureArea",
        type: "boolean",
      },
    },
    stroke: {
      type: {
        name: "stroke",
        type: "color-toggle",
      },
      default: {
        value: [0, 0, 0, 1],
        active: true,
      },
      displayName: "Border",
    },
    strokeWidth: {
      type: {
        name: "stroke",
        type: "number",
      },
      displayName: "Border Width",
      default: 1,
    },
    fill: {
      type: {
        name: "fill",
        type: "color-toggle",
      },
      default: {
        value: [0, 0, 0, 1],
        active: false,
      },
    },
  },
  render: (path, props) => {
    let objs: Path[] = [];

    if (props.fill.active) {
      let obj = new Path();
      obj.pinned = path.pinned;
      obj.id = `${path.id}-path-fill`;
      obj.name = `${path.name} (obj)`;
      obj.segments = structuredClone(path.segments);
      obj.transform = structuredClone(path.transform);

      obj.closed = true;
      obj.style = new Material();
      obj.style.filled = true;
      obj.style.color = [...props.fill.value] as [
        number,
        number,
        number,
        number
      ];

      objs.push(obj);
    }

    if (props.stroke.active) {
      let obj = new Path();
      obj.pinned = path.pinned;
      obj.id = `${path.id}-path-stroke`;
      obj.name = `${path.name} (obj)`;
      obj.segments = structuredClone(path.segments);
      obj.transform = structuredClone(path.transform);

      if (props.fill.active) {
        obj.closed = true;
      }

      obj.closed = true;
      obj.style = new Material();
      obj.style.strokeWidth = props.strokeWidth;
      obj.style.color = [...props.stroke.value] as [
        number,
        number,
        number,
        number
      ];

      objs.push(obj);
    }

    if (props.measureArea) {
      let obj = new Path();
      obj.pinned = path.pinned;
      obj.id = `${path.id}-path-area`;
      obj.name = `Area`;
      obj.segments = structuredClone(path.segments);
      obj.transform = structuredClone(path.transform);

      obj.style = new Material();
      obj.style.color = [...path.style.color];
      obj.measurement = true;
      obj.style.filled = true;
      obj.closed = true;

      obj.computeShape();

      objs.push(obj);
    }

    if (props.measureEdges) {
      let isCircle = false;
      let isEllipse = false;
      let isRectangle = false;
      let isSquare = false;
      let isTriangle = false;

      let center: [number, number] = [0, 0];
      let lowestRadiusPoint: [number, number] = [0, 0];
      let highestRadiusPoint: [number, number] = [0, 0];

      let radius = 0;
      let width = 0;
      let height = 0;

      for (let i = 0; i < path.segments.length; i++) {
        center[0] += path.segments[i][0];
        center[1] += path.segments[i][1];
      }

      center[0] /= path.segments.length;
      center[1] /= path.segments.length;

      if (path.segments.length >= 60) {
        // Ellipse or circle

        let lowestRadius = Infinity;
        let highestRadius = -Infinity;

        let totalRadius = 0;
        for (let i = 0; i < path.segments.length; i++) {
          let p1 = path.segments[i];
          let dx = p1[0] - center[0];
          let dy = p1[1] - center[1];
          let iRad = Math.sqrt(dx * dx + dy * dy);
          totalRadius += iRad;

          if (iRad < lowestRadius) {
            lowestRadius = iRad;
            lowestRadiusPoint = p1;
          }

          if (iRad > highestRadius) {
            highestRadius = iRad;
            highestRadiusPoint = p1;
          }
        }
        totalRadius /= path.segments.length;
        radius = totalRadius;

        if (Math.abs(lowestRadius - highestRadius) < 1) {
          isCircle = true;
        } else {
          isEllipse = true;
        }
      } else if (path.segments.length === 4) {
        // Rectangle or square or other quadrilateral

        let p1 = path.segments[0];
        let p2 = path.segments[1];
        let p3 = path.segments[2];
        let p4 = path.segments[3];

        let topDist = Math.sqrt(
          Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2)
        );

        let bottomDist = Math.sqrt(
          Math.pow(p3[0] - p4[0], 2) + Math.pow(p3[1] - p4[1], 2)
        );

        let leftDist = Math.sqrt(
          Math.pow(p1[0] - p4[0], 2) + Math.pow(p1[1] - p4[1], 2)
        );

        let rightDist = Math.sqrt(
          Math.pow(p2[0] - p3[0], 2) + Math.pow(p2[1] - p3[1], 2)
        );

        if (
          topDist === bottomDist &&
          leftDist === rightDist &&
          topDist === leftDist
        ) {
          isSquare = true;
        } else if (topDist === bottomDist && leftDist === rightDist) {
          isRectangle = true;
        }
      } else if (path.segments.length === 3) {
        // Triangle
        isTriangle = true;
      }

      let counter = 0;
      let makeRuler = (from: [number, number], to: [number, number]) => {
        let obj = new Path();
        obj.id = `${path.id}-path-edges-${counter++}`;
        obj.name = `Edges`;
        obj.segments = [from, to];

        obj.style = new Material();
        obj.style.type = "color";
        obj.style.color = [...path.style.color];
        obj.style.filled = false;
        obj.closed = false;
        obj.measurement = true;
        obj.transform = structuredClone(path.transform);

        obj.pinned = path.pinned;

        obj.computeShape();

        objs.push(obj);
      };

      let transform = (p: number[]): [number, number] => {
        return p as [number, number];
      };

      if (isCircle) {
        makeRuler(center, [center[0] + radius, center[1]]);
      } else if (isEllipse) {
        makeRuler(center, lowestRadiusPoint);
        makeRuler(center, highestRadiusPoint);
      } else if (isRectangle) {
        makeRuler(transform(path.segments[0]), transform(path.segments[1]));
        makeRuler(transform(path.segments[1]), transform(path.segments[2]));
      } else if (isSquare) {
        makeRuler(transform(path.segments[0]), transform(path.segments[1]));
      } else if (isTriangle) {
        makeRuler(transform(path.segments[0]), transform(path.segments[1]));
        makeRuler(transform(path.segments[1]), transform(path.segments[2]));
        makeRuler(transform(path.segments[2]), transform(path.segments[0]));
      } else {
        if (path.segments.length < 10) {
          for (let i = 0; i < path.segments.length; i++) {
            let p1 = path.segments[i];
            let p2 = path.segments[(i + 1) % path.segments.length];
            makeRuler(transform(p1), transform(p2));
          }
        }
      }
    }

    return objs;
  },
});

export const smartObjects: SmartObject[] = [
  Parking,
  SmartRectangle,
  SmartCircle,
  SmartTriangle,
  SmartPath,
];
export function getSmartObject(id: string) {
  return smartObjects.find((x) => x.id === id);
}
export function smartObjectRender(path: Path, id: string, props: any) {
  let obj = getSmartObject(id);
  if (!obj) return [];
  props = props || {};
  props = structuredClone(props);
  for (let key in obj.properties) {
    if (typeof props[key] === "undefined")
      props[key] = obj.properties[key].default;
  }
  return obj.render(path, props);
}
export function smartObjectProps(path: Path, id: string, props: any) {
  let obj = getSmartObject(id);
  if (!obj) return {};
  props = structuredClone(props);
  for (let key in obj.properties) {
    if (typeof props[key] === "undefined")
      props[key] = obj.properties[key].default;
  }
  return props;
}
