import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});
const themesData = [
  {
    name: 'General',
    slug: 'general',
    description: 'General vocabulary words across various topics.',
  },
  {
    name: 'Technology',
    slug: 'technology',
    description: 'Words related to technology and computing.',
  },
  {
    name: 'Science',
    slug: 'science',
    description: 'Words related to science and mathematics.',
  },
  {
    name: 'Health',
    slug: 'health',
    description: 'Words related to health and well-being.',
  },
  {
    name: 'Sports',
    slug: 'sports',
    description: 'Words related to sports and fitness.',
  },
  {
    name: 'Geography',
    slug: 'geography',
    description: 'Words related to geography and the world.',
  },
  {
    name: 'History',
    slug: 'history',
    description: 'Words related to history and culture.',
  },
  {
    name: 'Art',
    slug: 'art',
    description: 'Words related to art and creativity.',
  },
  {
    name: 'Music',
    slug: 'music',
    description: 'Words related to music and the art of music.',
  },
  {
    name: 'Literature',
    slug: 'literature',
    description: 'Words related to literature and writing.',
  },
  {
    name: 'Philosophy',
    slug: 'philosophy',
    description: 'Words related to philosophy and theories.',
  },
  {
    name: 'Travel',
    slug: 'travel',
    description: 'Words related to travel and the outdoors.',
  },
  {
    name: 'Politics',
    slug: 'politics',
    description: 'Words related to politics and government.',
  },
  {
    name: 'Other',
    slug: 'other',
    description: 'Various words not fitting into any other category.',
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
