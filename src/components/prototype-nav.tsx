import Link from "next/link";

const links = [
  { href: "/", label: "홈" },
  { href: "/dashboard", label: "대시보드" },
  { href: "/workspace", label: "워크스페이스" },
];

export function PrototypeNav() {
  return (
    <nav className="glass-card rounded-full px-3 py-2">
      <ul className="flex flex-wrap items-center gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              className="inline-flex rounded-full px-4 py-2 text-sm font-medium text-foreground transition hover:bg-white/70"
              href={link.href}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
