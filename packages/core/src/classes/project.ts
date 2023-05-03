import { GeoCoordinate } from "./coordinate";
import { ObjectID } from "./ids";
import { makeObject, Object2D } from "./object";
import type { Serializable } from "./serializable";
import { Quadtree, Rectangle } from "../../lib/quadtree/index.esm";
import Flatten from "@flatten-js/core";

export type ProjectMapStyle = "google-simple" | "google-satellite";

export type GlobalProjectProperties = {
  mapStyle?: ProjectMapStyle;
};

export type GlobalProjectPropertiesKey = keyof GlobalProjectProperties;

export type PropertyMutation = {
  key: string;
  value: any;
};

export type ProjectMutation = {
  type: "create" | "update" | "delete";
  subject: ObjectID;
  data: Object2D | PropertyMutation;
};

export class ProjectTransaction {
  mutations: ProjectMutation[] = [];

  create(object: Object2D) {
    this.mutations.push({
      type: "create",
      subject: object.id,
      data: object,
    });
  }

  update(id: ObjectID, key: string, value: any) {
    this.mutations.push({
      type: "update",
      subject: id,
      data: {
        key,
        value,
      },
    });
  }

  delete(id: ObjectID) {
    this.mutations.push({
      type: "delete",
      subject: id,
      data: null,
    });
  }

  translate(object: Object2D, dx: number, dy: number) {
    this.update(object.id, "transform", {
      size: [...object.transform.size],
      position: [
        object.transform.position[0] + dx,
        object.transform.position[1] + dy,
      ],
      rotation: object.transform.rotation,
    });
  }
}

export class Project implements Serializable {
  id: string;
  globalProperties: GlobalProjectProperties = {};
  objects: Object2D[] = [];

  objectsMap: Map<string, Object2D> = new Map();
  objectsMapChildren: Map<string, Object2D[]> = new Map();

  bounds = {
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0,
  };

  quadtree = new Quadtree({
    width: this.bounds.maxX - this.bounds.minX,
    height: this.bounds.maxY - this.bounds.minY,
    x: this.bounds.minX,
    y: this.bounds.minY,
    maxObjects: 10,
    maxLevels: 4,
  });

  enqueuedReconstruction: NodeJS.Timeout | null = null;

  constructor(id: string) {
    this.id = id;
  }

  reconstructQuadtree() {
    let now = Date.now();
    this.bounds = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    };

    let shapes = [];
    for (let obj of this.objects) {
      let shape = obj.makeQuadtreeObject();
      if (shape) {
        shapes.push(shape);
        this.bounds.minX = Math.min(this.bounds.minX, shape.x);
        this.bounds.minY = Math.min(this.bounds.minY, shape.y);
        this.bounds.maxX = Math.max(this.bounds.maxX, shape.x + shape.width);
        this.bounds.maxY = Math.max(this.bounds.maxY, shape.y + shape.height);
      }
    }
    this.quadtree = new Quadtree({
      width: this.bounds.maxX - this.bounds.minX,
      height: this.bounds.maxY - this.bounds.minY,
      x: this.bounds.minX,
      y: this.bounds.minY,

      maxObjects: 10,
      maxLevels: 4,
    });

    for (let shape of shapes) {
      this.quadtree.insert(shape);
    }

