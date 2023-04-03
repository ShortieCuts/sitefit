import { GeoCoordinate } from "./coordinate";
import { Object2D } from "./object";
import type { Serializable } from "./serializable";

export type ProjectMapStyle = "google-simple" | "google-satellite";

export type GlobalProjectProperties = {
  origin?: GeoCoordinate;
  mapStyle?: ProjectMapStyle;
};

export type GlobalProjectPropertiesKey = keyof GlobalProjectProperties;

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
      const obj = new Object2D();
      obj.deserialize(object);
      return obj;
    });

    this.objectsMap = new Map();

    this.objects.forEach((object) => {
      this.objectsMap.set(object.id, object);
    });

    this.globalProperties = data.globalProperties ?? {};
  }
}
