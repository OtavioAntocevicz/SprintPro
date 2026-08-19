import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { PublicShell } from '../components/PublicShell'

const features = [
  {
    title: 'Boards Kanban intuitivos',
    description: 'Arraste e solte tarefas entre colunas com interface fluida e responsiva.',
  },
  {
    title: 'Sincronização automática',
    description: 'Atualização periódica do quadro para manter o time alinhado sem recarregar a página.',
  },
  {
    title: 'Gestão de prazos',
    description: 'Defina datas limite e prioridades para manter o foco no que importa.',
  },
  {
    title: 'Permissões por função',
    description: 'Gestor e colaboradores com regras claras de acesso e favoritos controlados.',
  },
  {
    title: 'Convites por link',
    description: 'Convide colaboradores com link seguro — envio por e-mail em breve.',
  },
  {
    title: 'Modo escuro',
    description: 'Interface confortável em ambientes claros ou escuros.',
  },
]

const stats = [
  { value: 'Kanban', label: '3 colunas operacionais' },
  { value: 'Multi', label: 'Quadros por organização' },
  { value: 'PWA', label: 'Instalável no navegador' },
  { value: 'Neon', label: 'PostgreSQL em produção' },
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
    description: 'Gere convites e compartilhe o link com cada colaborador.',
  },
  {
    number: '3',
    title: 'Comece a colaborar',
    description: 'Crie boards, organize tarefas e acompanhe o progresso.',
  },
]

const testimonials = [
  {
    quote: 'Kanban simples e direto — nosso time usa todos os dias sem fricção.',
    name: 'Equipe de operações',
    role: 'MVP SprintPro',
  },
  {
    quote: 'Filtros, favoritos e histórico de concluídas resolvem o dia a dia.',
    name: 'Gestores de projeto',
    role: 'MVP SprintPro',
  },
  {
    quote: 'Deploy na Vercel com API e frontend no mesmo repositório.',
    name: 'Time técnico',
    role: 'MVP SprintPro',
  },
]

const plans = [
  {
    name: 'MVP',
    price: 'Grátis',
    period: '',
    highlight: true,
    items: ['Organização ilimitada no seu workspace', 'Múltiplos quadros Kanban', 'Tarefas, notas e categorias', 'Relatórios e dashboard'],
  },
]

const faqs = [
  {
    question: 'Preciso de cartão de crédito?',
    answer: 'Não. O SprintPro está em fase MVP e pode ser usado gratuitamente.',
  },
  {
    question: 'Como funcionam os convites?',
    answer: 'O gestor gera um convite e compartilha o link manualmente. O envio automático por e-mail será adicionado em breve.',
  },
  {
    question: 'Posso usar em produção?',
    answer: 'Sim. O projeto inclui deploy na Vercel, banco Neon e autenticação JWT.',
  },
  {
    question: 'Há colaboração em tempo real?',
    answer: 'O quadro atualiza automaticamente por polling. WebSockets podem ser adicionados futuramente.',
  },
]

export function LandingPage() {
  return (
    <PublicShell className="bg-[#f3f4f7]">
      <AppHeader />
      <section className="border-b border-slate-200/60 px-4 py-18 text-center">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-800 md:text-6xl">
            Gestão de tarefas que
            <br />
            acelera seu time
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600">
            Organize projetos com Kanban, filtros, relatórios e permissões — MVP pronto para operar seu time.
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
    </PublicShell>
  )
}
