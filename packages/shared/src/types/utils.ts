/**
 * Make all properties of T optional recursively
 */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/**
 * Make specific properties nullable
 */
export type Nullable<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: T[P] | null;
};
