/* loop — scroll-reveal landing page
   Reveal model: each .stage is taller than the viewport with a sticky inner.
   As the stage scrolls past, every .word inside lights up in sequence,
   driven by scroll position (not React re-renders). */

const { useState, useRef, useEffect } = React;

/* tokenize "plain **accent** text" -> [{text, accent}] */
function tokenize(str){
  const out = [];
  let accent = false;
  str.split("**").forEach((chunk, i) => {
    accent = i % 2 === 1;
    chunk.split(/(\s+)/).forEach(tok => {
      if (tok.trim() === "") return;
      out.push({ text: tok, accent });
    });
  });
  return out;
}

/* renders a run of words; the scroll engine sets each .word opacity */
function Words({ text }){
  const toks = tokenize(text);
  return (
    <React.Fragment>
      {toks.map((t, i) => (
        <React.Fragment key={i}>
          <span className={"word" + (t.accent ? " w-accent" : "")}>{t.text}</span>
          {" "}
        </React.Fragment>
      ))}
    </React.Fragment>
  );
}

/* ---- content ---- */
const STATEMENTS = [
  { eyebrow: "01 — THE GAP", text: "The task is small. The **wall** in front of it isn’t." },
  { eyebrow: "02 — NOT A FLAW", text: "It’s not laziness. It’s not weak willpower. It’s how an **ADHD brain** starts.", wide: true },
  { eyebrow: "03 — TIME BLINDNESS", text: "And time slips. Five minutes becomes an hour. An hour becomes **gone**." },
  { eyebrow: "04 — THE SHIFT", text: "The fix isn’t trying harder. It’s changing the **context** around the first move.", wide: true },
  { eyebrow: "05 — THE METHOD", text: "LOOP pairs **Cognitive Behavioral Therapy** with **AI** that shows up the moment you’re stuck.", wide: true },
];

const HOW = [
  "Breaks the first step down until it’s **impossible to avoid**.",
  "Makes time something you can **see** and **feel**.",
  "Learns your patterns — and **meets you there**.",
];

