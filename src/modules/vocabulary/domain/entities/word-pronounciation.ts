export interface WordPronunciation {
  id: string;
  wordId: string;
  phonetic: string | null;
  audioUrl: string | null;
  provider: string | null;
  createdAt: Date;
}
