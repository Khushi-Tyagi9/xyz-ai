import Avatar from "../components/Avatar";
import Icon, { type IconName } from "../components/Icon";
import { LANGUAGES } from "../utils/languages";

interface LandingProps {
  onGetStarted: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

const STATS: { value: string; label: string }[] = [
  { value: "4", label: "Personas" },
  { value: "11", label: "Languages" },
  { value: "100%", label: "Role-secured" },
  { value: "2", label: "Voice + Avatar" },
];

const STEPS: { icon: IconName; grad: string; title: string; body: string }[] = [
  {
    icon: "users",
    grad: "var(--grad-student)",
    title: "Sign in with your role",
    body: "Student, Parent, Teacher, or Principal. XYZ AI resolves your role server-side, so it's never guessed from what you type.",
  },
  {
    icon: "messageCircle",
    grad: "var(--grad-parent)",
    title: "Ask anything, in your language",
    body: "Natural conversation by text or voice, in any of 11 languages, with full memory of what you've already asked.",
  },
  {
    icon: "alertTriangle",
    grad: "var(--grad-teacher)",
    title: "Escalate when it matters",
    body: "XYZ AI can loop in a real teacher or school management, but only ever after you explicitly confirm.",
  },
];

const PERSONAS: { icon: IconName; grad: string; title: string; body: string }[] = [
  { icon: "graduationCap", grad: "var(--grad-student)", title: "Student", body: "Check your own attendance and get friendly, encouraging support." },
  { icon: "users", grad: "var(--grad-parent)", title: "Parent", body: "Stay on top of your child's attendance with a caring, patient assistant." },
  { icon: "pencil", grad: "var(--grad-teacher)", title: "Teacher", body: "Mark attendance for your class through plain conversation." },
  { icon: "building", grad: "var(--grad-principal)", title: "Principal", body: "School-wide attendance analytics, surfaced proactively." },
];

const SECURITY_POINTS = [
  "Role comes only from a server-issued session, never from what's typed in chat.",
  "Every tool call is re-checked against a permission table, independent of what the model decides.",
  "Prompt-injection and jailbreak attempts are detected and treated strictly as data, not instructions.",
  "XYZ AI never claims a human was contacted unless a real, confirmed request was submitted.",
];

export default function Landing({ onGetStarted, theme, onToggleTheme }: LandingProps) {
  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-container landing-nav-inner">
          <div className="landing-brand">
            <span className="login-mark landing-mark">XYZ</span>
            <span className="landing-wordmark">XYZ AI</span>
          </div>
          <div className="landing-nav-links">
            <a href="#how-it-works">How it works</a>
            <a href="#personas">Personas</a>
            <a href="#security">Security</a>
            <a href="#languages">Languages</a>
          </div>
          <div className="landing-nav-actions">
            <button className="theme-toggle" onClick={onToggleTheme} aria-label="Toggle theme" title="Toggle theme">
              <Icon name={theme === "light" ? "moon" : "sun"} size={16} />
            </button>
            <button className="landing-btn-ghost" onClick={onGetStarted}>Sign in</button>
            <button className="landing-btn-primary" onClick={onGetStarted}>Get Started</button>
          </div>
        </div>
      </nav>

      <header className="landing-hero">
        <div className="landing-container landing-hero-inner">
          <div className="landing-hero-copy">
            <span className="landing-eyebrow">Human-like school assistant</span>
            <h1>
              One assistant, every voice in your school.
            </h1>
            <p className="landing-hero-sub">
              XYZ AI talks naturally with students, parents, teachers, and principals
              by chat or voice, in 11 languages, and knows exactly what each of them
              is allowed to see and do.
            </p>
            <div className="landing-hero-actions">
              <button className="landing-btn-primary landing-btn-lg" onClick={onGetStarted}>
                Try the assistant <Icon name="arrowRight" size={16} />
              </button>
              <a className="landing-btn-ghost landing-btn-lg" href="#how-it-works">
                See how it works
              </a>
            </div>
          </div>

          <div className="landing-hero-visual" aria-hidden>
            <div className="mock-window">
              <div className="mock-window-bar">
                <span /><span /><span />
              </div>
              <div className="mock-avatar-row">
                <Avatar role="parent" size={40} />
                <div>
                  <div className="mock-avatar-title">Parent Support Assistant</div>
                  <div className="mock-avatar-sub">for Sunita Sharma</div>
                </div>
              </div>
              <div className="mock-bubble assistant">Rahul's current attendance is <strong>91.2%</strong>. Want to see his recent daily records?</div>
              <div className="mock-bubble user" style={{ background: "var(--grad-parent)" }}>Yes, and can I talk to his teacher?</div>
              <div className="mock-bubble assistant">Of course, I'll connect you. Shall I submit the request now?</div>
              <div className="mock-escalation">
                <Icon name="checkCircle" size={14} /> Request submitted to Teacher
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="landing-stats">
        <div className="landing-container landing-stats-inner">
          {STATS.map((s) => (
            <div key={s.label} className="landing-stat">
              <div className="landing-stat-value">{s.value}</div>
              <div className="landing-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" id="how-it-works">
        <div className="landing-container">
          <h2 className="landing-section-title">How XYZ AI works</h2>
          <p className="landing-section-sub">Three steps from sign-in to a resolved question.</p>
          <div className="landing-steps">
            {STEPS.map((s, i) => (
              <div key={s.title} className="landing-step">
                <div className="landing-step-icon" style={{ background: s.grad }}>
                  <Icon name={s.icon} size={20} className="avatar-icon" />
                </div>
                <div className="landing-step-index">{String(i + 1).padStart(2, "0")}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-alt" id="personas">
        <div className="landing-container">
          <h2 className="landing-section-title">Built for every role</h2>
          <p className="landing-section-sub">One assistant, four distinct personas, all under the same security rules.</p>
          <div className="landing-personas">
            {PERSONAS.map((p) => (
              <div key={p.title} className="landing-persona-card">
                <div className="landing-persona-icon" style={{ background: p.grad }}>
                  <Icon name={p.icon} size={18} className="avatar-icon" />
                </div>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-security" id="security">
        <div className="landing-container landing-security-inner">
          <div>
            <span className="landing-eyebrow">Security &amp; safety</span>
            <h2 className="landing-section-title landing-section-title-left">Enforced in code, not just in the prompt</h2>
            <ul className="landing-security-list">
              {SECURITY_POINTS.map((p) => (
                <li key={p}>
                  <Icon name="shield" size={15} />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="landing-security-badge">
            <Icon name="shield" size={40} />
            <div className="landing-security-badge-title">Application-layer RBAC</div>
            <div className="landing-security-badge-sub">Every tool call re-checked, regardless of what the model decides.</div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="languages">
        <div className="landing-container">
          <h2 className="landing-section-title">Speaks the school's languages</h2>
          <p className="landing-section-sub">Chat and voice, natively, in all 11.</p>
          <div className="landing-language-chips">
            {LANGUAGES.map((l) => (
              <span key={l.name}>{l.name}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-container landing-cta-inner">
          <h2>Ready to try it yourself?</h2>
          <p>Sign in as any of the six demo identities. No password required.</p>
          <button className="landing-btn-primary landing-btn-lg" onClick={onGetStarted}>
            Try XYZ AI <Icon name="arrowRight" size={16} />
          </button>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div className="landing-brand">
            <span className="login-mark landing-mark">XYZ</span>
            <span className="landing-wordmark">XYZ AI</span>
          </div>
          <div className="landing-footer-note">Demo build, all data is mocked. Built for a hackathon submission.</div>
        </div>
      </footer>
    </div>
  );
}
