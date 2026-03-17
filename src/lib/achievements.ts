export interface AchievementStats {
  isRegistered: boolean;
  reviews: number;
  comments: number;
  series: number;
  watchedHours: number;
}

export interface UserAchievement {
  id: string;
  title: string;
  description: string;
  image: string;
  progress: number;
  target: number;
  unlocked: boolean;
  ratio: number;
}

export interface UserAchievementGroup {
  id: string;
  title: string;
  achievements: UserAchievement[];
}

interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  image: string;
  target: number;
}

interface AchievementLevelGroupDefinition {
  id: string;
  title: string;
  image: string;
  levels: number[];
  value: (stats: AchievementStats) => number;
  cardTitle: (levelIndex: number) => string;
  cardDescription: (target: number) => string;
}

const LEVEL_LABELS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

function pluralize(value: number, one: string, few: string, many: string): string {
  const abs = Math.abs(value) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

function getLevelLabel(index: number): string {
  return LEVEL_LABELS[index] ?? String(index + 1);
}

const REGISTRATION_ACHIEVEMENT: AchievementDefinition = {
  id: 'registration',
  title: 'Первые шаги',
  description: 'Зарегистрируй аккаунт на сайте',
  image: '/achievements/registration.svg',
  target: 1,
};

const LEVEL_GROUPS: AchievementLevelGroupDefinition[] = [
  {
    id: 'reviews',
    title: 'Критик',
    image: '/achievements/review.svg',
    levels: [1, 10, 50, 100, 500],
    value: (stats) => stats.reviews,
    cardTitle: (index) => `Критик ${getLevelLabel(index)}`,
    cardDescription: (target) => `Напиши ${target} ${pluralize(target, 'рецензию', 'рецензии', 'рецензий')}`,
  },
  {
    id: 'comments',
    title: 'Комментарии',
    image: '/achievements/comments.svg',
    levels: [10, 50, 100, 500, 5000],
    value: (stats) => stats.comments,
    cardTitle: (index) => `Комментатор ${getLevelLabel(index)}`,
    cardDescription: (target) => `Оставь ${target} ${pluralize(target, 'комментарий', 'комментария', 'комментариев')}`,
  },
  {
    id: 'series',
    title: 'Серии',
    image: '/achievements/views.svg',
    levels: [10, 50, 100, 500, 5000],
    value: (stats) => stats.series,
    cardTitle: (index) => `Серии ${getLevelLabel(index)}`,
    cardDescription: (target) => `Посмотри ${target} ${pluralize(target, 'серию', 'серии', 'серий')}`,
  },
  {
    id: 'hours',
    title: 'Марафонец',
    image: '/achievements/hours.svg',
    levels: [250, 500, 1000],
    value: (stats) => stats.watchedHours,
    cardTitle: (index) => `Марафонец ${getLevelLabel(index)}`,
    cardDescription: (target) => `Накопи ${target} ${pluralize(target, 'час', 'часа', 'часов')} просмотра`,
  },
];

function clampProgress(value: number, target: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value >= target) return target;
  return Math.floor(value);
}

function toAchievement(definition: AchievementDefinition, rawValue: number): UserAchievement {
  const progress = clampProgress(rawValue, definition.target);
  const unlocked = rawValue >= definition.target;
  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    image: definition.image,
    progress,
    target: definition.target,
    unlocked,
    ratio: definition.target > 0 ? progress / definition.target : 0,
  };
}

function buildLevelGroup(definition: AchievementLevelGroupDefinition, stats: AchievementStats): UserAchievementGroup {
  const rawValue = definition.value(stats);
  const achievements = definition.levels.map((target, index) =>
    toAchievement(
      {
        id: `${definition.id}-${target}`,
        title: definition.cardTitle(index),
        description: definition.cardDescription(target),
        image: definition.image,
        target,
      },
      rawValue,
    ),
  );

  return {
    id: definition.id,
    title: definition.title,
    achievements,
  };
}

export function buildUserAchievements(stats: AchievementStats): UserAchievementGroup[] {
  const registration = toAchievement(REGISTRATION_ACHIEVEMENT, stats.isRegistered ? 1 : 0);
  const levelGroups = LEVEL_GROUPS.map((group) => buildLevelGroup(group, stats));

  const allWithoutCollector = [registration, ...levelGroups.flatMap((group) => group.achievements)];
  const unlockedCount = allWithoutCollector.filter((item) => item.unlocked).length;

  const collector = toAchievement(
    {
      id: 'collector',
      title: 'Коллекционер',
      description: 'Открой все достижения из остальных групп',
      image: '/achievements/mastery.svg',
      target: allWithoutCollector.length,
    },
    unlockedCount,
  );

  return [
    {
      id: 'registration',
      title: 'Регистрация',
      achievements: [registration],
    },
    ...levelGroups,
    {
      id: 'collector',
      title: 'Коллекционер',
      achievements: [collector],
    },
  ];
}
