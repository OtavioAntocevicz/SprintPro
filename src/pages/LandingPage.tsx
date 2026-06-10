import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'

const features = [
  {
    title: 'Boards Kanban intuitivos',
    description: 'Arraste e solte tarefas entre colunas com interface fluida e responsiva.',
  },
  {
    title: 'Colaboração em tempo real',
    description: 'Veja as mudanças instantaneamente e trabalhe junto com seu time.',
  },
  {
    title: 'Gestão de prazos',
    description: 'Defina datas limite e prioridades para manter o foco no que importa.',
  },
  {
    title: 'Segurança enterprise',
    description: 'Dados criptografados e controle de acesso por função em cada organização.',
  },
  {
    title: 'Convites simplificados',
    description: 'Adicione colaboradores por e-mail com um clique e acesso seguro.',
  },
  {
    title: 'Interface clara e acessível',
    description: 'Experiência visual consistente para foco total no trabalho.',
  },
]

const stats = [
  { value: '95%', label: 'Aumento de produtividade' },
  { value: '10k+', label: 'Equipes ativas' },
  { value: '99.9%', label: 'Uptime garantido' },
  { value: '8h', label: 'Tempo economizado/semana' },
]

const steps = [
  {
    number: '1',
    title: 'Crie sua organização',
    description: 'Cadastre-se e configure seu workspace em segundos.',
  },
  {
    number: '2',
    title: 'Convide seu time',
    description: 'Adicione colaboradores por e-mail e defina permissões.',
  },
  {
    number: '3',
    title: 'Comece a colaborar',
    description: 'Crie boards, organize tarefas e acompanhe o progresso.',
  },
]

const testimonials = [
  {
    quote: 'SprintPro transformou como nossa equipe trabalha. A interface é limpa e intuitiva.',
    name: 'Maria Costa',
    role: 'CTO, TechCorp',
  },
  {
    quote: 'Finalmente encontramos uma ferramenta que toda a equipe realmente usa diariamente.',
    name: 'João Silva',
    role: 'Product Manager, StartupX',
  },
  {
    quote: 'A colaboração em tempo real é perfeita. Nosso time remoto nunca foi tão produtivo.',
    name: 'Ana Santos',
    role: 'Head of Design, CreativeHub',
  },
]

const plans = [
  { name: 'Starter', price: 'R$ 29', period: '/mês', items: ['Até 5 membros', '3 boards', 'Tarefas ilimitadas', 'Suporte por email'] },
  {
    name: 'Pro',
    price: 'R$ 79',
    period: '/mês',
    highlight: true,
    items: ['Até 20 membros', 'Boards ilimitados', 'Integrações', 'Suporte prioritário'],
  },
  { name: 'Business', price: 'R$ 199', period: '/mês', items: ['Membros ilimitados', 'Tudo do Pro', 'SSO e SAML', 'Suporte 24/7'] },
]

const faqs = [
  {
    question: 'Como funciona o período de teste?',
    answer: 'Oferecemos 14 dias grátis em qualquer plano, sem necessidade de cartão de crédito.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer: 'Sim. Não há contratos de longo prazo. Cancele quando quiser.',
  },
  {
    question: 'Como funciona o sistema de convites?',
    answer: 'Gestores enviam convites por email. Colaboradores acessam por link único e seguro.',
  },
  {
    question: 'Os dados são seguros?',
    answer: 'Sim. Usamos criptografia de ponta a ponta e conformidade com LGPD.',
  },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f3f4f7]">
      <AppHeader />
      <section className="border-b border-slate-200/60 px-4 py-18 text-center">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-800 md:text-6xl">
            Gestão de tarefas que
            <br />
            acelera seu time
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600">
            Organize projetos, colabore em tempo real e aumente a produtividade com o método Kanban mais intuitivo do mercado.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/login?mode=signup"
              className="rounded-lg bg-violet-600 px-6 py-2.5 font-semibold !text-white hover:bg-violet-500"
            >
              Criar conta
            </Link>
            <Link
              to="/login?mode=login"
              className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 font-semibold text-slate-900 hover:bg-slate-50"
            >
              Entrar
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-slate-200/70 px-4 py-10">
        <div className="mx-auto grid w-full max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <article key={stat.label} className="text-center">
              <p className="text-4xl font-bold text-violet-600">{stat.value}</p>
              <p className="mt-2 text-sm text-slate-600">{stat.label}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="recursos" className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-slate-900">Recursos que fazem a diferença</h2>
          <p className="mt-2 text-slate-600">
            Tudo que você precisa para gerenciar projetos com eficiência
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                ✦
              </div>
              <h3 className="font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="bg-slate-200/70 px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-slate-900">Como funciona</h2>
            <p className="mt-2 text-slate-600">Comece em 3 passos simples</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.number} className="text-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 font-semibold text-white">
                  {step.number}
                </span>
                <h3 className="mt-4 text-xl font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-slate-900">O que nossos clientes dizem</h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.name} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-600">"{item.quote}"</p>
              <p className="mt-4 font-semibold text-slate-900">{item.name}</p>
              <p className="text-xs text-slate-500">{item.role}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="planos" className="bg-slate-200/70 px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-slate-900">Planos para todos os tamanhos</h2>
            <p className="mt-2 text-slate-600">Escolha o plano ideal para seu time</p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-2xl border p-5 ${
                  plan.highlight
                    ? 'border-violet-500 bg-violet-600 text-white shadow-lg'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <h3 className={`text-2xl font-bold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                  {plan.name}
                </h3>
                <p className={`mt-2 text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                  {plan.price}
                  <span className={`text-base font-medium ${plan.highlight ? 'text-violet-100' : 'text-slate-500'}`}>
                    {plan.period}
                  </span>
                </p>
                <ul className="mt-4 space-y-2">
                  {plan.items.map((item) => (
                    <li key={item} className={`text-sm ${plan.highlight ? 'text-violet-100' : 'text-slate-600'}`}>
                      ✓ {item}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login?mode=signup"
                  className={`mt-6 block rounded-lg px-4 py-2 text-center font-semibold ${
                    plan.highlight
                      ? 'bg-white text-violet-700'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  Começar
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-4xl font-bold text-slate-900">Perguntas frequentes</h2>
          <div className="mt-6 space-y-4">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="font-semibold text-slate-900">{faq.question}</h3>
                <p className="mt-1 text-sm text-slate-600">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-4 py-8">
        <div className="mx-auto grid w-full max-w-6xl justify-items-center gap-8 text-center text-sm md:grid-cols-2">
          <div className="text-center">
            <p className="font-bold text-slate-900">SprintPro</p>
            <p className="mt-2 text-slate-600">Gestão de tarefas moderna para times de alta performance.</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-900">Contato</p>
            <a
              href="https://www.linkedin.com/in/otavio-antocevicz/"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-slate-600 hover:text-slate-900"
            >
              LinkedIn
            </a>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-6xl border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
          © 2026 SprintPro. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  )
}
