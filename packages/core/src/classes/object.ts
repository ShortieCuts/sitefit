import { GeoCoordinate, RelativeCoordinate } from "./coordinate";
import { CadID, ObjectID, UserID } from "./ids";
import { Material } from "./material";
import { RichText } from "./richText";
import { Transform } from "./transform";
import { Serializable } from "./serializable";

import Flatten from "@flatten-js/core";
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

  flatShape: Object2DShape[] | null = null;

  computeShape(): void {
    return null;
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
    };
  }

  deserialize(data: any) {
    this.id = data.id;
    this.type = data.type;
    this.name = data.name;
    this.transform = data.transform;
    if (!this.transform) {
      this.transform = new Transform();
    }
    this.visible = data.visible;
    this.locked = data.locked;
    this.parent = data.parent;
    this.originalCad = data.originalCad;
    this.style = data.style;
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
  width: number = 1;

  computeShape() {
    const m = this.getMatrix();
    let segs = [];
    for (let i = 0; i < this.segments.length; i++) {
      if (i == 0) continue;

      let p1 = point(
        this.segments[i - 1][0],
        this.segments[i - 1][1]
      ).transform(m);
      let p2 = point(this.segments[i][0], this.segments[i][1]).transform(m);

      segs.push(new Flatten.Segment(p1, p2));
    }

    this.flatShape = segs;
  }

  serialize() {
    return {
      ...super.serialize(),
      segments: this.segments,
      bezier: this.bezier,
      bezierHandles: this.bezierHandles,
      width: this.width,
    };
  }

  deserialize(data: any) {
    super.deserialize(data);
    this.segments = data.segments;
    this.bezier = data.bezier;
    this.bezierHandles = data.bezierHandles;
    this.width = data.width;
  }
}

export class Group extends Object2D implements Serializable {
  type: ObjectType.Group = ObjectType.Group;
  iconKind: "cad" | "folder" | "file" | "map";

  serialize() {
    return {
      ...super.serialize(),
      iconKind: this.iconKind,
    };
  }

  deserialize(data: any) {
    super.deserialize(data);
    this.iconKind = data.iconKind;
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
    this.owner = data.owner;
    this.body = data.body;
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
    this.text = data.text;
    this.size = data.size;
  }
}

export class Arc extends Object2D implements Serializable {
  type: ObjectType.Arc = ObjectType.Arc;
  radius: number;
  startAngle: number;
  endAngle: number;

  computeShape() {
    const m = this.getMatrix();
    this.flatShape = [
      arc(
        point(0, 0).transform(m),
        this.radius,
        this.startAngle,
        this.endAngle
      ),
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
    this.radius = data.radius;
    this.startAngle = data.startAngle;
    this.endAngle = data.endAngle;
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
    this.radius = data.radius;
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
    this.geo = data.geo;
    this.kind = data.kind;
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
  }
  return obj;
}
