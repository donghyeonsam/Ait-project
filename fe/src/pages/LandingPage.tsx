import { ArrowRight, BarChart3, Check, MessageSquareText, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import loginIllustration from '@/assets/images/auth/login-illustration.svg'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'

const landingFeatures = [
  {
    icon: MessageSquareText,
    title: 'AI 모의면접',
    description: '직무와 상황에 맞춘 질문으로 실전처럼 답변하며 면접 감각을 키워보세요.',
  },
  {
    icon: BarChart3,
    title: '상세한 역량 분석',
    description: '답변 기록과 항목별 피드백을 통해 강점과 개선할 부분을 한눈에 확인하세요.',
  },
  {
    icon: Users,
    title: '면접 스터디',
    description: '같은 목표를 가진 사람들과 함께 연습하고 꾸준한 준비 습관을 만들어보세요.',
  },
]

const landingHighlights = [
  '맞춤형 면접 질문',
  '답변별 AI 피드백',
  '성장 기록 관리',
]

export function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background-default text-text-primary">
      <Header />

      <main id="main-content" className="flex-1" aria-label="Ait 랜딩 페이지">
        <section className="overflow-hidden border-b border-border-default bg-surface-default">
          <div className="mx-auto grid max-w-screen-2xl items-center gap-8 px-8 py-10 lg:grid-cols-2">
            <div className="py-8">
              <p className="flex items-center gap-2 text-body-2 font-bold tracking-widest text-action-primary">
                <span className="h-1 w-6 rounded-ait-pill bg-status-achievement" aria-hidden="true" />
                AI INTERVIEW TRAINING
              </p>

              <h1 className="mt-6 text-display text-text-primary">
                면접 준비의 모든 순간을,
                <br />
                Ait와 함께하세요
              </h1>

              <p className="mt-6 max-w-xl text-body-1 text-text-secondary">
                AI 모의면접부터 상세한 피드백, 함께 성장하는 스터디까지.
                <br className="hidden sm:block" />
                실전에 필요한 면접 역량을 한곳에서 준비할 수 있어요.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild>
                  <Link to="/signup">
                    무료로 시작하기
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <a href="#features">서비스 알아보기</a>
                </Button>
              </div>

              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
                {landingHighlights.map((highlight) => (
                  <li key={highlight} className="flex items-center gap-2 text-body-2 text-text-secondary">
                    <span className="flex size-6 items-center justify-center rounded-ait-pill bg-status-achievement-surface text-action-primary">
                      <Check className="size-4" aria-hidden="true" />
                    </span>
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative hidden min-h-full items-center justify-center rounded-ait-l border border-status-achievement-border bg-status-neutral-surface p-8 shadow-elevation-1 lg:flex">
              <span className="absolute right-8 top-8 rounded-ait-pill border border-status-achievement-border bg-status-achievement-surface px-3 py-2 text-caption font-semibold text-action-primary">
                면접 준비도 87%
              </span>
              <img
                src={loginIllustration}
                alt=""
                aria-hidden="true"
                className="mt-8 w-full max-w-xl"
              />
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-[var(--header-height-wide)] py-10">
          <div className="mx-auto max-w-dashboard px-8">
            <div className="text-center">
              <p className="text-body-2 font-bold text-action-primary">AIT CORE EXPERIENCE</p>
              <h2 className="mt-3 text-h1">혼자서도, 함께여도 더 단단한 면접 준비</h2>
              <p className="mt-3 text-body-1 text-text-secondary">
                연습부터 분석과 성장 기록까지 끊김 없이 이어집니다.
              </p>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {landingFeatures.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="rounded-ait-m border border-border-default bg-surface-default p-6 shadow-elevation-1 transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-elevation-2 [transition-duration:var(--duration-fast)] [transition-timing-function:var(--easing-standard)]"
                >
                  <span className="flex size-10 items-center justify-center rounded-ait-m bg-status-achievement-surface text-action-primary">
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-6 text-h3">{title}</h3>
                  <p className="mt-3 text-body-2 text-text-secondary">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-8 pb-10">
          <div className="mx-auto flex max-w-dashboard flex-col items-center justify-between gap-6 rounded-ait-l border border-status-achievement-border bg-status-achievement-surface p-8 text-center shadow-elevation-1 md:flex-row md:text-left">
            <div>
              <h2 className="text-h2">오늘부터 면접 자신감을 만들어보세요</h2>
              <p className="mt-2 text-body-2 text-text-secondary">
                Ait와 함께 나만의 면접 데이터를 쌓고 성장 과정을 확인하세요.
              </p>
            </div>
            <Button asChild className="shrink-0">
              <Link to="/signup">
                회원가입
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
