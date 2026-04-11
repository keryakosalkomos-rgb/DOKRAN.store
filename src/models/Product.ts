export interface IVariant {
  color: string;
  sizes: {
    size: string;
    quantity: number;
  }[];
}

export interface IProduct {
  id?: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  images: string[];
  category: string; // ID of the category
  isFeatured: boolean;
  serialNumber?: string;
  variants?: IVariant[];
  stock: number; // Total stock calculated from variants
  sizes?: any[]; // Legacy/Global sizes
  colors?: string[]; // Legacy/Global colors
  createdAt?: string;
  updatedAt?: string;
}
