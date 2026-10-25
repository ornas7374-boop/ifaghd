import { LESSONS_1 } from './lessons1';
import { LESSONS_2 } from './lessons2';
import { SECTIONS, type Lesson } from './types';

export const LESSONS: Lesson[] = [...LESSONS_1, ...LESSONS_2];
export const LESSON_IDS = new Set(LESSONS.map((l) => l.id));
export const lessonIndex = (id: string) => LESSONS.findIndex((l) => l.id === id);
export const sectionOf = (l: Lesson) => SECTIONS.find((s) => s.id === l.section)!;
export { SECTIONS };
