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
  Wrench,
  type LucideIcon,
} from 'lucide-react';

type Benefit = { title: string; text: string; icon: LucideIcon };
type PanelLink = { label: string; href: string };

type Audience = {
  id: string;
  tab: string;
  tabIcon: LucideIcon;
  headline: string;
  summary: string;
  benefits: readonly [Benefit, Benefit, Benefit];
  today: string;
  cta: PanelLink;
  secondary?: readonly PanelLink[];
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
      { title: 'Search your way', text: 'Filter by area and property type.', icon: Search },
      {
        title: 'Know the area',
        text: 'Explore cities and areas before you shortlist.',
        icon: MapPinned,
      },
      { title: 'Save and enquire', text: 'Save homes you like and send an enquiry.', icon: Heart },
    ],
    today:
      'Browse every listing without an account. A free account lets you save homes. Moving or need repairs? Browse property services.',
    cta: { label: 'Browse homes for sale', href: '/property-for-sale' },
    secondary: [
      { label: 'Homes to rent', href: '/property-to-rent' },
      { label: 'Property services', href: '/services' },
    ],
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
      { title: 'See who they are', text: 'Each agent has their own public page.', icon: Contact },
      {
        title: 'Reach them directly',
        text: 'Get in touch with the agent you choose.',
        icon: MessageSquare,
      },
    ],
    today:
      'Find an agent and ask them to list your property. Need repairs or photos first? Browse property services.',
    cta: { label: 'Find an agent', href: '/agents' },
    secondary: [{ label: 'Property services', href: '/services' }],
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
    today: 'Create your agent account and set up your profile. Publishing opens soon.',
    cta: { label: 'Set up your agent profile', href: '/advertise/sell/agents' },
  },
  {
    id: 'agencies',
    tab: 'Agencies',
    tabIcon: UsersRound,
    headline: 'One home for your agency, your team and your listings.',
    summary: 'Agency accounts are not open yet. See how it will work and get in touch.',
    benefits: [
      { title: 'Agency listings', text: 'Keep the agency’s listings together.', icon: Layers },
      { title: 'Your team', text: 'Bring your agents under one agency.', icon: Users },
      { title: 'Lead routing', text: 'Route enquiries to the right person.', icon: Network },
    ],
    today: 'Read the agency details and contact us. Accounts open soon.',
    cta: { label: 'See agency details', href: '/advertise/sell/agencies' },
    secondary: [{ label: 'Contact us', href: '/contact?area=agency_operations' }],
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
    today: 'Read the developer details and contact us. Accounts open soon.',
    cta: { label: 'See developer details', href: '/advertise/sell/developers' },
    secondary: [{ label: 'Contact us', href: '/contact?area=developer_operations' }],
  },
  {
    id: 'services',
    tab: 'Service providers',
    tabIcon: Wrench,
    headline: 'Be found by people who need a property service.',
    summary:
      'Service provider accounts are not open yet. The services directory is live, and you can see how provider access will work.',
    benefits: [
      {
        title: 'A service profile',
        text: 'Describe your business and the services you offer.',
        icon: ClipboardList,
      },
      {
        title: 'Your coverage',
        text: 'List the areas you work in so people know where you operate.',
        icon: MapPinned,
      },
      {
        title: 'Private requests',
        text: 'Once approved, requests arrive in your provider workspace.',
        icon: Inbox,
      },
    ],
    today: 'Read how provider access works and contact us. Accounts open soon.',
    cta: { label: 'See service provider details', href: '/advertise/services' },
    secondary: [
      { label: 'Contact us', href: '/contact?area=other' },
      { label: 'Browse the directory', href: '/services' },
    ],
  },
];

