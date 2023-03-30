import { GeoCoordinate, RelativeCoordinate } from "./coordinate";
import { CadID, ObjectID, UserID } from "./ids";
import { Material } from "./material";
import { RichText } from "./richText";
import { Transform } from "./transform";
import { Serializable } from "./serializable";

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
  transform: Transform;
  visible: boolean = true;
  locked: boolean = false;
  parent?: ObjectID;
  originalCad?: CadID;
  style: Material;

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
  type: ObjectType.Path;
  segments: RelativeCoordinate[] = [];
  bezier: boolean = false;
  bezierHandles: BezierHandle[] = [];
  width: number = 1;

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
  type: ObjectType.Group;
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
  type: ObjectType.Note;
  owner: UserID;
  body: RichText;

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
  type: ObjectType.Text;
  text: string;
  size: number = 1;

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
  type: ObjectType.Arc;
  radius: number;
  startAngle: number;
  endAngle: number;

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
  type: ObjectType.Circle;
  radius: number;

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
  type: ObjectType.Waypoint;
  geo: GeoCoordinate;
  kind: "generic" | "utility" | "question" | "pedestrian";

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
