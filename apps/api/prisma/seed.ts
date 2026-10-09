import {
  AccountStatus,
  LangVariant,
  PrismaClient,
  Role,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@bosanski.local')
    .toLowerCase()
    .trim();
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
  const displayName = process.env.SEED_ADMIN_NAME || 'Super Admin';

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: Role.SUPER_ADMIN,
      status: AccountStatus.ACTIVE,
      displayName,
    },
    create: {
      email,
      passwordHash,
      displayName,
      role: Role.SUPER_ADMIN,
      status: AccountStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Seed admin: ${admin.email} / ${password}`);

  const beginner = await prisma.category.upsert({
    where: { slug: 'baslangic' },
    update: {},
    create: {
      title: 'Başlangıç',
      slug: 'baslangic',
      description: 'Alfabe, selamlaşma ve temel cümleler',
      sortOrder: 1,
      published: true,
    },
  });

  const daily = await prisma.category.upsert({
    where: { slug: 'gunluk-konusma' },
    update: {},
    create: {
      title: 'Günlük Konuşma',
      slug: 'gunluk-konusma',
      description: 'Kafe, yol, alışveriş ve günlük diyaloglar',
      sortOrder: 2,
      published: true,
    },
  });

  await prisma.lesson.upsert({
    where: { slug: 'selamlasma' },
    update: {},
    create: {
      title: 'Selamlaşma',
      slug: 'selamlasma',
      categoryId: beginner.id,
      authorId: admin.id,
      level: 'A1',
      summary: 'Zdravo, dobar dan ve temel tanışma kalıpları',
      content: `# Selamlaşma

Boşnakça’da en sık kullanılan selamlar:

- **Zdravo** — Merhaba (samimi)
- **Dobar dan** — İyi günler
- **Dobro jutro** — Günaydın
- **Dobro veče** — İyi akşamlar
- **Laku noć** — İyi geceler

## Tanışma

- Kako se zoveš? — Adın ne?
- Zovem se … — Adım …
- Drago mi je. — Memnun oldum.`,
      published: true,
      sortOrder: 1,
    },
  });

  await prisma.lesson.upsert({
    where: { slug: 'kafe-siparisi' },
    update: {},
    create: {
      title: 'Kafede Sipariş',
      slug: 'kafe-siparisi',
      categoryId: daily.id,
      authorId: admin.id,
      level: 'A1',
      summary: 'Kahve siparişi ve hesap isteme',
      content: `# Kafede

- Jednu kafu, molim. — Bir kahve, lütfen.
- Sa mlijekom. — Sütlü.
- Bez šećera. — Şekersiz.
- Račun, molim. — Hesap, lütfen.`,
      published: true,
      sortOrder: 1,
    },
  });

  const words = [
    {
      wordTr: 'merhaba',
      wordTarget: 'zdravo',
      variant: LangVariant.COMMON,
      partOfSpeech: 'ünlem',
      exampleTr: 'Merhaba, nasılsın?',
      exampleTarget: 'Zdravo, kako si?',
    },
    {
      wordTr: 'teşekkürler',
      wordTarget: 'hvala',
      variant: LangVariant.COMMON,
      partOfSpeech: 'ünlem',
      exampleTr: 'Teşekkürler!',
      exampleTarget: 'Hvala!',
    },
    {
      wordTr: 'lütfen',
      wordTarget: 'molim',
      variant: LangVariant.COMMON,
      partOfSpeech: 'ünlem',
      exampleTr: 'Bir kahve, lütfen.',
      exampleTarget: 'Jednu kafu, molim.',
    },
    {
      wordTr: 'su',
      wordTarget: 'voda',
      variant: LangVariant.COMMON,
      partOfSpeech: 'isim',
      exampleTr: 'Su ister misin?',
      exampleTarget: 'Hoćeš li vodu?',
    },
    {
      wordTr: 'ekmek',
      wordTarget: 'hljeb',
      variant: LangVariant.BS,
      partOfSpeech: 'isim',
      notes: 'Hırvatça: kruh, Sırpça: hleb',
      exampleTr: 'Taze ekmek',
      exampleTarget: 'Svježi hljeb',
    },
    {
      wordTr: 'güzel',
      wordTarget: 'lijepo',
      variant: LangVariant.COMMON,
      partOfSpeech: 'sıfat',
      exampleTr: 'Çok güzel!',
      exampleTarget: 'Veoma lijepo!',
    },
  ] as const;

  for (const w of words) {
    const existing = await prisma.dictionaryEntry.findFirst({
      where: { wordTr: w.wordTr, wordTarget: w.wordTarget },
    });
    if (!existing) {
      await prisma.dictionaryEntry.create({
        data: { ...w, authorId: admin.id, published: true },
      });
    }
  }

  const topicCount = await prisma.forumTopic.count();
  if (topicCount === 0) {
    const now = new Date();
    const t1 = await prisma.forumTopic.create({
      data: {
        title: 'Boşnakça mı Sırpça mı öğrenmeliyim?',
        slug: 'bosnakca-mi-sirpca-mi',
        authorId: admin.id,
        entryCount: 2,
        lastEntryAt: now,
      },
    });
    await prisma.forumEntry.createMany({
      data: [
        {
          topicId: t1.id,
          authorId: admin.id,
          body: 'Aynı dil ailesi. Konuşma için ortak kelimelerle başla; farkları sonra öğrenirsin. Platformda COMMON / BS / HR etiketlerine bak.',
          upvotes: 3,
        },
        {
          topicId: t1.id,
          authorId: admin.id,
          body: 'Sarajevo / Mostar tarafı için Boşnakça odaklı gitmek daha doğal geliyor. Yazımda “hljeb” gibi farklar çıkıyor.',
          upvotes: 1,
        },
      ],
    });

    const t2 = await prisma.forumTopic.create({
      data: {
        title: 'günlük 10 kelime challenge',
        slug: 'gunluk-10-kelime',
        authorId: admin.id,
        entryCount: 1,
        lastEntryAt: now,
      },
    });
    await prisma.forumEntry.create({
      data: {
        topicId: t2.id,
        authorId: admin.id,
        body: 'Bugün: zdravo, hvala, molim, voda, hljeb, lijepo, kako si, dobro jutro, laku noć, račun.',
        upvotes: 2,
      },
    });
  }

  const eventCount = await prisma.calendarEvent.count();
  if (eventCount === 0) {
    const in2Days = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    in2Days.setHours(19, 0, 0, 0);
    const end2 = new Date(in2Days.getTime() + 60 * 60 * 1000);

    const in25h = new Date(Date.now() + 25 * 60 * 60 * 1000);
    const end25 = new Date(in25h.getTime() + 45 * 60 * 1000);

    await prisma.calendarEvent.createMany({
      data: [
        {
          title: 'Canlı: Selamlaşma & Tanışma',
          description:
            'A1 canlı ders. Google Meet üzerinden. Önceden “Selamlaşma” dersini oku.',
          startAt: in2Days,
          endAt: end2,
          meetUrl: 'https://meet.google.com/bos-anski-demo',
          level: 'A1',
          capacity: 12,
          published: true,
          teacherId: admin.id,
        },
        {
          title: 'Canlı: Kafede sipariş pratiği',
          description: 'Rol yapma + kelime tekrarı. Meet linki kayıt sonrası görünür.',
          startAt: in25h,
          endAt: end25,
          meetUrl: 'https://meet.google.com/bos-kafe-demo',
          level: 'A1',
          capacity: 10,
          published: true,
          teacherId: admin.id,
        },
      ],
    });
  }

  const planCount = await prisma.plan.count();
  if (planCount === 0) {
    await prisma.plan.createMany({
      data: [
        {
          code: 'monthly',
          name: 'Aylık',
          description: '1 ay canlı ders + içerik erişimi',
          interval: 'MONTHLY',
          durationMonths: 1,
          priceTry: 149900, // kuruş: 1499.00 TL
          discountPercent: 0,
          referralBonusDays: 7,
          sortOrder: 1,
          active: true,
        },
        {
          code: 'quarterly',
          name: '3 Aylık Peşin',
          description: '%15 indirimli 3 ay peşin ödeme',
          interval: 'QUARTERLY',
          durationMonths: 3,
          priceTry: 449700,
          discountPercent: 15,
          referralBonusDays: 14,
          sortOrder: 2,
          active: true,
        },
      ],
    });
  }

  console.log(
    'Seed: kategoriler, dersler, sözlük, forum, takvim ve paketler eklendi',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
