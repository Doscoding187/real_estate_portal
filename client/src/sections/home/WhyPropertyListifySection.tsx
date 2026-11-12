// Why this section exists, what it says and its rules: docs/product/homepage/why-property-listify.md
import { useRef, useState, type KeyboardEvent } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  Contact,
  FileEdit,
  Heart,
  Home,
  Inbox,
  KeyRound,
  Layers,
  MapPinned,
  MessageSquare,
  Network,
  Search,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

type Benefit = { title: string; text: string; icon: LucideIcon };

type Audience = {
  id: string;
  tab: string;
  tabIcon: LucideIcon;
  headline: string;
  summary: string;
  benefits: readonly [Benefit, Benefit, Benefit];
  today: string;
  cta: { label: string; href: string };
  secondary?: { label: string; href: string };
};

const WHY_AUDIENCES: readonly Audience[] = [
  {
    id: 'buy-rent',
    tab: 'Buying or renting',
    tabIcon: Home,
    headline: 'Find a place and speak to the person who handles it.',
    summary:
      'Search homes for sale and to rent across South Africa, then contact the agent directly.',
    benefits: [
      {
        title: 'Search your way',
        text: 'Filter by area and property type.',
        icon: Search,
      },
      {
        title: 'Know the area',
        text: 'Explore cities and areas before you shortlist.',
        icon: MapPinned,
      },
      {
        title: 'Save and enquire',
        text: 'Save homes you like and send an enquiry.',
        icon: Heart,
      },
    ],
    today:
      'What you can do today: browse every listing without an account. A free account lets you save homes.',
    cta: { label: 'Browse homes for sale', href: '/property-for-sale' },
    secondary: { label: 'Homes to rent', href: '/property-to-rent' },
  },
  {
    id: 'sell-let',
    tab: 'Selling or letting',
    tabIcon: KeyRound,
    headline: 'Get your property in front of buyers and tenants through an agent.',
    summary: 'Owners do not list on their own yet. An agent lists your property for you.',
    benefits: [
      {
        title: 'Find an agent',
        text: 'Search agent profiles by name, speciality or area.',
        icon: Search,
      },
      {
        title: 'See who they are',
        text: 'Each agent has their own public page.',
        icon: Contact,
      },
      {
        title: 'Reach them directly',
        text: 'Get in touch with the agent you choose.',
        icon: MessageSquare,
      },
    ],
    today: 'What you can do today: find an agent and ask them to list your property.',
    cta: { label: 'Find an agent', href: '/agents' },
  },
  {
    id: 'agents',
    tab: 'Agents',
    tabIcon: BriefcaseBusiness,
    headline: 'Your public presence, listings and enquiries in one place.',
    summary: 'Agents can create an account and set up their profile on Property Listify now.',
    benefits: [
      {
        title: 'A public profile',
        text: 'A page buyers and owners can find and open.',
        icon: BadgeCheck,
      },
      {
        title: 'Listings in one place',
        text: 'Prepare listings as private drafts while publishing opens.',
        icon: FileEdit,
      },
      {
        title: 'Enquiries in one place',
        text: 'Property enquiries arrive in your agent workspace.',
        icon: Inbox,
      },
    ],
    today:
      'What you can do today: create your agent account and set up your profile. Publishing opens soon.',
    cta: { label: 'Set up your agent profile', href: '/advertise/sell/agents' },
  },
  {
    id: 'agencies',
    tab: 'Agencies',
    tabIcon: UsersRound,
    headline: 'One home for your agency, your team and your listings.',
    summary: 'Agency accounts are not open yet. See how it will work and get in touch.',
    benefits: [
      {
        title: 'Agency listings',
        text: 'Keep the agency’s listings together.',
        icon: Layers,
      },
      {
        title: 'Your team',
        text: 'Bring your agents under one agency.',
        icon: Users,
      },
      {
        title: 'Lead routing',
        text: 'Route enquiries to the right person.',
        icon: Network,
      },
    ],
    today: 'What you can do today: read the agency details and contact us. Accounts open soon.',
    cta: { label: 'See agency details', href: '/advertise/sell/agencies' },
    secondary: { label: 'Contact us', href: '/contact?area=agency_operations' },
  },
  {
    id: 'developers',
    tab: 'Developers',
    tabIcon: Building2,
    headline: 'Present your developments and receive enquiries.',
    summary: 'Developer accounts are not open yet. See how it will work and get in touch.',
    benefits: [
      {
        title: 'Your developments',
        text: 'Show each development on its own page.',
        icon: Building2,
      },
      {
        title: 'Unit availability',
        text: 'Present the units you have to offer.',
        icon: ClipboardList,
      },
      {
        title: 'Project enquiries',
        text: 'Receive enquiries and follow them up.',
        icon: BellRing,
      },
    ],
    today: 'What you can do today: read the developer details and contact us. Accounts open soon.',
    cta: { label: 'See developer details', href: '/advertise/sell/developers' },
    secondary: { label: 'Contact us', href: '/contact?area=developer_operations' },
  },
];