    console.log("reconstructQuadtree took ", Date.now() - now, "ms");
  }

  getObjectsWithDescendants(id: ObjectID): Object2D[] {
    let objects = [];
    let queue = [id];
    while (queue.length > 0) {
      let id = queue.shift();
      if (!id) continue;
      let obj = this.objectsMap.get(id);
      if (!obj) continue;
      objects.push(obj);
      let children = this.objectsMapChildren.get(id);
      if (children) queue.push(...children.map((child) => child.id));
    }

    return objects;
  }

  computeBounds(id: ObjectID) {
    let box = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    };

    let objects = this.getObjectsWithDescendants(id);

    for (let obj of objects) {
      if (obj.flatShape) {
        for (let fl of obj.flatShape) {
          if (fl instanceof Flatten.Box) {
            box.maxX = Math.max(box.maxX, fl.xmax);
            box.maxY = Math.max(box.maxY, fl.ymax);
            box.minX = Math.min(box.minX, fl.xmin);
            box.minY = Math.min(box.minY, fl.ymin);
          } else {
            if (fl.box) {
              let bounds = fl.box;
              if (bounds) {
                box.maxX = Math.max(box.maxX, bounds.xmax);
                box.maxY = Math.max(box.maxY, bounds.ymax);
                box.minX = Math.min(box.minX, bounds.xmin);
                box.minY = Math.min(box.minY, bounds.ymin);
              }
            }
          }
        }
      }
    }

    return box;
  }

  computeBoundsMulti(objects: ObjectID[]) {
    let box = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    };

    for (let id of objects) {
      let bounds = this.computeBounds(id);
      box.maxX = Math.max(box.maxX, bounds.maxX);
      box.maxY = Math.max(box.maxY, bounds.maxY);
      box.minX = Math.min(box.minX, bounds.minX);
      box.minY = Math.min(box.minY, bounds.minY);
    }

    return box;
  }

  translateObject(id: ObjectID, dx: number, dy: number): ProjectTransaction {
    let objects = this.getObjectsWithDescendants(id);
    console.log("objects", objects);
    let trans = new ProjectTransaction();

    for (let obj of objects) {
      trans.translate(obj, dx, dy);
    }

    return trans;
  }

  getObjectsInBounds(bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }): Object2D[] {
    let objs = this.quadtree.retrieve(
      new Rectangle<Object2D>({
        x: bounds.minX,
        y: bounds.minY,
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY,
      })
    ) as Rectangle<Object2D>[];

    return objs.map((obj) => obj.data);
  }

  serialize() {
    return {
      objects: this.objects.map((object) => object.serialize()),
      globalProperties: this.globalProperties,
    };
  }

  deserialize(data: any) {
    this.globalProperties = data.globalProperties ?? {};

    this.objects = data.objects.map((object: any) => {
      const obj = makeObject(object);
      obj.deserialize(object);
      return obj;
    });

    this.objectsMap = new Map();

    this.objectsMapChildren = new Map();

    this.objects.forEach((object) => {
      this.updateStructures("create", object);
    });

    for (let obj of this.objects) {
      obj.computeShape();
    }
  }

  updateStructures(
    mode: "create" | "delete" | "update",
    object: Object2D,
    mutation?: PropertyMutation
  ) {
    let needsSpatialUpdate = false;
    if (mode == "create") {
      this.objectsMap.set(object.id, object);
      if (object.parent) {
        let children = this.objectsMapChildren.get(object.parent);
        if (!children) {
          children = [];
          this.objectsMapChildren.set(object.parent, children);
        }
        children.push(object);
      }

      needsSpatialUpdate = true;
    } else if (mode == "delete") {
      this.objectsMap.delete(object.id);
      if (object.parent) {
        let children = this.objectsMapChildren.get(object.parent);
        if (children) {
          children = children.filter((o) => o.id !== object.id);
          this.objectsMapChildren.set(object.parent, children);
        }
      }

      needsSpatialUpdate = true;
    } else if (mode == "update") {
      if (!mutation) return;

      if (mutation.key === "parent") {
        let children = this.objectsMapChildren.get(object.parent);
        if (children) {
          children = children.filter((o) => o.id !== object.id);
          this.objectsMapChildren.set(object.parent, children);
        }
        if (mutation.value) {
          children = this.objectsMapChildren.get(mutation.value);
          if (!children) {
            children = [];
            this.objectsMapChildren.set(mutation.value, children);
          }
          children.push(object);
        }
      } else if (
        mutation.key === "transform" ||
        mutation.key === "segments" ||
        mutation.key === "radius" ||
        mutation.key === "startAngle" ||
        mutation.key === "endAngle" ||
        mutation.key == "text" ||
        mutation.key == "text"
      ) {
        needsSpatialUpdate = true;
      }
    }

    if (needsSpatialUpdate) {
      if (this.enqueuedReconstruction) {
        clearTimeout(this.enqueuedReconstruction);
      }
      this.enqueuedReconstruction = setTimeout(() => {
        this.reconstructQuadtree();
      }, 10);
    }
  }

  applyTransaction(
    transaction: ProjectTransaction,
    generateUndo = true
  ): ProjectMutation[] {
    let appliedMutations: ProjectMutation[] = [];
    for (const mutation of transaction.mutations) {
      try {
        if (mutation.type === "create") {
          if (this.objectsMap.has(mutation.subject)) {
            // throw new Error("Object already exists");
          } else {
            const object = makeObject(mutation.data);
            object.deserialize(mutation.data);
            this.objects.push(object);
            this.updateStructures("create", object);
          }
        } else if (mutation.type === "update") {
          const object = this.objectsMap.get(mutation.subject);
          if (!object) {
            // throw new Error("Object not found");
          } else {
            const propertyMutation = mutation.data as PropertyMutation;

            this.updateStructures("update", object, propertyMutation);

            object.deserialize({
              [propertyMutation.key]: propertyMutation.value,
            });
          }
        } else if (mutation.type === "delete") {
          const object = this.objectsMap.get(mutation.subject);
          if (!object) {
            // throw new Error("Object not found");
          } else {
            this.objects = this.objects.filter((o) => o.id !== object.id);

            this.updateStructures("delete", object);
          }
        }

        appliedMutations.push(mutation);
      } catch (e) {
        console.error(e);
      }
    }

    for (let mut of appliedMutations) {
      let obj = this.objectsMap.get(mut.subject);
      if (obj) {
        obj.computeShape();
      }
    }

    return appliedMutations;
  }

  computeInverseTransaction(
    transaction: ProjectTransaction,
    generateUndo = true
  ): ProjectTransaction {
    let reverseTransaction = this.createTransaction();
    for (const mutation of transaction.mutations) {
      try {
        if (mutation.type === "create") {
          reverseTransaction.delete(mutation.subject);
        } else if (mutation.type === "update") {
          const object = this.objectsMap.get(mutation.subject);
          if (!object) {
            throw new Error("Object not found");
          }
          const propertyMutation = mutation.data as PropertyMutation;
          reverseTransaction.update(
            mutation.subject,
            propertyMutation.key,
            structuredClone(object[propertyMutation.key])
          );
        } else if (mutation.type === "delete") {
          const object = this.objectsMap.get(mutation.subject);
          if (!object) {
            throw new Error("Object not found");
          }
          let duplicatedObject = makeObject(object);
          duplicatedObject.deserialize(object.serialize());
          reverseTransaction.create(duplicatedObject);
        }
      } catch (e) {
        console.error(e);
      }
    }

    return reverseTransaction;
  }

  createTransaction(): ProjectTransaction {
    return new ProjectTransaction();
  }
}
