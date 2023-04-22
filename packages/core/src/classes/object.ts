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
}

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

  quadtreeObject: Rectangle | null = null;

  flatShape: Object2DShape[] | null = null;

  computeShape(): void {
    return null;
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

    return new Rectangle<Object2D>({
      data: this,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    });
  }

  getMatrix(): Flatten.Matrix {
    return matrix(1, 0, 0, 1, 0, 0)
      .translate(this.transform.position[0], this.transform.position[1])
      .rotate(this.transform.rotation)
      .scale(this.transform.size[0], this.transform.size[1]);
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
    }
    if ("visible" in data) this.visible = data.visible;
    if ("locked" in data) this.locked = data.locked;
    if ("parent" in data) this.parent = data.parent;
    if ("originalCad" in data) this.originalCad = data.originalCad;
    if ("style" in data) this.style = data.style;
    if ("order" in data) this.order = data.order;
  }
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

  computeShape() {
    const m = this.getMatrix();
    let segs = [];
    let points: Flatten.Point[] = [];

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
    this.flatShape = segs;
  }

  serialize() {
    return {
      ...super.serialize(),
      segments: this.segments.map((s) => [...s]),
      bezier: this.bezier,
      bezierHandles: this.bezierHandles,
      width: this.width,
      closed: this.closed,
    };
  }

  deserialize(data: any) {
    super.deserialize(data);
    if ("segments" in data) this.segments = data.segments;
    if ("bezier" in data) this.bezier = data.bezier;
    if ("bezierHandles" in data) this.bezierHandles = data.bezierHandles;
    if ("width" in data) this.width = data.width;
    if ("closed" in data) this.closed = data.closed;
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

  computeShape() {
    const m = this.getMatrix();
    let min = point(0, 0).transform(m);
    this.flatShape = [
      new Box(min.x, min.y, min.x + this.text.length, min.y + 1),
    ];
  }

  serialize() {
    return {
      ...super.serialize(),
      text: this.text,
      size: this.size,
    };
  }

  deserialize(data: any) {
    super.deserialize(data);
    if ("text" in data) this.text = data.text;
    if ("size" in data) this.size = data.size;
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
  }
  return obj;
}

export type ObjectProperty = {
  name: string;
  type?:
    | "number"
    | "string"
    | "boolean"
    | "color"
    | "select"
    | "text"
    | "geo"
    | "transform";
  options?: string[];
};

export const ObjectProperties: {
  [key in ObjectType]: ObjectProperty[];
} = {
  [ObjectType.Path]: [
    {
      name: "stroke",
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
      type: "text",
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
      type: "number",
    },
    {
      name: "endAngle",
      type: "number",
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
};
