import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Download,
  Github,
  Linkedin,
  Mail,
  MapPin,
  Sparkles,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";

const projects = [
  {
    title: "Atlas Insight Platform",
    description:
      "데이터 시각화와 실시간 협업이 가능한 애널리틱스 플랫폼을 구축하여 고객 만족도를 32% 향상시켰습니다.",
    stack: ["Next.js", "React 19", "Tailwind CSS", "D3.js"],
    link: "https://github.com/neocode24",
  },
  {
    title: "Flow Retail OMS",
    description:
      "AI 기반 수요 예측을 적용한 주문 관리 시스템으로 처리 속도를 2배 개선하고, 장애 대응 시간을 40% 단축했습니다.",
    stack: ["TypeScript", "TanStack Query", "Node.js", "PostgreSQL"],
    link: "https://github.com/neocode24",
  },
  {
    title: "Pulse Design System",
    description:
      "8개 제품 라인에 적용 가능한 UI 컴포넌트 라이브러리를 설계하여 팀 생산성을 27% 향상시켰습니다.",
    stack: ["Storybook", "Radix UI", "Turborepo"],
    link: "https://github.com/neocode24",
  },
];

const skillGroups = [
  {
    label: "Frontend",
    items: ["TypeScript", "React 19", "Next.js", "Tailwind CSS", "Storybook"],
  },
  {
    label: "DX & Tooling",
    items: ["Vite", "Webpack", "Playwright", "Vitest", "ETL 자동화"],
  },
  {
    label: "Product",
    items: ["Design System", "A/B Testing", "Growth Experiment", "Data Viz"],
  },
];

