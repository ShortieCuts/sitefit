import { Color } from "./color";

export class Material {
  type?: "color" | "inherit" | "pattern";
  color: Color;
  pattern?: "hatch" | "diamonds";
  accent?: Color;
  filled: boolean;
  strokeWidth?: number;
}
