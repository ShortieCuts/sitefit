import { GeoCoordinate } from "./coordinate";
import { ObjectID } from "./ids";
import { makeObject, Object2D } from "./object";
import type { Serializable } from "./serializable";

export type ProjectMapStyle = "google-simple" | "google-satellite";

export type GlobalProjectProperties = {
  origin?: GeoCoordinate;
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

    this.objects.forEach((object) => {
      this.objectsMap.set(object.id, object);
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
        } else if (mutation.type === "update") {
          const object = this.objectsMap.get(mutation.subject);
          if (!object) {
            throw new Error("Object not found");
          }
          const propertyMutation = mutation.data as PropertyMutation;
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

  createTransaction(): ProjectTransaction {
    return new ProjectTransaction();
  }
}
