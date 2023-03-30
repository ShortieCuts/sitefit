export interface Serializable {
  serialize(): any;
  deserialize(data: any): void;
}
