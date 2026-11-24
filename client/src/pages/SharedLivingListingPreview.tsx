import { useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Building2,
  Check,
  FileCheck2,
  Home,
  ImagePlus,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { HomeLayout } from '@/layouts/HomeLayout';
import { isSharedLivingPreviewEnabled } from '@/lib/sharedLivingPreviewFixtures';
import {
  SHARED_LIVING_ACCOMMODATION_LABELS,
  SHARED_LIVING_ACCOMMODATION_TYPES,
  type SharedLivingAccommodationType,
} from '@shared/sharedLivingDomain';

type DemoSpace = {
  id: string;
  name: string;
  type: SharedLivingAccommodationType;
  market: 'room_share' | 'independent_micro' | 'student';
  rent: string;
  rentBasis: 'per_space' | 'per_person';
  occupancy: string;
  availability: 'available' | 'occupied' | 'unavailable';
  availableFrom: string;
  furnished: 'furnished' | 'partial' | 'unfurnished' | 'unknown';
  bathroom: 'own' | 'shared' | 'unknown';
  description: string;
  facilities: string[];
  electricity: 'included' | 'excluded' | 'to_be_confirmed';
  water: 'included' | 'excluded' | 'to_be_confirmed';
  wifi: 'included' | 'excluded' | 'to_be_confirmed';
  photoName: string;
};

const steps = [
  'Choose your listing',
  'Residence details',
  'Advertising authority',
  'Accommodation spaces',
  'Review and submit',
];
const facilities = [
  ['private_bathroom', 'Private bathroom'],
  ['kitchenette', 'Kitchenette'],
  ['private_entrance', 'Private entrance'],
  ['secure_parking', 'Secure parking'],
  ['bed', 'Bed'],
  ['desk', 'Desk'],
  ['wardrobe', 'Wardrobe'],
  ['study_area', 'Study area'],
  ['shared_kitchen', 'Shared kitchen'],
  ['wifi', 'Wi-Fi'],
] as const;
const roomImage = '/properties/property-detail-preview-v1/principal-suite.webp';
const cottageImage = '/properties/property-detail-preview-v1/living-kitchen.webp';
const studentImage = '/properties/property-detail-preview-v1/study.webp';

function makeSpace(index: number, preset: 'single' | 'multi'): DemoSpace {
  if (preset === 'single')
    return {
      id: `demo-space-${index + 1}`,
      name: 'Garden cottage',
      type: 'garden_cottage',
      market: 'independent_micro',
      rent: '7200',
      rentBasis: 'per_space',
      occupancy: '2',
      availability: 'available',
      availableFrom: '2026-12-01',
      furnished: 'furnished',
      bathroom: 'own',
      description:
        'A self-contained cottage with a kitchenette, private entrance and a bright living area. This is fictional preview copy.',
      facilities: ['private_bathroom', 'kitchenette', 'private_entrance', 'secure_parking'],
      electricity: 'included',
      water: 'included',
      wifi: 'to_be_confirmed',
      photoName: '',
    };
  if (index === 0)
    return {
      id: `demo-space-${index + 1}`,
      name: 'Student single room',
      type: 'private_room',
      market: 'student',
      rent: '6500',
      rentBasis: 'per_space',
      occupancy: '1',
      availability: 'available',
      availableFrom: '2027-01-01',
      furnished: 'furnished',
      bathroom: 'shared',
      description:
        'A single-occupancy room with a desk and access to shared study and kitchen areas. This is fictional preview copy.',
      facilities: ['bed', 'desk', 'wardrobe', 'study_area'],
      electricity: 'included',
      water: 'included',
      wifi: 'to_be_confirmed',
      photoName: '',
    };
  return {
    id: `demo-space-${index + 1}`,
    name: 'Student shared room',
    type: 'shared_room',
    market: 'student',
    rent: '3500',
    rentBasis: 'per_person',
    occupancy: '2',
    availability: 'available',
    availableFrom: '2027-01-01',
    furnished: 'furnished',
    bathroom: 'shared',
    description:
      'A shared room with two sleeping spaces and access to the residence study area. Rent is per person. This is fictional preview copy.',
    facilities: ['bed', 'desk', 'wardrobe', 'study_area'],
    electricity: 'included',
    water: 'included',
    wifi: 'to_be_confirmed',
    photoName: '',
  };
}

function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-sm font-semibold text-slate-800">{children}</span>;
}

