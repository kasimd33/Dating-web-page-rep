import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  CircleCheck,
  Compass,
  ExternalLink,
  Heart,
  Instagram,
  Linkedin,
  LoaderCircle,
  MessageCircle,
  Plus,
  Radio,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiGet, apiPost } from "@/lib/api";
import type { AgentCandidate, AgentCandidateCreate, RankedMatch } from "@/lib/agent-types";
import DateTheater from "@/components/DateTheater";
import { useAgentDate } from "@/hooks/useAgentDate";

type View = "overview" | "agents" | "rankings" | "date";

const AVATARS = [
  "https://images.unsplash.com/photo-1685903772095-f07172808761?auto=format&fit=crop&w=240&q=80",
  "https://images.unsplash.com/photo-1641288883869-c463bc6c2a58?auto=format&fit=crop&w=240&q=80",
  "https://images.unsplash.com/photo-1586297135537-94bc9ba060aa?auto=format&fit=crop&w=240&q=80",
  "https://images.unsplash.com/photo-1569913486515-b74bf7751574?auto=format&fit=crop&w=240&q=80",
];

const FALLBACK_NAMES = [
  "Arianna Huffington", "Satya Nadella", "Serena Williams", "Emma Watson", "Trevor Noah",
  "Issa Rae", "Jimmy Donaldson", "Tim Cook", "Mel Robbins", "Sophia Amoruso",
  "Mark Manson", "Esther Perel", "Ali Abdaal", "Marie Forleo", "Naval Ravikant",
  "Alexis Ohanian", "Jessica Alba", "Gary Vaynerchuk", "Reshma Saujani", "Bozoma Saint John",
  "Adam Grant", "Leila Hormozi", "Nuseir Yassin", "Rupi Kaur", "David Chang",
];

const fallbackCandidates: AgentCandidate[] = FALLBACK_NAMES.map((name, index) => {
  const handle = name.toLowerCase().replaceAll(" ", "");
  return {
    id: `fallback-${index + 1}`,
    name,
    role: index % 2 === 0 ? "Founder · Creative operator" : "Builder · Cultural voice",
    location: index % 3 === 0 ? "New York, NY" : index % 3 === 1 ? "London, UK" : "Los Angeles, CA",
    linkedin_url: `https://www.linkedin.com/in/${handle}`,
    instagram_url: `https://www.instagram.com/${handle}/`,
    avatar_url: AVATARS[index % AVATARS.length],
    needs: ["clear communication", "shared momentum", "room to be themselves"],
    hobbies: ["curious conversations", "city walks", "trying somewhere new"],
    interests: ["creative work", "good questions", "building a life with intention"],
    qualities: ["self-directed", "warm", "high agency"],
    agent_style: index % 2 === 0 ? "The thoughtful connector" : "The curious wildcard",
    source_status: "curated",
    created_at: new Date().toISOString(),
  };
});

function scoreFor(first: AgentCandidate, second: AgentCandidate, index: number) {
  return 82 - ((first.name.length + second.name.length + index * 3) % 16);
}