export function WhyPropertyListifySection() {
  const [activeId, setActiveId] = useState<string>(WHY_AUDIENCES[0].id);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const active = WHY_AUDIENCES.find(item => item.id === activeId) ?? WHY_AUDIENCES[0];

  const focusTab = (index: number) => {
    const next = WHY_AUDIENCES[(index + WHY_AUDIENCES.length) % WHY_AUDIENCES.length];
    setActiveId(next.id);
    tabRefs.current[next.id]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      focusTab(index + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusTab(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusTab(WHY_AUDIENCES.length - 1);
    }
  };

  return (
    <section
      data-testid="home-why-property-listify"
      className="home-section bg-slate-50"
      aria-labelledby="home-why-heading"
    >
      <div className="home-section-content">
        <div className="home-section-header max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2774AE]">
            Why Property Listify
          </p>
          <h2
            id="home-why-heading"
            className="home-section-title mt-2 text-[1.25rem] font-bold text-slate-900 sm:text-2xl md:text-[28px]"
          >
            One place for every property move.
          </h2>
          <p className="max-w-3xl text-[13px] leading-5 text-slate-700 md:text-sm md:leading-6">
            Property Listify connects people who want a property with the agents, agencies and
            developers who handle it. Pick what describes you.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Choose what describes you"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 md:flex-wrap md:overflow-visible"
        >
          {WHY_AUDIENCES.map((item, index) => {
            const selected = item.id === active.id;
            const TabIcon = item.tabIcon;
            return (
              <button
                key={item.id}
                ref={node => {
                  tabRefs.current[item.id] = node;
                }}
                type="button"
                role="tab"
                id={`home-why-tab-${item.id}`}
                aria-selected={selected}
                aria-controls={`home-why-panel-${item.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveId(item.id)}
                onKeyDown={event => onKeyDown(event, index)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2774AE] focus-visible:ring-offset-2 ${
                  selected
                    ? 'border-[#1f5f94] bg-[#1f5f94] text-white shadow-sm'
                    : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-100'
                }`}
              >
                <TabIcon className="h-4 w-4" aria-hidden="true" />
                {item.tab}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`home-why-panel-${active.id}`}
          aria-labelledby={`home-why-tab-${active.id}`}
          tabIndex={0}
          className="mt-4 grid gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2774AE] md:p-7 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8"
        >
          <div className="flex flex-col">
            <h3 className="text-xl font-bold leading-snug text-slate-900 md:text-2xl">
              {active.headline}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-700 md:text-base md:leading-7">
              {active.summary}
            </p>
            <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm leading-6 text-slate-800">
              {active.today}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
              <a
                href={active.cta.href}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1f5f94] px-6 text-sm font-bold text-white transition hover:bg-[#174d7b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2774AE] focus-visible:ring-offset-2"
              >
                {active.cta.label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              {active.secondary ? (
                <a
                  href={active.secondary.href}
                  className="inline-flex min-h-11 items-center text-sm font-bold text-[#1f5f94] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2774AE]"
                >
                  {active.secondary.label}
                </a>
              ) : null}
            </div>
          </div>

          <ul className="grid content-start gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {active.benefits.map(({ title, text, icon: Icon }) => (
              <li key={title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-[#1f5f94]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h4 className="mt-3 text-base font-bold text-slate-900">{title}</h4>
                <p className="mt-1 text-sm leading-6 text-slate-700">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
