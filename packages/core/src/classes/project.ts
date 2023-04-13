import { GeoCoordinate } from "./coordinate";
import { ObjectID } from "./ids";
import { makeObject, Object2D } from "./object";
import type { Serializable } from "./serializable";

export type ProjectMapStyle = "google-simple" | "google-satellite";

export type GlobalProjectProperties = {
  /** Origin of the map, in geo coordinates */
  origin?: GeoCoordinate;

  /** Up angle relative to the map */
  heading?: number;

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
}

export class Project implements Serializable {
  id: string;
  globalProperties: GlobalProjectProperties = {};
  objects: Object2D[] = [];

  objectsMap: Map<string, Object2D> = new Map();
  objectsMapChildren: Map<string, Object2D[]> = new Map();

  constructor(id: string) {
    this.id = id;
  }

  serialize() {
    return {
      objects: this.objects.map((object) => object.serialize()),
      globalProperties: this.globalProperties,
    };
  }

  deserialize(data: any) {
    this.objects = data.objects.map((object: any) => {
      const obj = makeObject(object);
      obj.deserialize(object);
      return obj;
    });

    this.objectsMap = new Map();

    this.objectsMapChildren = new Map();

    this.objects.forEach((object) => {
      this.objectsMap.set(object.id, object);

      if (object.parent) {
        let children = this.objectsMapChildren.get(object.parent);
        if (!children) {
          children = [];
          this.objectsMapChildren.set(object.parent, children);
        }
        children.push(object);
      }
    });

    for (let obj of this.objects) {
      obj.computeShape();
    }

    this.globalProperties = data.globalProperties ?? {};
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
            throw new Error("Object already exists");
          }
          const object = makeObject(mutation.data);
          object.deserialize(mutation.data);
          this.objects.push(object);
          this.objectsMap.set(object.id, object);
          if (object.parent) {
            let children = this.objectsMapChildren.get(object.parent);
            if (!children) {
              children = [];
              this.objectsMapChildren.set(object.parent, children);
            }
            children.push(object);
          }
        } else if (mutation.type === "update") {
          const object = this.objectsMap.get(mutation.subject);
          if (!object) {
            throw new Error("Object not found");
          }
          const propertyMutation = mutation.data as PropertyMutation;
          if (propertyMutation.key === "parent") {
            let children = this.objectsMapChildren.get(object.parent);
            if (children) {
              children = children.filter((o) => o.id !== object.id);
              this.objectsMapChildren.set(object.parent, children);
            }
            if (propertyMutation.value) {
              children = this.objectsMapChildren.get(propertyMutation.value);
              if (!children) {
                children = [];
                this.objectsMapChildren.set(propertyMutation.value, children);
              }
              children.push(object);
            }
          }

          object.deserialize({
            [propertyMutation.key]: propertyMutation.value,
          });
        } else if (mutation.type === "delete") {
          const object = this.objectsMap.get(mutation.subject);
          if (!object) {
            throw new Error("Object not found");
          }
          this.objects = this.objects.filter((o) => o.id !== object.id);
          this.objectsMap.delete(object.id);
          if (object.parent) {
            let children = this.objectsMapChildren.get(object.parent);
            if (children) {
              children = children.filter((o) => o.id !== object.id);
              this.objectsMapChildren.set(object.parent, children);
            }
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