export function WhyPropertyListifySection() {
  const [activeId, setActiveId] = useState<string>(WHY_AUDIENCES[0].id);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const active = WHY_AUDIENCES.find(item => item.id === activeId) ?? WHY_AUDIENCES[0];

  const select = (id: string, focus = false) => {
    setActiveId(id);
    const node = tabRefs.current[id];
    if (!node) return;
    if (focus) node.focus();
    // Keep the chosen tab visible in the sideways-scrolling row on phones.
    node.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  };

  const focusTab = (index: number) => {
    select(WHY_AUDIENCES[(index + WHY_AUDIENCES.length) % WHY_AUDIENCES.length].id, true);
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
      aria-labelledby="home-why-heading"
      className="mt-14 md:mt-24"
    >
      <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-gradient-to-b from-slate-50 via-white to-blue-50/60 px-4 py-9 sm:px-6 md:rounded-[2rem] md:px-10 md:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#2774AE]/10 blur-3xl"
        />
        <div className="relative max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1f5f94]">
            Why Property Listify
          </p>
          <h2
            id="home-why-heading"
            className="mt-3 text-[1.75rem] font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-4xl md:text-[2.75rem]"
          >
            One place for every property move.
          </h2>
          <p className="mt-4 text-sm leading-6 text-slate-700 md:text-lg md:leading-8">
            Property Listify connects people who want a property with the agents, agencies,
            developers and service businesses who help them. Pick what describes you.
          </p>
        </div>

        <div className="relative mt-8">
          <div
            role="tablist"
            aria-label="Choose what describes you"
            className="-mx-1 flex gap-2 overflow-x-auto scroll-smooth px-1 pb-2 pr-10 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible lg:pr-1 [&::-webkit-scrollbar]:hidden"
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
                  onClick={() => select(item.id)}
                  onKeyDown={event => onKeyDown(event, index)}
                  className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2774AE] focus-visible:ring-offset-2 ${
                    selected
                      ? 'border-[#1f5f94] bg-[#1f5f94] text-white shadow-md shadow-blue-900/15'
                      : 'border-slate-300 bg-white text-slate-800 hover:border-[#2774AE]/50 hover:bg-blue-50'
                  }`}
                >
                  <TabIcon className="h-4 w-4" aria-hidden="true" />
                  {item.tab}
                </button>
              );
            })}
          </div>
          {/* Fade on the right edge tells phone users the row scrolls. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white via-white/80 to-transparent lg:hidden"
          />
        </div>

        {/* All panels share one grid cell on desktop so the tallest sets the height and the page never jumps. */}
        <div className="mt-5 lg:grid">
          {WHY_AUDIENCES.map(item => {
            const selected = item.id === active.id;
            return (
              <div
                key={item.id}
                role="tabpanel"
                id={`home-why-panel-${item.id}`}
                aria-labelledby={`home-why-tab-${item.id}`}
                aria-hidden={selected ? undefined : true}
                tabIndex={selected ? 0 : -1}
                className={`gap-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-30px_rgba(15,61,145,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2774AE] sm:p-7 lg:col-start-1 lg:row-start-1 lg:gap-10 lg:p-10 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] ${
                  selected
                    ? 'grid motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300'
                    : 'hidden lg:grid lg:invisible'
                }`}
              >
                <div className="flex flex-col">
                  <h3 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 md:text-[1.9rem]">
                    {item.headline}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-700 md:text-base md:leading-7">
                    {item.summary}
                  </p>
                  <div className="mt-5 rounded-2xl border-l-4 border-amber-400 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-900">
                      What you can do today
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-800">{item.today}</p>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1 xl:mt-auto xl:pt-6">
                    <a
                      href={item.cta.href}
                      className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#1f5f94] px-7 text-sm font-bold text-white shadow-md shadow-blue-900/20 transition hover:bg-[#174d7b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2774AE] focus-visible:ring-offset-2"
                    >
                      {item.cta.label}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                    {item.secondary && item.secondary.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                        {item.secondary.map(link => (
                          <a
                            key={link.href}
                            href={link.href}
                            className="inline-flex min-h-11 items-center whitespace-nowrap text-sm font-bold text-[#1f5f94] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2774AE]"
                          >
                            {link.label}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <ul className="grid content-start gap-3 sm:grid-cols-3">
                  {item.benefits.map(({ title, text, icon: Icon }) => (
                    <li
                      key={title}
                      className="group rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 transition motion-safe:hover:-translate-y-0.5 hover:border-[#2774AE]/40 hover:shadow-lg hover:shadow-blue-900/10"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-[#1f5f94] ring-1 ring-blue-200/70 transition group-hover:bg-[#1f5f94] group-hover:text-white">
                        <Icon className="h-7 w-7" aria-hidden="true" />
                      </div>
                      <h4 className="mt-4 text-base font-bold text-slate-900">{title}</h4>
                      <p className="mt-1.5 text-sm leading-6 text-slate-700">{text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
