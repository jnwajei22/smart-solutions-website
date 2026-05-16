const services = [
  { title: "Structured Cabling", text: "Clean CAT5e/CAT6 runs, terminations, wall plates, patch panels, labeling, and troubleshooting for homes and small businesses." },
  { title: "Network & Wi‑Fi Setup", text: "Router, switch, access point, and coverage improvements for offices, shops, rentals, and residential installs." },
  { title: "Racks & Low-Voltage Cleanup", text: "Rack mounting, cable management, network closet cleanup, and basic smart infrastructure organization." },
];

export default function Home() {
  return <>
    <header className="header"><div className="container nav"><a className="brand" href="#top">DFW <span>Smart</span> Solutions</a><nav className="links"><a href="#services">Services</a><a href="#process">Process</a><a href="#about">About</a><a href="#contact">Contact</a></nav><a className="btn primary" href="#contact">Request Quote</a></div></header>
    <main id="top" className="container">
      <section className="hero">
        <div><div className="eyebrow">Dallas • Fort Worth • Low-Voltage</div><h1>Clean installs. Reliable networks. No cable spaghetti.</h1><p>DFW Smart Solutions helps homes and small businesses with structured cabling, network setup, Wi‑Fi improvements, rack cleanup, and practical smart infrastructure work across the Metroplex.</p><div className="actions"><a className="btn primary" href="#contact">Get a Quote</a><a className="btn" href="#services">View Services</a></div></div>
        <aside className="card"><span className="badge">Service Snapshot</span><h3 style={{marginTop:18}}>Built for practical installs</h3><div className="stat"><span>Cabling</span><strong>CAT5e / CAT6</strong></div><div className="stat"><span>Networks</span><strong>Homes + SMB</strong></div><div className="stat"><span>Area</span><strong>DFW</strong></div><p>Security, alarms, and access-control wording should stay licensing-aware. Start with cabling and networking. Boring legal caution, useful survival skill.</p></aside>
      </section>
      <section id="services" className="section"><div className="eyebrow">Services</div><h2>Low-voltage work that looks like someone cared.</h2><div className="grid">{services.map((s)=><article className="card service" key={s.title}><div><h3>{s.title}</h3><p>{s.text}</p></div><a className="btn" href="#contact">Ask about this</a></article>)}</div></section>
      <section id="process" className="section"><div className="grid"><div className="card"><h3>1. Scope</h3><p>Send the address, photos, desired locations, and the problem you are trying to solve.</p></div><div className="card"><h3>2. Quote</h3><p>You get a clear labor/material estimate before work starts.</p></div><div className="card"><h3>3. Install</h3><p>We install, label, test, clean up, and document what changed.</p></div></div></section>
      <section id="about" className="section"><div className="band"><div><div className="eyebrow">About</div><h2>Smart infrastructure without the mystery markup.</h2><p>DFW Smart Solutions focuses on clean, explainable installs for people who need their network, cabling, and connected systems to work without becoming a second job.</p></div><ul className="list"><li>Clear communication</li><li>Neat terminations</li><li>Practical recommendations</li><li>Local DFW service</li></ul></div></section>
      <section id="contact" className="section"><div className="card"><div className="eyebrow">Contact</div><h2>Request a quote.</h2><p>Replace these placeholders before launch: <strong>info@dfwsmartsolutions.com</strong> and <strong>(000) 000‑0000</strong>.</p><div className="actions"><a className="btn primary" href="mailto:info@dfwsmartsolutions.com">Email DFW Smart Solutions</a><a className="btn" href="tel:+10000000000">Call Now</a></div></div></section>
    </main><footer className="footer"><div className="container">© {new Date().getFullYear()} DFW Smart Solutions LLC. All rights reserved.</div></footer>
  </>;
}