function App(){
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState({ msg: "", ok: false });
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState(false);
  const cfg = useRef({ pace: 5 });

  /* apply tweaks to CSS vars */
  useEffect(() => {
    document.documentElement.style.setProperty("--red", t.accent);
    document.documentElement.style.setProperty("--dim", String(t.dim));
    cfg.current.pace = t.pace;
  }, [t.accent, t.dim, t.pace]);

  /* scroll-reveal engine */
  useEffect(() => {
    let ticking = false;
    const rail = document.querySelector(".rail");

    function paint(){
      ticking = false;
      const vh = window.innerHeight;
      const spread = cfg.current.pace;

      document.querySelectorAll(".stage").forEach(stage => {
        const words = stage.querySelectorAll(".word");
        if (!words.length) return;
        const r = stage.getBoundingClientRect();
        const scrollable = Math.max(1, r.height - vh);
        let prog = (-r.top) / scrollable;        // 0 -> 1 across the pinned span
        prog = Math.max(0, Math.min(1, prog));
        const n = words.length;
        const lit = prog * (n + spread) - spread * 0.45;
        words.forEach((w, i) => {
          const o = Math.max(0, Math.min(1, lit - i));
          w.style.opacity = String(Number(getDim()) + o * (1 - Number(getDim())));
        });
      });

      // reveal the waitlist form when CTA enters
      const form = document.querySelector(".form");
      if (form){
        const fr = form.getBoundingClientRect();
        if (fr.top < vh * 0.86) form.classList.add("in");
      }

      // progress rail
      if (rail){
        const max = document.documentElement.scrollHeight - vh;
        rail.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
      }
    }
    function getDim(){
      return getComputedStyle(document.documentElement).getPropertyValue("--dim") || "0.12";
    }
    function onScroll(){
      if (!ticking){ ticking = true; requestAnimationFrame(paint); }
    }
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  function submit(e){
    e.preventDefault();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!valid){
      setErr(true);
      setNote({ msg: "Enter a valid email to hold your spot.", ok: false });
      return;
    }
    setErr(false);
    setSubmitted(true);
    setNote({ msg: "You’re on the list. We’ll reach out before launch.", ok: true });
  }

  return (
    <React.Fragment>
      <div className="rail"></div>

      <nav className="top">
        <a className="brandmark" href="#top">
          <img src="assets/loop-logo.png" alt="LOOP" />
        </a>
        <a className="navjoin" href="#join">Join the waitlist</a>
      </nav>

      {/* HERO */}
      <header id="top" className={"hero " + (t.hero === "bold" ? "h-bold" : "h-minimal")}>
        <div className="inner">
          <img className="bigmark" src="assets/loop-logo.png" alt="" />
          <div className="eyebrow">AI self-management for adult ADHD</div>
          {t.hero === "bold" ? (
            <h1>
              <span className="ln">Starting is the</span>
              <span className="ln accent-ink">hardest part.</span>
            </h1>
          ) : (
            <h1>
              <span className="ln">Starting</span>
              <span className="ln">is the</span>
              <span className="ln accent-ink">hardest part.</span>
            </h1>
          )}
          <p className="sub">LOOP helps adult ADHD brains begin — using CBT and AI to break the wall between you and the first step.</p>
        </div>
        <div className="cue"><span className="bar"></span>Scroll</div>
      </header>

      {/* STATEMENT STAGES */}
      {STATEMENTS.map((s, i) => (
        <section className={"stage" + (s.wide ? " wide" : "")} key={i}>
          <div className="stage-inner">
            <div className="eyebrow">{s.eyebrow}</div>
            <p className="statement"><Words text={s.text} /></p>
          </div>
        </section>
      ))}

      {/* HOW IT WORKS */}
      <section className="stage wide">
        <div className="stage-inner">
          <div className="eyebrow">06 — WHAT IT DOES</div>
          <div className="howlist">
            {HOW.map((line, i) => (
              <p className="howline" key={i}>
                <span className="num">{String(i + 1).padStart(2, "0")}</span>
                <Words text={line} />
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="join" className="stage short">
        <div className="stage-inner cta-inner">
          <div className="eyebrow">EARLY ACCESS</div>
          <p className="cta-head"><Words text="Start before you feel **ready**." /></p>
          {!submitted ? (
            <form className="form" onSubmit={submit} noValidate>
              <input
                className={err ? "err" : ""}
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErr(false); }}
              />
              <button type="submit">Get early access</button>
            </form>
          ) : (
            <div className="form in" style={{ borderBottom: "none" }}>
              <span style={{ fontSize: "1.3rem", fontWeight: 600 }}>Welcome to LOOP.</span>
            </div>
          )}
          <div className={"formnote" + (note.ok ? " ok" : "")}>{note.msg}</div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footmark">LOOP</div>
        <div className="footrow">
          <div className="left">
            <img src="assets/loop-logo.png" alt="LOOP" />
            <div className="meta">
              Self-management, built for ADHD brains.<br />
              CBT · AI · Time awareness
            </div>
          </div>
          <div className="links">
            <a href="#top">Top</a>
            <a href="#join">Waitlist</a>
            <a href="mailto:hello@loop.app">Contact</a>
          </div>
        </div>
      </footer>

      {/* TWEAKS */}
      <TweaksPanel>
        <TweakSection label="Hero" />
        <TweakRadio
          label="First screen"
          value={t.hero}
          options={["minimal", "bold"]}
          onChange={(v) => setTweak("hero", v)}
        />
        <TweakSection label="Reveal" />
        <TweakSlider
          label="Reveal pace"
          value={t.pace}
          min={2}
          max={12}
          step={1}
          onChange={(v) => setTweak("pace", v)}
        />
        <TweakSlider
          label="Resting dimness"
          value={t.dim}
          min={0.04}
          max={0.3}
          step={0.01}
          onChange={(v) => setTweak("dim", v)}
        />
        <TweakSection label="Color" />
        <TweakColor
          label="Accent"
          value={t.accent}
          options={["#e4f92e", "#c6f03a", "#8be04a", "#5be08a"]}
          onChange={(v) => setTweak("accent", v)}
        />
      </TweaksPanel>
    </React.Fragment>
  );
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "hero": "minimal",
  "pace": 5,
  "dim": 0.12,
  "accent": "#e4f92e"
}/*EDITMODE-END*/;

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