function fallbackRankings(target: AgentCandidate): RankedMatch[] {
  return fallbackCandidates
    .filter((candidate) => candidate.id !== target.id)
    .slice(0, 8)
    .map((candidate, index) => {
      const score = scoreFor(target, candidate, index);
      return {
        rank: index + 1,
        candidate,
        score,
        profile_score: score,
        date_match: null,
        date_id: null,
        reason: `Their creative energy pairs with ${target.name}'s instinct for intention.`,
        breakdown: { profile_fit: score },
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

function SourceBadge({ type, href }: { type: "linkedin" | "instagram"; href: string }) {
  const isLinkedin = type === "linkedin";
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      data-testid={`${type}-source-link`}
      className={`source-badge ${isLinkedin ? "source-linkedin" : "source-instagram"}`}
    >
      {isLinkedin ? <Linkedin size={13} /> : <Instagram size={13} />}
      {isLinkedin ? "LinkedIn" : "Instagram"}
      <ExternalLink size={11} />
    </a>
  );
}

function CandidateAvatar({ candidate, size = "md" }: { candidate: AgentCandidate; size?: "sm" | "md" | "lg" }) {
  return (
    <img
      src={candidate.avatar_url}
      alt={`${candidate.name} portrait`}
      data-testid={`candidate-avatar-${candidate.id}`}
      className={`candidate-avatar avatar-${size}`}
    />
  );
}

function TagList({ items, tone = "gold" }: { items: string[]; tone?: "gold" | "teal" | "rose" }) {
  return (
    <div className="flex flex-wrap gap-2" data-testid={`tag-list-${tone}`}>
      {items.map((item) => (
        <span key={item} className={`signal-tag signal-${tone}`} data-testid={`signal-tag-${item.replaceAll(" ", "-")}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

function AppHeader({ onAdd }: { onAdd: () => void }) {
  return (
    <header className="app-header" data-testid="app-header">
      <div className="brand-lockup" data-testid="brand-lockup">
        <div className="brand-mark" data-testid="brand-mark"><Heart size={15} fill="currentColor" /></div>
        <span data-testid="brand-name">AGENT<span className="brand-accent">CUPID</span></span>
      </div>
      <div className="header-meta" data-testid="header-meta">
        <span className="live-dot" data-testid="system-live-indicator" />
        <span data-testid="system-live-label">AGENT NETWORK LIVE</span>
        <span className="header-divider" />
        <span data-testid="source-policy-label">2 SOURCE POLICY</span>
      </div>
      <Button onClick={onAdd} data-testid="header-add-person-button" className="header-add-button">
        <Plus size={15} /> Add person
      </Button>
    </header>
  );
}

function SideNav({ view, setView, candidateCount }: { view: View; setView: (view: View) => void; candidateCount: number }) {
  const items: Array<{ id: View; label: string; icon: typeof Compass; count?: string }> = [
    { id: "overview", label: "Control room", icon: Compass },
    { id: "agents", label: "People & agents", icon: UserRound, count: String(candidateCount).padStart(2, "0") },
    { id: "rankings", label: "Compatibility", icon: BarChart3 },
    { id: "date", label: "Date theater", icon: MessageCircle },
  ];
  return (
    <aside className="side-nav" data-testid="side-navigation">
      <div className="nav-kicker" data-testid="nav-kicker">YOUR PRIVATE MATCHMAKER</div>
      <nav aria-label="Main navigation" data-testid="main-navigation">
        {items.map(({ id, label, icon: Icon, count }) => (
          <button
            type="button"
            key={id}
            onClick={() => setView(id)}
            className={`nav-item ${view === id ? "nav-item-active" : ""}`}
            data-testid={`nav-${id}-button`}
          >
            <Icon size={17} strokeWidth={1.7} />
            <span data-testid={`nav-${id}-label`}>{label}</span>
            {count && <span className="nav-count" data-testid="candidate-count">{count}</span>}
            {view === id && <ChevronRight size={14} className="ml-auto" />}
          </button>
        ))}
      </nav>
      <div className="nav-footer" data-testid="nav-footer">
        <div className="nav-footer-icon" data-testid="nav-footer-icon"><Sparkles size={15} /></div>
        <p data-testid="nav-footer-copy">Every profile is synthesized from exactly two public sources.</p>
      </div>
    </aside>
  );
}

function AddPersonPanel({ onClose, onCreated }: { onClose: () => void; onCreated: (candidate: AgentCandidate) => void }) {
  const [form, setForm] = useState<AgentCandidateCreate>({ name: "", linkedin_url: "", instagram_url: "" });
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: AgentCandidateCreate) => apiPost<AgentCandidate>("/agents/analyze", payload),
    onSuccess: (candidate) => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success(`${candidate.name} is ready for a first impression.`);
      onCreated(candidate);
    },
    onError: () => toast.error("Add both official links to start the agent read."),
  });
  const update = (key: keyof AgentCandidateCreate, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return (
    <div className="modal-backdrop" role="presentation" data-testid="add-person-modal">
      <div className="add-panel" role="dialog" aria-modal="true" aria-labelledby="add-person-title" data-testid="add-person-panel">
        <button type="button" onClick={onClose} className="icon-button panel-close" data-testid="add-person-close-button" aria-label="Close add person panel"><X size={18} /></button>
        <div className="eyebrow" data-testid="add-person-eyebrow">NEW AGENT DOSSIER · 02 SOURCES</div>
        <h2 id="add-person-title" data-testid="add-person-title">Give us two signals.<br /><em>We’ll find the rest.</em></h2>
        <p className="panel-copy" data-testid="add-person-copy">Paste the official LinkedIn and public Instagram profiles. The agent reads both, then builds a person worth meeting.</p>
        <div className="form-stack" data-testid="add-person-form">
          <label data-testid="add-person-name-field">Display name<input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. Maya Chen" data-testid="add-person-name-input" /></label>
          <label data-testid="add-person-linkedin-field"><span className="label-with-icon"><Linkedin size={13} /> LinkedIn URL</span><input value={form.linkedin_url} onChange={(event) => update("linkedin_url", event.target.value)} placeholder="https://linkedin.com/in/..." data-testid="add-person-linkedin-input" /></label>
          <label data-testid="add-person-instagram-field"><span className="label-with-icon"><Instagram size={13} /> Public Instagram URL</span><input value={form.instagram_url} onChange={(event) => update("instagram_url", event.target.value)} placeholder="https://instagram.com/..." data-testid="add-person-instagram-input" /></label>
          <Button
            type="button"
            disabled={mutation.isPending || !form.name || !form.linkedin_url || !form.instagram_url}
            onClick={() => mutation.mutate(form)}
            data-testid="add-person-submit-button"
            className="primary-action w-full"
          >
            {mutation.isPending ? <><LoaderCircle size={16} className="spin" /> Reading both profiles…</> : <><Sparkles size={16} /> Analyze this person</>}
          </Button>
        </div>
        <div className="panel-note" data-testid="add-person-note"><CircleCheck size={14} /> No extra sources. No hidden enrichment.</div>
      </div>
    </div>
  );
}

function ProfilePanel({ candidate, onClose, onRankings }: { candidate: AgentCandidate; onClose: () => void; onRankings: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" data-testid="profile-modal">
      <div className="profile-panel" role="dialog" aria-modal="true" aria-labelledby="profile-title" data-testid="profile-panel">
        <button type="button" onClick={onClose} className="icon-button panel-close" data-testid="profile-close-button" aria-label="Close profile"><X size={18} /></button>
        <div className="profile-hero" data-testid="profile-hero">
          <CandidateAvatar candidate={candidate} size="lg" />
          <div>
            <div className="eyebrow" data-testid="profile-eyebrow">AGENT DOSSIER · {candidate.source_status === "analyzed" ? "JUST ANALYZED" : "CURATED SIGNAL"}</div>
            <h2 id="profile-title" data-testid="profile-title">{candidate.name}</h2>
            <p data-testid="profile-role">{candidate.role} · {candidate.location}</p>
          </div>
        </div>
        <div className="source-row" data-testid="profile-source-row"><SourceBadge type="linkedin" href={candidate.linkedin_url} /><SourceBadge type="instagram" href={candidate.instagram_url} /><span className="source-status" data-testid="profile-source-status"><CircleCheck size={13} /> 2 / 2 sources read</span></div>
        <div className="agent-note" data-testid="profile-agent-note"><span className="note-icon"><Sparkles size={15} /></span><div><div className="micro-label" data-testid="profile-agent-label">AGENT'S FIRST READ</div><p data-testid="profile-agent-style">{candidate.agent_style}. This agent is looking for a signal that feels easy, intentional, and alive.</p></div></div>
        <div className="profile-grid" data-testid="profile-analysis-grid">
          <div className="profile-section" data-testid="profile-needs-section"><div className="micro-label" data-testid="profile-needs-label">Needs</div><TagList items={candidate.needs} tone="rose" /></div>
          <div className="profile-section" data-testid="profile-hobbies-section"><div className="micro-label" data-testid="profile-hobbies-label">Hobbies</div><TagList items={candidate.hobbies} tone="teal" /></div>
          <div className="profile-section" data-testid="profile-interests-section"><div className="micro-label" data-testid="profile-interests-label">Interests</div><TagList items={candidate.interests} tone="gold" /></div>
          <div className="profile-section" data-testid="profile-qualities-section"><div className="micro-label" data-testid="profile-qualities-label">Qualities found</div><TagList items={candidate.qualities} tone="gold" /></div>
        </div>
        <Button onClick={onRankings} className="primary-action w-full" data-testid="profile-view-rankings-button"><BarChart3 size={16} /> See who fits them best <ArrowUpRight size={15} /></Button>
      </div>
    </div>
  );
}

function CandidateCard({ candidate, onOpen }: { candidate: AgentCandidate; onOpen: (candidate: AgentCandidate) => void }) {
  return (
    <button type="button" onClick={() => onOpen(candidate)} className="candidate-card" data-testid={`candidate-card-${candidate.id}`}>
      <CandidateAvatar candidate={candidate} />
      <div className="candidate-card-copy"><div className="candidate-card-name" data-testid={`candidate-name-${candidate.id}`}>{candidate.name}</div><div className="candidate-card-role" data-testid={`candidate-role-${candidate.id}`}>{candidate.role}</div><div className="candidate-card-location" data-testid={`candidate-location-${candidate.id}`}>{candidate.location}</div></div>
      <div className="candidate-card-arrow"><ArrowUpRight size={16} /></div>
    </button>
  );
}

function Overview({ candidates, selected, onOpen, onAdd, onView }: { candidates: AgentCandidate[]; selected: AgentCandidate; onOpen: (candidate: AgentCandidate) => void; onAdd: () => void; onView: (view: View) => void }) {
  return (
    <div className="view-stack" data-testid="overview-view">
      <section className="hero-block" data-testid="overview-hero">
        <div className="hero-copy"><div className="eyebrow" data-testid="hero-eyebrow">THE AGENTIC DATING EXPERIMENT · 01</div><h1 data-testid="hero-title">Let your agent<br /><em>make the first move.</em></h1><p data-testid="hero-copy">Two public signals in. Your agent gets to know them, dates their agent, and brings you the person who actually fits.</p><div className="hero-actions"><Button onClick={onAdd} className="primary-action" data-testid="hero-add-person-button"><Plus size={16} /> Add a person</Button><button type="button" onClick={() => onView("date")} className="text-action" data-testid="hero-watch-date-button"><Radio size={15} /> Watch a date in progress</button></div></div>
        <div className="hero-visual" data-testid="hero-visual"><div className="orb orb-one" /><div className="orb orb-two" /><div className="orbit-line orbit-one" /><div className="orbit-line orbit-two" /><div className="hero-heart"><Heart size={38} fill="currentColor" /></div><div className="hero-visual-caption"><span data-testid="hero-visual-kicker">LIVE SIGNAL</span><strong data-testid="hero-visual-copy">A little<br />more human.</strong></div></div>
      </section>
      <section className="stats-row" data-testid="overview-stats"><div className="stat-card" data-testid="stat-people"><span className="micro-label">PEOPLE IN THE ROOM</span><strong>{String(candidates.length).padStart(2, "0")}</strong><span>public profiles read</span></div><div className="stat-card" data-testid="stat-sources"><span className="micro-label">SOURCE INTEGRITY</span><strong>02 / 02</strong><span>links per person</span></div><div className="stat-card stat-highlight" data-testid="stat-chemistry"><span className="micro-label">AGENTS CURRENTLY DATING</span><strong>06</strong><span><span className="live-dot inline-dot" /> live conversations</span></div></section>
      <section className="section-heading-row" data-testid="people-section-heading"><div><div className="eyebrow">THE ROOM</div><h2 data-testid="people-section-title">People worth meeting</h2></div><button type="button" onClick={() => onView("agents")} className="text-action" data-testid="view-all-people-button">View all <ChevronRight size={15} /></button></section>
      <div className="candidate-grid" data-testid="candidate-grid">{candidates.slice(0, 8).map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} onOpen={onOpen} />)}</div>
      <section className="spotlight-card" data-testid="agent-spotlight-card"><div className="spotlight-label"><span className="live-dot" /> NOW DATING</div><div className="spotlight-avatars"><CandidateAvatar candidate={selected} size="sm" /><div className="avatar-connector"><Heart size={13} fill="currentColor" /></div><CandidateAvatar candidate={candidates[1] ?? selected} size="sm" /></div><div className="spotlight-copy"><strong data-testid="spotlight-title">An agent date is unfolding</strong><span data-testid="spotlight-copy">{selected.name}'s agent just found an unexpected overlap.</span></div><button type="button" onClick={() => onView("date")} className="spotlight-button" data-testid="spotlight-watch-button">Watch <ArrowUpRight size={15} /></button></section>
    </div>
  );
}

function AgentsView({ candidates, onOpen, onAdd }: { candidates: AgentCandidate[]; onOpen: (candidate: AgentCandidate) => void; onAdd: () => void }) {
  return <div className="view-stack" data-testid="agents-view"><section className="page-heading" data-testid="agents-heading"><div><div className="eyebrow">THE AGENT ROSTER</div><h1 data-testid="agents-title">People & agents</h1><p data-testid="agents-copy">Every dossier is a two-source read. Open a profile to see what the agent found.</p></div><Button onClick={onAdd} className="primary-action" data-testid="agents-add-person-button"><Plus size={16} /> Add a person</Button></section><div className="agents-grid" data-testid="agents-grid">{candidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} onOpen={onOpen} />)}</div></div>;
}

function RankingsView({ candidates, selected, setSelected, rankings, onDate, onOpen, dateBusy }: { candidates: AgentCandidate[]; selected: AgentCandidate; setSelected: (id: string) => void; rankings: RankedMatch[]; onDate: (match: AgentCandidate) => void; onOpen: (candidate: AgentCandidate) => void; dateBusy: boolean }) {
  return <div className="view-stack" data-testid="rankings-view"><section className="page-heading" data-testid="rankings-heading"><div><div className="eyebrow">THE COMPATIBILITY INDEX</div><h1 data-testid="rankings-title">Who fits {selected.name}?</h1><p data-testid="rankings-copy">Profile fit ranks everyone first. Once two agents have actually dated, their date match % takes over.</p></div><div className="select-wrap"><label htmlFor="ranking-person" className="micro-label">RANK FOR</label><select id="ranking-person" value={selected.id} onChange={(event) => setSelected(event.target.value)} data-testid="ranking-person-select">{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></div></section><div className="ranking-intro" data-testid="ranking-intro"><Sparkles size={18} /><span><strong>{rankings.filter((r) => r.date_match !== null).length} of {rankings.length} matches dated.</strong> Match % = 40% profile fit + 30% each agent's post-date score.</span><Badge variant="outline" data-testid="ranking-method-badge">AGENT METHOD · V1</Badge></div><div className="ranking-list" data-testid="ranking-list">{rankings.map((match) => <div className={`ranking-row ${match.rank === 1 ? "ranking-top" : ""}`} key={match.candidate.id} data-testid={`ranking-row-${match.rank}`}><div className="rank-number" data-testid={`ranking-number-${match.rank}`}>{String(match.rank).padStart(2, "0")}</div><CandidateAvatar candidate={match.candidate} size="sm" /><div className="ranking-person"><strong data-testid={`ranking-name-${match.rank}`}>{match.candidate.name}</strong><span data-testid={`ranking-role-${match.rank}`}>{match.candidate.role}</span><small data-testid={`ranking-reason-${match.rank}`}>{match.reason}</small></div><div className="score-block"><strong data-testid={`ranking-score-${match.rank}`}>{match.score}%</strong><span data-testid={`ranking-score-label-${match.rank}`}>{match.date_match !== null ? "DATE MATCH" : "PROFILE FIT"}</span>{match.date_match !== null && <small className="score-sub" data-testid={`ranking-profile-fit-${match.rank}`}>fit {match.profile_score}%</small>}</div><div className="ranking-actions"><button type="button" onClick={() => onOpen(match.candidate)} className="row-link" data-testid={`ranking-profile-button-${match.rank}`}>Profile</button><Button onClick={() => onDate(match.candidate)} disabled={dateBusy} className="date-button" data-testid={`ranking-date-button-${match.rank}`}><Heart size={14} /> {match.date_match !== null ? "Date again" : "Date their agent"}</Button></div></div>)}</div></div>;
}

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [addOpen, setAddOpen] = useState(false);
  const [profile, setProfile] = useState<AgentCandidate | null>(null);
  const [selectedId, setSelectedId] = useState("seed-01");
  const [addedCandidate, setAddedCandidate] = useState<AgentCandidate | null>(null);
  const date = useAgentDate();
  const candidatesQuery = useQuery({ queryKey: ["agents"], queryFn: () => apiGet<AgentCandidate[]>("/agents"), retry: false });
  const candidates = useMemo(() => {
    const base = candidatesQuery.data?.length ? candidatesQuery.data : fallbackCandidates;
    if (addedCandidate && !base.some((candidate) => candidate.id === addedCandidate.id)) return [...base, addedCandidate];
    return base;
  }, [addedCandidate, candidatesQuery.data]);
  const selected = useMemo(() => candidates.find((candidate) => candidate.id === selectedId) ?? candidates[0], [candidates, selectedId]);
  const rankingsQuery = useQuery({ queryKey: ["rankings", selected?.id], queryFn: () => apiGet<RankedMatch[]>(`/agents/${selected?.id}/rankings`), enabled: Boolean(selected?.id) && view === "rankings", retry: false });
  const rankings = rankingsQuery.data?.length ? rankingsQuery.data : fallbackRankings(selected);
  const openProfile = (candidate: AgentCandidate) => { setProfile(candidate); setSelectedId(candidate.id); };
  const startDate = (match: AgentCandidate) => {
    if (date.busy) return;
    date.start(selected, match);
    setMainView("date");
    toast.success(`${selected.name}'s agent is heading out with ${match.name}'s agent.`);
  };
  const restartDate = () => { if (date.state.candidate && date.state.match) date.start(date.state.candidate, date.state.match); };
  const onCreated = (candidate: AgentCandidate) => { setAddedCandidate(candidate); setAddOpen(false); setSelectedId(candidate.id); setProfile(candidate); setView("agents"); };
  const setMainView = (nextView: View) => { setView(nextView); setProfile(null); };

  return <div className="app-shell" data-testid="agentcupid-app"><AppHeader onAdd={() => setAddOpen(true)} /><div className="app-body"><SideNav view={view} setView={setMainView} candidateCount={candidates.length} /><main className="main-content" data-testid="main-content">{view === "overview" && <Overview candidates={candidates} selected={selected} onOpen={openProfile} onAdd={() => setAddOpen(true)} onView={setMainView} />}{view === "agents" && <AgentsView candidates={candidates} onOpen={openProfile} onAdd={() => setAddOpen(true)} />}{view === "rankings" && <RankingsView candidates={candidates} selected={selected} setSelected={setSelectedId} rankings={rankings} onDate={startDate} onOpen={openProfile} dateBusy={date.busy} />}{view === "date" && <DateTheater date={date.state} onBrowse={() => setMainView("rankings")} onRestart={restartDate} />}</main></div>{addOpen && <AddPersonPanel onClose={() => setAddOpen(false)} onCreated={onCreated} />}{profile && <ProfilePanel candidate={profile} onClose={() => setProfile(null)} onRankings={() => { setProfile(null); setMainView("rankings"); }} />}</div>;
}