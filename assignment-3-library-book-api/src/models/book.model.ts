// The Book model: the shape of every book stored by the API
export interface Book {
  id: number;
  title: string;
  author: string;
  genre: string;
  available: boolean; // true = on the shelf, false = borrowed
}
