import { customType } from "drizzle-orm/pg-core";

// 384-dim pgvector column. Stored/read as number[]; serialized to the pgvector
// text literal `[a,b,c]` on write. Matches e5-small output width.
export const VECTOR_DIMS = 384;

export const vector384 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return `vector(${VECTOR_DIMS})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return value
      .slice(1, -1)
      .split(",")
      .map((component) => Number(component));
  },
});