const experiences = [
  {
    company: "스택랩스",
    title: "리드 프론트엔드 엔지니어",
    period: "2023.04 - 현재",
    achievements: [
      "실시간 데이터 스트림 기반 대시보드를 구축하여 주요 고객사의 의사결정 리드타임을 55% 단축",
      "디자인 시스템 Pulse를 도입해 6개 제품의 UI 일관성과 접근성 수준 WCAG AA 달성",
      "CI/CD 파이프라인을 최적화해 배포 시간을 18분에서 6분으로 단축",
    ],
  },
  {
    company: "네오테크",
    title: "시니어 프론트엔드 개발자",
    period: "2019.08 - 2023.03",
    achievements: [
      "전사 상태 관리 표준화를 통해 장애 발생 빈도를 40% 감소",
      "PM, 디자이너와의 협업 프로세스를 정교화해 기능 출시 리드타임 30% 개선",
      "무중단 배포 전략 도입으로 가용성 99.95% 유지",
    ],
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-3xl" />
      <header className="relative mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-8">
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            NeoCode Portfolio
          </span>
          <p className="text-sm text-muted-foreground">
            사람과 기술을 연결하는 프론트엔드 엔지니어
          </p>
        </div>
        <div className="flex items-center gap-4">
          <nav className="hidden gap-6 text-sm font-medium text-muted-foreground md:flex">
            <Link href="#projects" className="transition hover:text-foreground">
              프로젝트
            </Link>
            <Link href="#experience" className="transition hover:text-foreground">
              경력
            </Link>
            <Link href="#skills" className="transition hover:text-foreground">
              기술스택
            </Link>
            <Link href="#contact" className="transition hover:text-foreground">
              연락하기
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-5xl px-6 pb-24">
        <section className="grid gap-12 py-16 sm:grid-cols-[1.2fr_0.8fr] sm:items-center">
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              꾸준히 개선하는 NeoCode 입니다
            </span>
            <div className="space-y-6">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                제품 가치를 빠르게 증명하는 프론트엔드 리더
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                복잡한 데이터를 사용자 친화적인 경험으로 전환하고, 팀이 고속으로 실험할 수 있도록 환경을 설계합니다. 비즈니스 목표와 사용자 문제를 동시에 해결하는 것이 저의 일하는 방식입니다.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="mailto:hello@neocode.dev"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Mail className="h-4 w-4" />
                프로젝트 논의하기
              </a>
              <a
                href="https://github.com/neocode24"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground transition hover:-translate-y-0.5 hover:border-transparent hover:bg-muted"
              >
                <ArrowRight className="h-4 w-4" />
                작업물 살펴보기
              </a>
              <div className="flex items-center gap-2 pl-1 text-muted-foreground">
                <Link
                  href="https://github.com/neocode24"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-border"
                  aria-label="GitHub"
                >
                  <Github className="h-5 w-5" />
                </Link>
                <Link
                  href="https://linkedin.com/in/neocode"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-border"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-5 w-5" />
                </Link>
                <Link
                  href="https://github.com/neocode24/portfolio"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-border"
                  aria-label="이력서 보기"
                >
                  <Download className="h-5 w-5" />
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                서울 · Remote Friendly
              </span>
              <span className="inline-flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                6년 차 / 팀 리딩 경험 3년
              </span>
            </div>
          </div>
          <div className="relative rounded-3xl border border-border/80 bg-card/60 p-8 shadow-2xl backdrop-blur">
            <div className="absolute -top-10 right-6 hidden h-24 w-24 rounded-full bg-primary/30 blur-3xl dark:bg-primary/40 sm:block" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              최근 임팩트
            </h2>
            <div className="mt-6 space-y-6">
              <div className="rounded-2xl border border-border/60 bg-background/60 p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Conversion Rate
                </p>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-3xl font-semibold text-foreground">+32%</span>
                  <span className="text-xs text-muted-foreground">전년 대비</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  사용자 퍼널 리디자인으로 결제 전환율을 크게 개선하며 ARR 18억 원 증가에 기여했습니다.
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/60 p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Deployment Velocity
                </p>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-3xl font-semibold text-foreground">x2.4</span>
                  <span className="text-xs text-muted-foreground">release/week</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  모노레포 전환과 품질 게이트 자동화로 팀의 배포 빈도를 2.4배 높였습니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="projects" className="space-y-10 py-16">
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              대표 프로젝트
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              사용자 리서치와 데이터 분석을 결합해 빠르게 가설을 검증하고, 제품 임팩트를 수치로 증명한 프로젝트들입니다.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {projects.map((project) => (
              <article
                key={project.title}
                className="group flex h-full flex-col rounded-3xl border border-border bg-card/70 p-6 shadow-sm transition hover:-translate-y-2 hover:shadow-xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-xl font-semibold text-foreground">
                    {project.title}
                  </h3>
                  <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:text-primary" />
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {project.description}
                </p>
                <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
                  {project.stack.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-border px-3 py-1"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <Link
                  href={project.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary transition hover:gap-3"
                >
                  자세히 보기
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section id="experience" className="space-y-10 py-16">
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              경험과 임팩트
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              제품 전략 수립부터 실행, 데이터 기반 개선까지 경험하며 다양한 규모의 팀을 리드했습니다.
            </p>
          </div>
          <div className="space-y-6">
            {experiences.map((experience) => (
              <article
                key={experience.company}
                className="rounded-3xl border border-border bg-card/70 p-6 shadow-sm backdrop-blur"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {experience.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{experience.company}</p>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {experience.period}
                  </span>
                </div>
                <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                  {experience.achievements.map((achievement) => (
                    <li key={achievement} className="flex gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-primary/70" />
                      <span>{achievement}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="skills" className="space-y-10 py-16">
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              기술 스택 & 강점
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              사용자 경험과 엔지니어링 품질을 동시에 끌어올리는 도구와 방법론을 지속적으로 실험하고 있습니다.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {skillGroups.map((group) => (
              <div
                key={group.label}
                className="rounded-3xl border border-border bg-card/60 p-6 shadow-sm"
              >
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  {group.label}
                </h3>
                <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {group.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-border px-3 py-1"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          id="contact"
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-12 shadow-xl"
        >
          <div className="absolute -left-12 top-16 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -right-16 -bottom-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative space-y-6">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              함께 새로운 경험을 설계해보고 싶다면
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              문제 정의부터 로드맵 설계, 데이터 기반 실험까지 긴밀하게 협업합니다. 아래 메일로 프로젝트나 채용 관련 문의를 보내주세요.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="mailto:hello@neocode.dev"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Mail className="h-4 w-4" />
                hello@neocode.dev
              </a>
              <a
                href="https://cal.com/neocode"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-6 py-3 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:border-transparent hover:bg-muted"
              >
                미팅 예약하기
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-border/80 bg-background/80 py-8 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-6 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} NeoCode. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="https://github.com/neocode24" target="_blank" rel="noreferrer">
              GitHub
            </Link>
            <Link href="https://linkedin.com/in/neocode" target="_blank" rel="noreferrer">
              LinkedIn
            </Link>
            <Link href="mailto:hello@neocode.dev">Email</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
