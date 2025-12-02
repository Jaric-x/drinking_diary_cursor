export interface Note {
  id: string;
  title: string;
  date: string;
  time: string;
  rating: number; // 1-5
  tags: string[];
  imageUrl: string;
  description: string;
  location?: string;
  price?: number;
}

export enum Tab {
  HOME = 'HOME',
  PROFILE = 'PROFILE',
}

export interface UserStats {
  totalNotes: number;
  totalSpent: number;
  daysActive: number;
}