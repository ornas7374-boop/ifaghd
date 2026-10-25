import { r } from '../lib/text';

export interface PracticeItem {
  n: number;
  q: string;
  a: string;
  lesson: string; // lesson id to revisit
  note?: string;
}

/** Tutorial: Problem-Solving Session (PDF pp. 45–46) with the file's own answers. */
export const TUTORIAL: PracticeItem[] = [
  { n: 1, q: r`صنّف كل عدد (طبيعي، صحيح، نسبي، غير نسبي، حقيقي): $-5,\ 0,\ \frac47,\ \sqrt{16},\ \sqrt7$`, a: r`$-5$: صحيح/نسبي/حقيقي · $0$: صحيح/نسبي/حقيقي · $\frac47$: نسبي · $\sqrt{16}=4$: طبيعي · $\sqrt7$: غير نسبي`, lesson: 'number-sets' },
  { n: 2, q: r`اكتب $\{x:-4\le x<2\}$ بترميز الفترات.`, a: r`$[-4,2)$`, lesson: 'intervals' },
  { n: 3, q: r`اكتب $(-\infty,-3)\cup[1,5]$ كمتباينات.`, a: r`$x<-3$ أو $1\le x\le5$`, lesson: 'intervals' },
  { n: 4, q: r`أوجد $[-2,6)\cap[1,8]$.`, a: r`$[1,6)$`, lesson: 'intervals', note: r`مفتاح الإجابات في الملف كتب $(1,6)$. لكن العدد 1 موجود في المجموعتين: $1\in[-2,6)$ و $1\in[1,8]$، فهو داخل التقاطع، والصحيح $[1,6)$.` },
  { n: 5, q: r`حلّ $4x-7\ge2x+5$.`, a: r`$2x\ge12\Rightarrow x\ge6$`, lesson: 'linear-inequalities' },
  { n: 6, q: r`حلّ $5-3x<14$.`, a: r`$-3x<9\Rightarrow x>-3$ (انقلبت الإشارة)`, lesson: 'linear-inequalities' },
  { n: 7, q: r`حلّ $-2\le3x+1<10$.`, a: r`$-3\le3x<9\Rightarrow-1\le x<3$`, lesson: 'linear-inequalities' },
  { n: 8, q: r`حلّ $x^2-7x+12>0$.`, a: r`$(x-3)(x-4)>0$: $(-\infty,3)\cup(4,\infty)$`, lesson: 'sign-diagram' },
  { n: 9, q: r`حلّ $\frac{x+3}{x-2}\le0$.`, a: r`$[-3,2)$ — 2 مستبعد (صفر المقام)`, lesson: 'sign-diagram' },
  { n: 10, q: r`حلّ $|x-5|\le3$.`, a: r`$[2,8]$`, lesson: 'absolute-value' },
  { n: 11, q: r`حلّ $|2x+1|>5$.`, a: r`$x>2$ أو $x<-3$`, lesson: 'absolute-value' },
  { n: 12, q: r`حلّل $x^3+27$.`, a: r`$(x+3)(x^2-3x+9)$`, lesson: 'factoring' },
  { n: 13, q: r`بسّط $\frac{x^2-16}{x-4}$، $x\ne4$.`, a: r`$x+4,\ x\ne4$`, lesson: 'factoring' },
  { n: 14, q: r`بسّط $\frac{x^4y^{-2}}{x^{-1}y^3}$.`, a: r`$\frac{x^5}{y^5}$`, lesson: 'exponents' },
  { n: 15, q: r`أنطق المقام في $\frac{1}{\sqrt x-3}$.`, a: r`نضرب في المرافق $\frac{\sqrt x+3}{\sqrt x+3}$: $\frac{\sqrt x+3}{x-9}$`, lesson: 'factoring' },
  { n: 16, q: r`إذا $f(x)=3x^2-2x+4$ أوجد $f(-1)$.`, a: r`$9$`, lesson: 'functions' },
  { n: 17, q: r`لـ $f(x)=x^2+1$ بسّط $\frac{f(x+h)-f(x)}{h}$.`, a: r`$2x+h$`, lesson: 'difference-quotient' },
  { n: 18, q: r`أوجد مجال $\frac{2x-1}{x^2-25}$.`, a: r`$\mathbb{R}\setminus\{-5,5\}$`, lesson: 'functions' },
  { n: 19, q: r`أوجد مجال $\sqrt{7-2x}$.`, a: r`$(-\infty,\frac72]$`, lesson: 'functions' },
  { n: 20, q: r`أوجد مجال $\frac{1}{\sqrt{x+4}}$.`, a: r`$(-4,\infty)$`, lesson: 'functions' },
  { n: 21, q: r`أوجد مدى $f(x)=x^2-5$.`, a: r`$[-5,\infty)$`, lesson: 'functions' },
  { n: 22, q: r`هل $f(x)=x^6+2x^2-1$ زوجية أم فردية أم لا هذه ولا تلك؟`, a: 'زوجية', lesson: 'symmetry-monotonic' },
  { n: 23, q: r`هل $g(x)=x^5+3x$ فردية أم زوجية أم لا هذه ولا تلك؟`, a: 'فردية', lesson: 'symmetry-monotonic' },
  { n: 24, q: r`هل $h(x)=x^3+x^2$ لا هذه ولا تلك، أم زوجية، أم فردية؟`, a: 'لا هذه ولا تلك', lesson: 'symmetry-monotonic' },
  { n: 25, q: r`احسب $f(-2),f(0),f(3)$ إذا $f(x)=x+1$ لـ $x<0$ و $x^2$ لـ $x\ge0$.`, a: r`$-1,\ 0,\ 9$`, lesson: 'piecewise' },
  { n: 26, q: r`أوجد أصفار $P(x)=x^3-9x$.`, a: r`$-3,\ 0,\ 3$`, lesson: 'function-catalog' },
  { n: 27, q: r`حدد مجال $R(x)=\frac{x-1}{x^2+x-6}$.`, a: r`$\mathbb{R}\setminus\{-3,2\}$`, lesson: 'functions' },
  { n: 28, q: r`بسّط $\frac{x^2-4}{x+2}$ وحدد المُدخل المستبعد.`, a: r`$x-2,\ x\ne-2$`, lesson: 'factoring' },
  { n: 29, q: r`صنّف $\sqrt{x^2+1}$: كثيرة حدود، كسرية، جذرية/جبرية، أم أسية؟`, a: 'جذرية/جبرية', lesson: 'function-catalog' },
  { n: 30, q: r`لـ $f(x)=\frac{\sqrt{x+1}}{x-2}$ أوجد المجال وكل القيود.`, a: r`$x+1\ge0$ و $x\ne2$: $[-1,2)\cup(2,\infty)$`, lesson: 'functions' },
];

