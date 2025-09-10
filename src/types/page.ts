export type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export function extractContent<T>(data: T[] | Page<T>): T[] {
  return Array.isArray(data) ? data : data.content ?? [];
}
