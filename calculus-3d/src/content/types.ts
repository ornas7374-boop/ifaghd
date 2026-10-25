import type { ComponentType } from 'react';

export interface Formula {
  tex: string;
  caption?: string;
}
export interface Sym {
  tex: string;
  meaning: string;
  kind: string; // نوعه / وحدته
}
export interface Example {
  source: string;
  problem: string;
  steps: string[];
  answer: string;
}
export interface Drill {
  q: string;
  a: string;
}
export interface Quiz {
  q: string;
  options: string[];
  correct: number;
  explain: string;
}
export interface Table {
  head: string[];
  rows: string[][];
}

export interface Lesson {
  id: string;
  section: string;
  title: string;
  en: string;
  keywords: string[];
  idea: string;
  formulas: Formula[];
  symbols: Sym[];
  how: string;
  life: string;
  why: string;
  table?: Table;
  example: Example;
  drills?: Drill[];
  mistakes?: string[];
  labHint: string;
  quiz: Quiz;
  lab: ComponentType;
}

export interface Section {
  id: string;
  title: string;
  en: string;
  color: string;
  shape: 'ico' | 'box' | 'oct' | 'cap' | 'cone' | 'torus' | 'knot';
}

export const SECTIONS: Section[] = [
  { id: '1.1', title: 'نظام الأعداد الحقيقية', en: 'The Real Number System', color: '#c9b8ff', shape: 'ico' },
  { id: '1.2', title: 'الخصائص الجبرية والأسس والتحليل', en: 'Algebraic Properties, Exponents & Factoring', color: '#ffb547', shape: 'box' },
  { id: '1.3', title: 'خط الأعداد وخصائص الترتيب', en: 'The Real Line & Order', color: '#5ee6b5', shape: 'oct' },
  { id: '1.4', title: 'الفترات', en: 'Intervals', color: '#ff8a7a', shape: 'cap' },
  { id: '1.5', title: 'حل المتباينات', en: 'Solving Inequalities', color: '#8fd3ff', shape: 'cone' },
  { id: '1.6', title: 'القيمة المطلقة', en: 'Absolute Value', color: '#f5d76e', shape: 'torus' },
  { id: '1.7', title: 'الدوال', en: 'Functions', color: '#4fe0d0', shape: 'knot' },
];