/** Chapter 1 — Review Exercises (PDF pp. 47–48). Answers worked out step by step. */
export const REVIEW: PracticeItem[] = [
  { n: 1, q: r`صنّف (كل المجموعات): $-8,\ 0,\ \frac59,\ \sqrt{25},\ \sqrt{10},\ -1.75,\ \pi,\ \frac72$`, a: r`$-8$ و $0$: صحيح، نسبي، حقيقي · $\frac59$، $-1.75=-\frac74$، $\frac72$: نسبي، حقيقي · $\sqrt{25}=5$: طبيعي، صحيح، نسبي، حقيقي · $\sqrt{10}$ و $\pi$: غير نسبي، حقيقي`, lesson: 'number-sets' },
  { n: 2, q: r`صح أم خطأ: (أ) كل عدد كلي نسبي (ب) $-\sqrt4$ غير نسبي (ج) $0.333\ldots$ نسبي (د) $\sqrt2+\sqrt2$ غير نسبي`, a: r`(أ) صح · (ب) خطأ: $-\sqrt4=-2$ · (ج) صح: $=\frac13$ · (د) صح: $=2\sqrt2$`, lesson: 'number-sets' },
  { n: 3, q: r`مثّل على خط الأعداد: $-\frac73,\ -1,\ 0.8,\ 2,\ \sqrt7$`, a: r`بالترتيب: $-\frac73\approx-2.33$، $-1$، $0.8$، $2$، $\sqrt7\approx2.65$`, lesson: 'real-line-order' },
  { n: 4, q: r`ضع $<,>,=$: (أ) $-4\ \_\ -4.5$ (ب) $\frac56\ \_\ 0.8\overline3$ (ج) $-\sqrt5\ \_\ -2$`, a: r`$>$ · $=$ · $<$`, lesson: 'real-line-order' },
  { n: 5, q: r`اكتب $\{x\mid-4<x\le2\}$ بترميز الفترات ومثّلها.`, a: r`$(-4,2]$`, lesson: 'intervals' },
  { n: 6, q: r`$A=(-5,2]$، $B=[-1,7)$: أوجد $A\cup B$ و $A\cap B$.`, a: r`$A\cup B=(-5,7)$ · $A\cap B=[-1,2]$`, lesson: 'intervals' },
  { n: 7, q: r`حلّ $5x+2\le17$.`, a: r`$x\le3$: $(-\infty,3]$`, lesson: 'linear-inequalities' },
  { n: 8, q: r`حلّ $\frac{2x-1}{3}>x+1$.`, a: r`$2x-1>3x+3\Rightarrow x<-4$`, lesson: 'linear-inequalities' },
  { n: 9, q: r`حلّ $-5<3x-2\le10$.`, a: r`$-1<x\le4$: $(-1,4]$`, lesson: 'linear-inequalities' },
  { n: 10, q: r`حلّ $x^2-5x+6\ge0$ بمخطط الإشارة.`, a: r`$(x-2)(x-3)\ge0$: $(-\infty,2]\cup[3,\infty)$`, lesson: 'sign-diagram' },
  { n: 11, q: r`حلّ $(x-3)(x+1)(x-5)\le0$.`, a: r`$(-\infty,-1]\cup[3,5]$`, lesson: 'sign-diagram' },
  { n: 12, q: r`حلّ $\frac{x}{x+2}\ge1$.`, a: r`$\frac{-2}{x+2}\ge0\Rightarrow x<-2$: $(-\infty,-2)$`, lesson: 'sign-diagram' },
  { n: 13, q: r`حلّ $|x-7|=3$.`, a: r`$x=10$ أو $x=4$`, lesson: 'absolute-value' },
  { n: 14, q: r`حلّ $|4x+3|\le9$ ومثّل الحل.`, a: r`$[-3,\frac32]$`, lesson: 'absolute-value' },
  { n: 15, q: r`حلّ $|2x+1|=|x-4|$.`, a: r`$x=-5$ أو $x=1$`, lesson: 'absolute-value' },
  { n: 16, q: r`قطعة طولها $L$ سم تحقق $|L-12|\le0.05$. اكتبها كمتباينة مزدوجة.`, a: r`$11.95\le L\le12.05$`, lesson: 'absolute-value' },
  { n: 17, q: r`متى يكون $\sqrt{x^2-9}$ عددًا حقيقيًا؟`, a: r`$x^2-9\ge0$: $(-\infty,-3]\cup[3,\infty)$`, lesson: 'sign-diagram' },
  { n: 18, q: r`حلّل $9x^2-25$.`, a: r`$(3x-5)(3x+5)$`, lesson: 'factoring' },
  { n: 19, q: r`بسّط $\frac{x^6}{x^2}\cdot x^{-1}$.`, a: r`$x^3$`, lesson: 'exponents' },
  { n: 20, q: r`أوجد مجال $\frac{\sqrt{x+4}}{x^2-1}$.`, a: r`$[-4,-1)\cup(-1,1)\cup(1,\infty)$`, lesson: 'functions' },
  { n: 21, q: r`هل $f(x)=x^5-4x^3+x$ زوجية أم فردية أم لا هذه ولا تلك؟`, a: 'فردية', lesson: 'symmetry-monotonic' },
  { n: 22, q: r`$f(x)=x^2-x$: بسّط $\frac{f(a+h)-f(a)}{h}$.`, a: r`$2a+h-1$`, lesson: 'difference-quotient' },
  { n: 23, q: r`صنّف: $f(x)=7$، $g(x)=\frac{x}{x+5}$، $h(x)=5^x$`, a: 'ثابتة · كسرية · أسية', lesson: 'function-catalog' },
  { n: 24, q: r`هل $f(x)=-3x+7$ متزايدة أم متناقصة؟ ولماذا؟`, a: r`متناقصة: الميل $-3<0$، فإذا $x_1<x_2$ فإن $-3x_1+7>-3x_2+7$`, lesson: 'symmetry-monotonic' },
];
