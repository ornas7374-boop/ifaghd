import { NAV_LINKS } from "@/lib/content";

const LEGAL = ["Legal notice", "Privacy", "Cookies", "Accessibility"];

export function Footer() {
  return (
    <footer className="border-t border-paper/10 bg-ink">
      <div className="mx-auto max-w-[92rem] px-6 py-16 sm:px-10 md:py-20">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          <p className="text-[0.8rem] tracking-[0.5em] text-paper uppercase">
            Bugatti
          </p>

          <div className="flex flex-col gap-10 sm:flex-row sm:gap-20">
            <nav aria-label="Footer">
              <ul className="space-y-4">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="label text-paper/50 transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-paper"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Legal">
              <ul className="space-y-4">
                {LEGAL.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="label text-paper/50 transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-paper"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-paper/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="label text-paper/35">
            © {new Date().getFullYear()} — Molsheim, France
          </p>
          <p className="label text-paper/35">
            A concept showcase. Not affiliated with Bugatti Automobiles S.A.S.
          </p>
        </div>
      </div>
    </footer>
  );
}