export default function SharedLivingListingPreview() {
  const [step, setStep] = useState(0);
  const [listingMode, setListingMode] = useState<'single' | 'multi'>('single');
  const [submitted, setSubmitted] = useState(false);
  const [residenceName, setResidenceName] = useState('Acacia Garden Home');
  const [residenceType, setResidenceType] = useState<
    'house' | 'apartment' | 'townhouse' | 'student_residence' | 'other'
  >('house');
  const [privateAddress, setPrivateAddress] = useState('24 Example Lane, Preview District');
  const [residencePhoto, setResidencePhoto] = useState('');
  const [responsibleRole, setResponsibleRole] = useState<'owner' | 'landlord' | 'operator'>(
    'owner',
  );
  const [grantorName, setGrantorName] = useState('Sam Example');
  const [grantorEmail, setGrantorEmail] = useState('sam@example.invalid');
  const [effectiveDate, setEffectiveDate] = useState('2026-11-24');
  const [expiryDate, setExpiryDate] = useState('2027-11-24');
  const [mandateFile, setMandateFile] = useState('');
  const [spaces, setSpaces] = useState<DemoSpace[]>([makeSpace(0, 'single')]);
  const exampleArea =
    listingMode === 'multi' ? 'Morningside, Johannesburg' : 'Randburg, Johannesburg';

  const updateSpace = (id: string, update: Partial<DemoSpace>) =>
    setSpaces(current => current.map(space => (space.id === id ? { ...space, ...update } : space)));
  const selectMode = (mode: 'single' | 'multi') => {
    setListingMode(mode);
    setResidenceName(mode === 'single' ? 'Acacia Garden Home' : 'Morningside Student Residence');
    setResidenceType(mode === 'single' ? 'house' : 'student_residence');
    setSpaces(
      mode === 'single' ? [makeSpace(0, 'single')] : [makeSpace(0, 'multi'), makeSpace(1, 'multi')],
    );
    setStep(0);
    setSubmitted(false);
  };
  const next = () => setStep(current => Math.min(steps.length - 1, current + 1));
  const previous = () => setStep(current => Math.max(0, current - 1));
  const demoImage = (space: DemoSpace) =>
    space.type === 'garden_cottage'
      ? cottageImage
      : space.market === 'student'
        ? studentImage
        : roomImage;

  if (!isSharedLivingPreviewEnabled)
    return (
      <HomeLayout>
        <main id="main-content" className="mx-auto min-h-[60vh] max-w-3xl px-4 py-16">
          <h1 className="text-2xl font-bold">This product preview is not available here.</h1>
          <Link href="/shared-living" className="mt-4 inline-flex text-emerald-800 underline">
            Return to Shared Living
          </Link>
        </main>
      </HomeLayout>
    );

  return (
    <HomeLayout>
      <main id="main-content" className="min-h-screen bg-[#f4f7f8] text-slate-900">
        <section className="bg-gradient-to-br from-[#062846] via-[#0c4568] to-[#0c765e] text-white">
          <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
            <Link
              href="/shared-living"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-100 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Shared Living
            </Link>
            <div className="mt-7 flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-200">
                  Interactive product preview
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                  List accommodation as a Property Listify agent
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-sky-100 md:text-base">
                  Walk through a fictional example of creating one accommodation space or managing
                  several under one residence.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-100/10 px-4 py-2 text-sm font-bold text-amber-50">
                <ShieldCheck className="h-4 w-4" />
                Preview only · no data is saved
              </span>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-7 md:px-8 md:py-10">
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <strong>This walkthrough is not the authenticated listing workspace.</strong> It uses
            fictional content and local-only form state. It cannot upload evidence, create
            inventory, submit for review or publish a listing. Use “List your accommodation” to
            enter the real agent-gated workspace.
          </div>

          <nav
            aria-label="Listing preview progress"
            className="mt-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-2"
          >
            <div className="md:hidden">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-bold text-slate-900">
                  Step {step + 1} of {steps.length}
                </span>
                <span className="text-sm font-semibold text-slate-600">{steps[step]}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-700 transition-all"
                  style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>
            <ol className="hidden grid-cols-5 gap-1 md:grid">
              {steps.map((label, index) => (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => {
                      if (index <= step) setStep(index);
                    }}
                    aria-current={index === step ? 'step' : undefined}
                    className={`w-full rounded-xl px-3 py-3 text-left text-xs font-semibold md:text-sm ${index === step ? 'bg-emerald-800 text-white' : index < step ? 'bg-emerald-50 text-emerald-900' : 'text-slate-400'}`}
                  >
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-current">
                      {index < step ? <Check className="h-4 w-4" /> : index + 1}
                    </span>
                    {label}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          {submitted ? (
            <section
              role="status"
              className="mt-6 rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm md:p-10"
            >
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                <Check className="h-7 w-7" />
              </span>
              <p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-emerald-800">
                Preview walkthrough complete
              </p>
              <h2 className="mt-2 text-3xl font-bold">
                Your example is ready for the real review journey.
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                No residence, mandate evidence, photograph or accommodation space was sent or saved.
                A real submission requires an agent account, a current approved mandate, canonical
                Place assignment and separate reviewer approval for the residence and each space.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/shared-living/list"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white"
                >
                  Sign in to list accommodation <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/shared-living"
                  className="inline-flex items-center rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-800"
                >
                  Back to marketplace
                </Link>
              </div>
            </section>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">
                  Step {step + 1} of {steps.length}
                </p>
                {step === 0 && (
                  <div className="mt-3">
                    <h2 className="text-2xl font-bold">How much accommodation are you listing?</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Both options use one residence record. Each accommodation space keeps its own
                      rent, occupancy, facilities and availability.
                    </p>
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => selectMode('single')}
                        aria-pressed={listingMode === 'single'}
                        className={`rounded-2xl border p-5 text-left transition ${listingMode === 'single' ? 'border-emerald-700 bg-emerald-50 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-slate-400'}`}
                      >
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-emerald-800 shadow-sm">
                          <Home className="h-6 w-6" />
                        </span>
                        <h3 className="mt-4 text-lg font-bold">One space at one property</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          An agent represents the homeowner or landlord and lists one cottage or
                          room.
                        </p>
                        <span className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-900">
                          {listingMode === 'single' ? 'Selected' : 'Select this journey'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => selectMode('multi')}
                        aria-pressed={listingMode === 'multi'}
                        className={`rounded-2xl border p-5 text-left transition ${listingMode === 'multi' ? 'border-emerald-700 bg-emerald-50 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-slate-400'}`}
                      >
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-blue-800 shadow-sm">
                          <Building2 className="h-6 w-6" />
                        </span>
                        <h3 className="mt-4 text-lg font-bold">Several spaces at one residence</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          An agent represents an owner or residence operator, enters the property
                          once, then manages spaces independently.
                        </p>
                        <span className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-900">
                          {listingMode === 'multi'
                            ? 'Selected · 2 sample spaces'
                            : 'Select this journey'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="mt-3">
                    <h2 className="text-2xl font-bold">Tell us about the residence</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      This shared information belongs to the parent residence. We never show its
                      private street address on public search or detail pages.
                    </p>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <label>
                        <Label>Residence or property name</Label>
                        <input
                          value={residenceName}
                          onChange={e => setResidenceName(e.target.value)}
                          className="w-full rounded-xl border p-3"
                        />
                      </label>
                      <label>
                        <Label>Property type</Label>
                        <select
                          value={residenceType}
                          onChange={e => setResidenceType(e.target.value as typeof residenceType)}
                          className="w-full rounded-xl border p-3"
                        >
                          <option value="house">House</option>
                          <option value="apartment">Apartment</option>
                          <option value="townhouse">Townhouse</option>
                          <option value="student_residence">Student residence</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                      <label className="sm:col-span-2">
                        <Label>Private street address · never shown publicly</Label>
                        <input
                          value={privateAddress}
                          onChange={e => setPrivateAddress(e.target.value)}
                          className="w-full rounded-xl border p-3"
                        />
                        <span className="mt-1 block text-xs text-slate-500">
                          Fictional value in this walkthrough. Exact address stays private in the
                          real platform.
                        </span>
                      </label>
                      <div className="sm:col-span-2">
                        <Label>Public location · approved Property Listify Place</Label>
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
                          <MapPin className="h-4 w-4 shrink-0" />
                          {exampleArea} · example only
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          The real listing uses the canonical Place selector; this preview does not
                          assign or save a Place.
                        </p>
                      </div>
                      <label className="sm:col-span-2">
                        <Label>Residence photograph · local preview only</Label>
                        <span className="flex items-center gap-2 rounded-xl border border-dashed p-3 text-sm">
                          <ImagePlus className="h-4 w-4 text-emerald-800" />
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={e => setResidencePhoto(e.target.files?.[0]?.name || '')}
                          />
                          {residencePhoto && (
                            <span className="text-emerald-800">{residencePhoto}</span>
                          )}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          No file is uploaded in this preview.
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="mt-3">
                    <h2 className="text-2xl font-bold">Confirm who has authorized this listing</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      An agent must have verifiable permission for this specific residence. A
                      reviewer assesses the evidence before any space can be submitted for
                      publication.
                    </p>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <label>
                        <Label>Responsible property party</Label>
                        <select
                          value={responsibleRole}
                          onChange={e =>
                            setResponsibleRole(e.target.value as typeof responsibleRole)
                          }
                          className="w-full rounded-xl border p-3"
                        >
                          <option value="owner">Homeowner</option>
                          <option value="landlord">Landlord</option>
                          <option value="operator">Residence operator</option>
                        </select>
                      </label>
                      <label>
                        <Label>Grantor's full name</Label>
                        <input
                          value={grantorName}
                          onChange={e => setGrantorName(e.target.value)}
                          className="w-full rounded-xl border p-3"
                        />
                      </label>
                      <label>
                        <Label>Grantor email</Label>
                        <input
                          type="email"
                          value={grantorEmail}
                          onChange={e => setGrantorEmail(e.target.value)}
                          className="w-full rounded-xl border p-3"
                        />
                      </label>
                      <label>
                        <Label>Mandate effective date</Label>
                        <input
                          type="date"
                          value={effectiveDate}
                          onChange={e => setEffectiveDate(e.target.value)}
                          className="w-full rounded-xl border p-3"
                        />
                      </label>
                      <label>
                        <Label>Mandate expiry date</Label>
                        <input
                          type="date"
                          min={effectiveDate}
                          value={expiryDate}
                          onChange={e => setExpiryDate(e.target.value)}
                          className="w-full rounded-xl border p-3"
                        />
                      </label>
                      <label>
                        <Label>Signed mandate or equivalent evidence</Label>
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          onChange={e => setMandateFile(e.target.files?.[0]?.name || '')}
                          className="w-full rounded-xl border p-2.5 text-sm"
                        />
                        <span className="mt-1 block text-xs text-slate-500">
                          {mandateFile
                            ? `Selected locally: ${mandateFile}`
                            : 'Choose a sample file to see the step. It stays in this browser.'}
                        </span>
                      </label>
                    </div>
                    <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                      <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0" />
                      <p>
                        <strong>Authority is not approved in this preview.</strong> Real inventory
                        requires independent review of residence-specific evidence. Without active
                        approval, spaces cannot be published and new enquiries cannot be sent to the
                        agent.
                      </p>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="mt-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-bold">Set up each accommodation space</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                          Space information is independent. Editing rent, occupancy or availability
                          on one space does not change another.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSpaces(current => [
                            ...current,
                            {
                              ...makeSpace(current.length, listingMode),
                              id: `demo-space-${Date.now()}`,
                              name: 'Additional private room',
                            },
                          ])
                        }
                        className="rounded-xl border border-emerald-700 px-4 py-2.5 text-sm font-bold text-emerald-900"
                      >
                        + Add another space
                      </button>
                    </div>
                    <div className="mt-5 space-y-5">
                      {spaces.map((space, index) => (
                        <article
                          key={space.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex gap-3">
                              <img
                                src={demoImage(space)}
                                alt="Local example accommodation"
                                className="h-16 w-20 rounded-xl object-cover"
                              />
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                                  Space {index + 1}
                                </p>
                                <h3 className="mt-1 font-bold">{space.name || 'Untitled space'}</h3>
                              </div>
                            </div>
                            {spaces.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setSpaces(current => current.filter(item => item.id !== space.id))
                                }
                                className="text-xs font-semibold text-slate-600 underline"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <label>
                              <Label>Space name</Label>
                              <input
                                value={space.name}
                                onChange={e => updateSpace(space.id, { name: e.target.value })}
                                className="w-full rounded-lg border bg-white p-2.5"
                              />
                            </label>
                            <label>
                              <Label>Accommodation type</Label>
                              <select
                                value={space.type}
                                onChange={e =>
                                  updateSpace(space.id, {
                                    type: e.target.value as SharedLivingAccommodationType,
                                  })
                                }
                                className="w-full rounded-lg border bg-white p-2.5"
                              >
                                {SHARED_LIVING_ACCOMMODATION_TYPES.map(type => (
                                  <option key={type} value={type}>
                                    {SHARED_LIVING_ACCOMMODATION_LABELS[type]}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              <Label>Monthly rent (R)</Label>
                              <input
                                type="number"
                                min="0"
                                value={space.rent}
                                onChange={e => updateSpace(space.id, { rent: e.target.value })}
                                className="w-full rounded-lg border bg-white p-2.5"
                              />
                            </label>
                            <label>
                              <Label>Price basis</Label>
                              <select
                                value={space.rentBasis}
                                onChange={e =>
                                  updateSpace(space.id, {
                                    rentBasis: e.target.value as DemoSpace['rentBasis'],
                                  })
                                }
                                className="w-full rounded-lg border bg-white p-2.5"
                              >
                                <option value="per_space">Per space</option>
                                <option value="per_person">Per person</option>
                              </select>
                            </label>
                            <label>
                              <Label>Maximum occupancy</Label>
                              <input
                                type="number"
                                min="1"
                                value={space.occupancy}
                                onChange={e => updateSpace(space.id, { occupancy: e.target.value })}
                                className="w-full rounded-lg border bg-white p-2.5"
                              />
                            </label>
                            <label>
                              <Label>Availability status</Label>
                              <select
                                value={space.availability}
                                onChange={e =>
                                  updateSpace(space.id, {
                                    availability: e.target.value as DemoSpace['availability'],
                                  })
                                }
                                className="w-full rounded-lg border bg-white p-2.5"
                              >
                                <option value="available">Available</option>
                                <option value="occupied">Occupied</option>
                                <option value="unavailable">Unavailable</option>
                              </select>
                            </label>
                            <label>
                              <Label>Available from</Label>
                              <input
                                type="date"
                                value={space.availableFrom}
                                onChange={e =>
                                  updateSpace(space.id, { availableFrom: e.target.value })
                                }
                                className="w-full rounded-lg border bg-white p-2.5"
                              />
                            </label>
                            <label>
                              <Label>Furnishing</Label>
                              <select
                                value={space.furnished}
                                onChange={e =>
                                  updateSpace(space.id, {
                                    furnished: e.target.value as DemoSpace['furnished'],
                                  })
                                }
                                className="w-full rounded-lg border bg-white p-2.5"
                              >
                                <option value="unknown">To be confirmed</option>
                                <option value="furnished">Furnished</option>
                                <option value="partial">Part furnished</option>
                                <option value="unfurnished">Unfurnished</option>
                              </select>
                            </label>
                            <label>
                              <Label>Bathroom access</Label>
                              <select
                                value={space.bathroom}
                                onChange={e =>
                                  updateSpace(space.id, {
                                    bathroom: e.target.value as DemoSpace['bathroom'],
                                  })
                                }
                                className="w-full rounded-lg border bg-white p-2.5"
                              >
                                <option value="unknown">To be confirmed</option>
                                <option value="own">Private</option>
                                <option value="shared">Shared</option>
                              </select>
                            </label>
                            <label className="sm:col-span-2">
                              <Label>Space description</Label>
                              <textarea
                                rows={3}
                                value={space.description}
                                onChange={e =>
                                  updateSpace(space.id, { description: e.target.value })
                                }
                                className="w-full rounded-lg border bg-white p-2.5"
                              />
                            </label>
                            <fieldset className="sm:col-span-2">
                              <legend className="mb-2 text-sm font-semibold text-slate-800">
                                Space facilities
                              </legend>
                              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                                {facilities.map(([code, name]) => (
                                  <label
                                    key={code}
                                    className="flex items-center gap-2 rounded-lg border bg-white p-2 text-xs"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={space.facilities.includes(code)}
                                      onChange={e =>
                                        updateSpace(space.id, {
                                          facilities: e.target.checked
                                            ? [...space.facilities, code]
                                            : space.facilities.filter(value => value !== code),
                                        })
                                      }
                                    />
                                    {name}
                                  </label>
                                ))}
                              </div>
                            </fieldset>
                            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
                              {(['electricity', 'water', 'wifi'] as const).map(utility => (
                                <label key={utility} className="capitalize">
                                  <Label>{utility}</Label>
                                  <select
                                    value={space[utility]}
                                    onChange={e =>
                                      updateSpace(space.id, {
                                        [utility]: e.target.value as DemoSpace[typeof utility],
                                      })
                                    }
                                    className="w-full rounded-lg border bg-white p-2.5 text-sm"
                                  >
                                    <option value="included">Included</option>
                                    <option value="excluded">Excluded</option>
                                    <option value="to_be_confirmed">To be confirmed</option>
                                  </select>
                                </label>
                              ))}
                            </div>
                            <label className="sm:col-span-2">
                              <Label>Space photograph · local preview only</Label>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={e =>
                                  updateSpace(space.id, {
                                    photoName: e.target.files?.[0]?.name || '',
                                  })
                                }
                                className="w-full rounded-lg border bg-white p-2.5 text-sm"
                              />
                              <span className="mt-1 block text-xs text-slate-500">
                                {space.photoName
                                  ? `Selected locally: ${space.photoName}`
                                  : 'The bundled sample photograph remains in the preview. No file is uploaded.'}
                              </span>
                            </label>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="mt-3">
                    <h2 className="text-2xl font-bold">Review the residence and spaces</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      The public location is approximate. The residence and each accommodation space
                      go through separate review decisions.
                    </p>
                    <div className="mt-5 rounded-2xl bg-slate-900 p-5 text-white">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">
                            Residence · example preview
                          </p>
                          <h3 className="mt-1 text-xl font-bold">
                            {residenceName || 'Your residence name'}
                          </h3>
                          <p className="mt-1 text-sm text-slate-300">
                            {residenceType.replace('_', ' ')} · {exampleArea} (illustrative)
                          </p>
                        </div>
                        <span className="rounded-full bg-amber-300/15 px-3 py-1 text-xs font-bold text-amber-100">
                          Mandate requires review
                        </span>
                      </div>
                      <p className="mt-4 rounded-xl bg-white/10 p-3 text-sm text-slate-200">
                        Private street address hidden ·{' '}
                        {privateAddress ? 'entered in draft' : 'not entered'}
                      </p>
                      <p className="mt-3 text-xs text-slate-300">
                        {responsibleRole} · {grantorName || 'grantor to add'} ·{' '}
                        {grantorEmail || 'grantor email to add'} · mandate{' '}
                        {effectiveDate || 'start date'} to {expiryDate || 'expiry date'}
                      </p>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {spaces.map(space => (
                        <article
                          key={space.id}
                          className="overflow-hidden rounded-2xl border bg-white"
                        >
                          <img
                            src={demoImage(space)}
                            alt="Fictional accommodation preview"
                            className="h-44 w-full object-cover"
                          />
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                                  {SHARED_LIVING_ACCOMMODATION_LABELS[space.type]}
                                </p>
                                <h3 className="mt-1 font-bold">{space.name || 'Untitled space'}</h3>
                              </div>
                              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900">
                                Needs approval
                              </span>
                            </div>
                            <p className="mt-2 text-lg font-bold text-emerald-800">
                              R {Number(space.rent || 0).toLocaleString('en-ZA')} / month{' '}
                              {space.rentBasis === 'per_person' ? 'per person' : 'per space'}
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                              <Users className="h-4 w-4" />
                              Up to {space.occupancy} · {space.availability} · from{' '}
                              {space.availableFrom || 'date to confirm'}
                            </p>
                            <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                              {space.description}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {space.facilities.slice(0, 4).map(code => (
                                <span
                                  key={code}
                                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs"
                                >
                                  {facilities.find(([value]) => value === code)?.[1] || code}
                                </span>
                              ))}
                            </div>
                            <p className="mt-3 text-xs text-slate-500">
                              Electricity {space.electricity.replace('_', ' ')} · Water{' '}
                              {space.water.replace('_', ' ')} · Wi-Fi {space.wifi.replace('_', ' ')}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                      <p>
                        On a real submission, the reviewer separately approves the residence and
                        every space. A space stays private unless its parent residence, active
                        mandate and its own review are approved.
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-5">
                  <button
                    type="button"
                    onClick={previous}
                    disabled={step === 0}
                    className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 font-semibold disabled:opacity-40"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  {step < steps.length - 1 ? (
                    <button
                      type="button"
                      onClick={next}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white"
                    >
                      Continue <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSubmitted(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white"
                    >
                      Preview submission <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </section>

              <aside className="space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                    Your journey
                  </p>
                  <h2 className="mt-2 font-bold">One residence, independent spaces</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Shared facilities and location belong to the residence. Rent, occupancy,
                    availability and room features belong to each space.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-sm font-semibold">
                    <Building2 className="h-4 w-4 text-emerald-800" />
                    {residenceName || 'Residence'}
                  </div>
                  <div className="mt-2 space-y-2">
                    {spaces.map((space, index) => (
                      <p
                        key={space.id}
                        className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-xs"
                      >
                        <BedDouble className="h-4 w-4 text-blue-800" />
                        Space {index + 1}: {space.name || 'Untitled'} · R{' '}
                        {Number(space.rent || 0).toLocaleString('en-ZA')}{' '}
                        {space.rentBasis === 'per_person' ? 'per person' : 'per space'}
                      </p>
                    ))}
                  </div>
                </section>
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <h2 className="font-bold text-emerald-950">Live listing journey</h2>
                  <p className="mt-2 text-sm leading-6 text-emerald-950">
                    The real workspace checks your account, mandate evidence, canonical Place and
                    reviewer approval before anything becomes public.
                  </p>
                  <Link
                    href="/shared-living/list"
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-800 bg-white px-4 py-3 text-sm font-bold text-emerald-900"
                  >
                    List your accommodation <ArrowRight className="h-4 w-4" />
                  </Link>
                </section>
              </aside>
            </div>
          )}
        </div>
      </main>
    </HomeLayout>
  );
}
