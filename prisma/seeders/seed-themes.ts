import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const options =
  process.env.NODE_ENV === 'production'
    ? '-c search_path=wordhabit'
    : undefined;

const schema = process.env.NODE_ENV === 'production' ? 'wordhabit' : 'public';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options,
});

const adapter = new PrismaPg(pool, { schema });

const prisma = new PrismaClient({
  adapter,
});

const themesData = [
  {
    name: 'Business & Entrepreneurship',
    slug: 'business-entrepreneurship',
    description:
      'Vocabulary related to startups, leadership, finance, strategy, and entrepreneurship.',
  },
  {
    name: 'Technology & AI',
    slug: 'technology-ai',
    description:
      'Advanced vocabulary around software engineering, artificial intelligence, and innovation.',
  },
  {
    name: 'Psychology & Human Behavior',
    slug: 'psychology-human-behavior',
    description:
      'Words related to cognition, emotions, persuasion, and human behavior.',
  },
  {
    name: 'Philosophy & Critical Thinking',
    slug: 'philosophy-critical-thinking',
    description:
      'Concepts and vocabulary from philosophy, logic, reasoning, and intellectual discourse.',
  },
  {
    name: 'Self-Improvement & Productivity',
    slug: 'self-improvement-productivity',
    description:
      'Vocabulary focused on habits, discipline, focus, growth, and personal development.',
  },
  {
    name: 'Science & Space',
    slug: 'science-space',
    description:
      'Words related to physics, biology, chemistry, astronomy, and scientific exploration.',
  },
  {
    name: 'Health & Wellness',
    slug: 'health-wellness',
    description:
      'Vocabulary around fitness, nutrition, mental health, and well-being.',
  },
  {
    name: 'Travel & Cultures',
    slug: 'travel-cultures',
    description:
      'Words inspired by travel, global cultures, geography, and exploration.',
  },
  {
    name: 'Cinema & Storytelling',
    slug: 'cinema-storytelling',
    description:
      'Vocabulary from films, storytelling, narratives, and creative writing.',
  },
  {
    name: 'Luxury & Lifestyle',
    slug: 'luxury-lifestyle',
    description:
      'Elegant and refined vocabulary related to luxury, aesthetics, and modern lifestyle.',
  },
  {
    name: 'Politics & Geopolitics',
    slug: 'politics-geopolitics',
    description:
      'Vocabulary related to politics, diplomacy, power structures, and world affairs.',
  },
  {
    name: 'Art & Creativity',
    slug: 'art-creativity',
    description:
      'Words connected to artistic expression, design, imagination, and creativity.',
  },
  {
    name: 'Music & Performance',
    slug: 'music-performance',
    description:
      'Vocabulary related to music, instruments, performance, and artistic production.',
  },
  {
    name: 'Sports & Competition',
    slug: 'sports-competition',
    description:
      'Words related to sports, discipline, performance, and competitive mindset.',
  },
  {
    name: 'Nature & Environment',
    slug: 'nature-environment',
    description:
      'Vocabulary inspired by nature, climate, wildlife, and environmental topics.',
  },
  {
    name: 'History & Civilizations',
    slug: 'history-civilizations',
    description:
      'Words rooted in history, empires, civilizations, and historical movements.',
  },
  {
    name: 'Social Media & Internet Culture',
    slug: 'social-media-internet-culture',
    description:
      'Modern vocabulary shaped by online culture, trends, and digital communication.',
  },
  {
    name: 'Relationships & Communication',
    slug: 'relationships-communication',
    description:
      'Vocabulary around interpersonal relationships, communication, and social dynamics.',
  },
  {
    name: 'Finance & Investing',
    slug: 'finance-investing',
    description:
      'Words related to investing, wealth, economics, and financial literacy.',
  },
  {
    name: 'Advanced & Rare Vocabulary',
    slug: 'advanced-rare-vocabulary',
    description:
      'Sophisticated, elegant, and uncommon words for ambitious learners.',
  },
];

async function main() {
  await prisma.theme.createMany({
    data: themesData,
  });
}

void main()
  .then(() => {
    console.log('Themes seeded successfully.');
  })
  .catch((error) => {
    console.error('Error seeding themes:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
