// Card frame shared by /login and its sub-screens (SPEC 15), from the prototype's
// .av-auth-wrap / .auth-card. `subtitle` names the screen under the logo.
import type { ReactNode } from "react";
export default function AuthCard({
  subtitle,
  children,
}: {
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark" />
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div className="mono mt-1.5 text-[11px] tracking-[0.16em] text-ink-faint">
            {subtitle}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
