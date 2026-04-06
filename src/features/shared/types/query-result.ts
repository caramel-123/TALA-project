export type QueryResult<T> = {
  data: T;
  usingFallback: boolean;
  error: string | null;
};
