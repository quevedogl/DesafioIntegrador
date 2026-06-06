import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-orange-500 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <span className="text-2xl font-black tracking-tight">LogiFlow</span>
          <span className="text-orange-200 text-sm font-medium">Analytics</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-black text-gray-800 mb-3">
          Bem-vindo ao{" "}
          <span className="text-orange-500">LogiFlow Analytics</span>
        </h1>
        <p className="text-gray-500 mb-12 max-w-xl">
          Plataforma de gestão inteligente para distribuidoras de materiais de
          construção.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <ModuleCard
            href="/clientes"
            title="Clientes"
            description="Cadastre, edite e gerencie a carteira de clientes da LogiFlow."
            icon="👥"
          />
          <ModuleCard
            href="/produtos"
            title="Produtos"
            description="Gerencie o catálogo de produtos, preços e estoque disponível."
            icon="📦"
          />
          <ModuleCard
            href="/pedidos"
            title="Pedidos"
            description="Crie pedidos vinculando clientes e produtos, acompanhe o status."
            icon="🛒"
          />
          <ModuleCard
            href="/dashboard"
            title="Dashboard"
            description="Visualize gráficos de vendas, top clientes, produtos e distribuição geográfica."
            icon="📊"
          />
          <ModuleCard
            href="/estrategia"
            title="Decisão Estratégica"
            description="Classificação de clientes por risco de churn e propensão à compra via Random Forest."
            icon="🧠"
          />
        </div>
      </main>
    </div>
  );
}

function ModuleCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-3 hover:shadow-md hover:ring-2 hover:ring-orange-400 transition-all group"
    >
      <span className="text-3xl">{icon}</span>
      <h2 className="text-lg font-bold text-gray-800 group-hover:text-orange-500 transition-colors">
        {title}
      </h2>
      <p className="text-sm text-gray-500">{description}</p>
    </Link>
  );
}
