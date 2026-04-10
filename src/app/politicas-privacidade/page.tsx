import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Política de Privacidade | Agiliza Flow",
  description: "Política de privacidade do Agiliza Flow - CRM de prospecção e vendas automatizado",
}

export default function PoliticasPrivacidade() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-2 text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">
          Política de Privacidade
        </h1>
        <p className="mb-10 text-sm text-[var(--muted-foreground)]">
          Última atualização: 10 de abril de 2026
        </p>

        <div className="space-y-10 text-sm leading-relaxed text-[var(--muted-foreground)]">
          {/* 1 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
              1. Identificação do Controlador de Dados
            </h2>
            <p>
              O <strong className="text-[var(--foreground)]">Agiliza Flow</strong> é uma
              plataforma de CRM de prospecção e vendas automatizado.
            </p>
            <p className="mt-2">
              Para questões relacionadas a esta política ou ao tratamento dos seus dados
              pessoais, entre em contato:
            </p>
            <ul className="mt-2 list-none space-y-1 pl-0">
              <li>
                <strong className="text-[var(--foreground)]">E-mail:</strong>{" "}
                lukhas_noia@hotmail.com
              </li>
              <li>
                <strong className="text-[var(--foreground)]">Telefone:</strong>{" "}
                (24) 99213-6800
              </li>
            </ul>
          </section>

          {/* 2 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
              2. Dados Pessoais Coletados
            </h2>
            <p className="mb-3">
              Coletamos os seguintes tipos de dados pessoais:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-[var(--foreground)]">Dados fornecidos diretamente pelo usuário:</strong>{" "}
                nome completo, endereço de e-mail, número de telefone, dados de empresa e
                quaisquer informações inseridas em formulários dentro da plataforma.
              </li>
              <li>
                <strong className="text-[var(--foreground)]">Dados coletados automaticamente:</strong>{" "}
                endereço IP, tipo de navegador, sistema operacional, páginas visitadas,
                horário de acesso, identificadores de dispositivo e dados de cookies.
              </li>
              <li>
                <strong className="text-[var(--foreground)]">Dados obtidos via plataformas de terceiros:</strong>{" "}
                ao utilizar login social ou integrações com a Meta (Facebook/Instagram),
                podemos receber seu nome, e-mail, foto de perfil e identificador de
                usuário (User ID), conforme as permissões concedidas.
              </li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
              3. Finalidade do Tratamento dos Dados
            </h2>
            <p className="mb-3">Utilizamos seus dados pessoais para as seguintes finalidades:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Fornecer, operar e manter os serviços do Agiliza Flow;</li>
              <li>Gerenciar sua conta e autenticação na plataforma;</li>
              <li>Permitir a gestão de leads, pipeline de vendas e acompanhamento de prospecções;</li>
              <li>Enviar comunicações relacionadas ao serviço, como atualizações e notificações;</li>
              <li>Realizar análises internas para melhoria dos nossos serviços;</li>
              <li>Exibir anúncios personalizados e medir o desempenho de campanhas publicitárias;</li>
              <li>Cumprir obrigações legais e regulatórias.</li>
            </ul>
            <p className="mt-3">
              Não vendemos seus dados pessoais a terceiros em nenhuma circunstância.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
              4. Base Legal para o Tratamento (LGPD)
            </h2>
            <p className="mb-3">
              O tratamento dos seus dados pessoais é realizado com base nas seguintes
              hipóteses legais previstas na Lei Geral de Proteção de Dados (Lei nº 13.709/2018):
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-[var(--foreground)]">Consentimento:</strong>{" "}
                quando você aceita os termos ao se cadastrar ou ao interagir com nossos
                formulários e ferramentas de rastreamento;
              </li>
              <li>
                <strong className="text-[var(--foreground)]">Execução de contrato:</strong>{" "}
                para viabilizar a prestação dos serviços contratados;
              </li>
              <li>
                <strong className="text-[var(--foreground)]">Legítimo interesse:</strong>{" "}
                para melhoria dos serviços, segurança da plataforma e personalização da
                experiência do usuário;
              </li>
              <li>
                <strong className="text-[var(--foreground)]">Obrigação legal:</strong>{" "}
                para cumprimento de exigências legais e regulatórias aplicáveis.
              </li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
              5. Compartilhamento de Dados com Terceiros
            </h2>
            <p className="mb-3">
              Seus dados pessoais poderão ser compartilhados com os seguintes terceiros,
              estritamente para as finalidades descritas nesta política:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-[var(--foreground)]">Meta Platforms, Inc.:</strong>{" "}
                compartilhamos dados como e-mails em formato hash, eventos de conversão
                (visitas, cadastros, compras) e dados de navegação por meio do Meta Pixel
                e/ou Conversions API, para fins de otimização, mensuração e segmentação de
                anúncios no Facebook e Instagram.
              </li>
              <li>
                <strong className="text-[var(--foreground)]">Supabase (provedores de infraestrutura):</strong>{" "}
                para armazenamento e processamento seguro dos dados.
              </li>
              <li>
                <strong className="text-[var(--foreground)]">Prestadores de serviço:</strong>{" "}
                empresas que auxiliam na operação da plataforma, sempre sob obrigações
                contratuais de confidencialidade e proteção de dados.
              </li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
              6. Meta Pixel, Conversions API e Tecnologias de Rastreamento
            </h2>
            <p className="mb-3">
              Utilizamos o <strong className="text-[var(--foreground)]">Meta Pixel</strong> e/ou a{" "}
              <strong className="text-[var(--foreground)]">Conversions API</strong> da Meta
              em nosso site e plataforma. Essas ferramentas coletam automaticamente:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Páginas visitadas e ações realizadas (cliques, envio de formulários, compras);</li>
              <li>Endereço IP e dados do navegador;</li>
              <li>Dados de identificação do dispositivo;</li>
              <li>Informações de referência (de onde o usuário veio).</li>
            </ul>
            <p className="mt-3">
              Esses dados são compartilhados com a Meta para permitir a mensuração de
              resultados das nossas campanhas publicitárias, criação de públicos
              personalizados (Custom Audiences) e públicos semelhantes (Lookalike
              Audiences), além de remarketing — ou seja, exibição de anúncios
              personalizados no Facebook e Instagram com base no seu comportamento em
              nosso site.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
              7. Cookies e Tecnologias Similares
            </h2>
            <p className="mb-3">
              Utilizamos cookies e tecnologias similares para:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Manter sua sessão ativa e lembrar suas preferências;</li>
              <li>Coletar dados analíticos sobre o uso da plataforma;</li>
              <li>Viabilizar o funcionamento do Meta Pixel e de outras ferramentas de rastreamento.</li>
            </ul>
            <p className="mt-3">
              Você pode gerenciar ou desativar cookies nas configurações do seu navegador.
              Note que a desativação de certos cookies pode impactar a funcionalidade da
              plataforma.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
              8. Remarketing e Publicidade Direcionada
            </h2>
            <p>
              Podemos utilizar seus dados para exibir anúncios personalizados no Facebook,
              Instagram e em outros serviços da Meta. Isso inclui o uso de Custom Audiences
              (públicos personalizados a partir de listas de clientes) e Lookalike Audiences
              (públicos semelhantes). Você pode optar por não receber anúncios
              personalizados ajustando suas preferências diretamente na Meta:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>
                <strong className="text-[var(--foreground)]">Preferências de Anúncios da Meta:</strong>{" "}
                <span className="break-all">https://www.facebook.com/adpreferences</span>
              </li>
              <li>
                <strong className="text-[var(--foreground)]">Your Online Choices (Europa/Brasil):</strong>{" "}
                <span className="break-all">https://www.youronlinechoices.com</span>
              </li>
            </ul>
          </section>

          {/* 9 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
              9. Retenção e Exclusão de Dados
            </h2>
            <p>
              Seus dados pessoais serão armazenados pelo tempo necessário para cumprir as
              finalidades descritas nesta política, ou conforme exigido por lei. Dados
              obtidos por meio das APIs da Meta serão excluídos em até 30 dias após a
              solicitação do usuário ou após a desconexão do aplicativo. Você pode solicitar
              a exclusão dos seus dados a qualquer momento entrando em contato conosco pelo
              e-mail indicado na seção 1 desta política.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
              10. Segurança dos Dados
            </h2>
            <p>
              Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados
              pessoais contra acesso não autorizado, destruição, perda, alteração ou
              qualquer forma de tratamento inadequado. Isso inclui o uso de criptografia,
              controles de acesso, monitoramento de sistemas e políticas internas de
              segurança da informação.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
              11. Seus Direitos como Titular dos Dados (LGPD)
            </h2>
            <p className="mb-3">
              De acordo com a LGPD, você tem os seguintes direitos em relação aos seus
              dados pessoais:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Confirmação da existência de tratamento de dados;</li>
              <li>Acesso aos seus dados pessoais;</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos;</li>
              <li>Portabilidade dos dados a outro fornecedor de serviço;</li>
              <li>Eliminação dos dados tratados com base no consentimento;</li>
              <li>Informação sobre o compartilhamento de dados com terceiros;</li>
              <li>Revogação do consentimento a qualquer momento.</li>
            </ul>
            <p className="mt-3">
              Para exercer qualquer um desses direitos, entre em contato pelo e-mail
              indicado na seção 1. Responderemos à sua solicitação em até 15 dias úteis.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
              12. Transferência Internacional de Dados
            </h2>
            <p>
              Seus dados pessoais podem ser transferidos e armazenados em servidores
              localizados fora do Brasil, incluindo os Estados Unidos, onde estão os
              servidores de provedores como Supabase e Meta Platforms. Essas transferências
              são realizadas com base em cláusulas contratuais padrão e demais mecanismos de
              proteção previstos na LGPD, garantindo nível adequado de proteção aos seus
              dados.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
              13. Alterações nesta Política
            </h2>
            <p>
              Reservamo-nos o direito de atualizar esta política de privacidade a qualquer
              momento. Quando realizarmos alterações significativas, atualizaremos a data de
              &quot;última atualização&quot; no topo desta página. Recomendamos que você revise esta
              política periodicamente.
            </p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
              14. Contato
            </h2>
            <p>
              Se você tiver dúvidas, solicitações ou reclamações sobre esta política de
              privacidade ou sobre o tratamento dos seus dados pessoais, entre em contato:
            </p>
            <ul className="mt-3 list-none space-y-1 pl-0">
              <li>
                <strong className="text-[var(--foreground)]">E-mail:</strong>{" "}
                lukhas_noia@hotmail.com
              </li>
              <li>
                <strong className="text-[var(--foreground)]">Telefone:</strong>{" "}
                (24) 99213-6800
              </li>
            </ul>
            <p className="mt-3">
              Caso não fique satisfeito com a resposta, você tem o direito de apresentar
              uma reclamação à Autoridade Nacional de Proteção de Dados (ANPD).
            </p>
          </section>
        </div>

        <div className="mt-16 border-t border-[var(--border)] pt-6 text-center text-xs text-[var(--muted-foreground)]">
          © {new Date().getFullYear()} Agiliza Flow. Todos os direitos reservados.
        </div>
      </div>
    </div>
  )
}
