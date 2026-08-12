/**
 * Public commercial product preview.
 *
 * Marketing copy belongs on this page, but sellable product facts come from
 * the canonical billing.commercialCatalog query through the typed client
 * boundary below.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check, TrendingUp } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/animations/advertiseAnimations';
import {
  formatCommercialAudience,
  formatCommercialLimitLabel,
  formatCommercialLimitValue,
  getCommercialActionPresentation,
  getCommercialPricePresentation,
  getCommercialPresentationLimits,
  getCommercialTermPresentation,
} from '@/lib/commercialCatalog';
import { useCommercialCatalog, type CommercialProduct } from '@/hooks/useCommercialCatalog';

export interface PricingPreviewSectionProps {
  title?: string;
  subtitle?: string;
}

function LoadingCard() {
  return (
    <div
      data-testid="commercial-catalog-loading-card"
      className="relative flex min-h-[430px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
      aria-hidden="true"
    >
      <div className="space-y-4 p-8">
        <div className="h-6 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
        <div className="mt-8 h-12 w-1/2 animate-pulse rounded bg-slate-200" />
        <div className="space-y-3 border-t border-slate-100 pt-8">
          <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function CatalogErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      data-testid="commercial-catalog-error"
      role="status"
      className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center"
    >
      <h4 className="text-xl font-bold text-slate-900">
        Current commercial details are unavailable
      </h4>
      <p className="mt-3 text-slate-600">
        We could not load the current product catalogue. Please retry or contact Property Listify
        for an assisted commercial enquiry.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
        >
          Retry
        </button>
        <a
          href="/contact"
          className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          Contact us
        </a>
      </div>
    </div>
  );
}

function CatalogEmptyState() {
  return (
    <div
      data-testid="commercial-catalog-empty"
      role="status"
      className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"
    >
      <h4 className="text-xl font-bold text-slate-900">Commercial products are being prepared</h4>
      <p className="mt-3 text-slate-600">
        There are no public products configured for this experience yet. Contact us if you would
        like to discuss an assisted commercial path.
      </p>
      <a
        href="/contact"
        className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
      >
        Contact us
      </a>
    </div>
  );
}

function productAccent(audience: CommercialProduct['audience']) {
  if (audience === 'agency') {
    return {
      border: 'border-orange-200',
      badge: 'bg-orange-50 text-orange-700',
      term: 'border-orange-100 bg-orange-50/70 text-orange-700',
      check: 'text-orange-600',
      button: 'bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-300',
    };
  }

  if (audience === 'developer') {
    return {
      border: 'border-emerald-200',
      badge: 'bg-emerald-50 text-emerald-700',
      term: 'border-emerald-100 bg-emerald-50/70 text-emerald-700',
      check: 'text-emerald-600',
      button: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-300',
    };
  }

  return {
    border: 'border-blue-200',
    badge: 'bg-blue-50 text-blue-700',
    term: 'border-blue-100 bg-blue-50/70 text-blue-700',
    check: 'text-blue-600',
    button: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-300',
  };
}

function ProductBenefits({ product }: { product: CommercialProduct }) {
  const benefits = product.benefits.filter(Boolean);
  const limits = getCommercialPresentationLimits(product);
  const accent = productAccent(product.audience);

  if (!benefits.length && !limits.length) {
    return (
      <p className="mb-8 text-sm font-medium text-slate-500">
        Product details are available through the assisted commercial path.
      </p>
    );
  }

  return (
    <div className="mb-8 space-y-6">
      {benefits.length > 0 && (
        <ul className="space-y-4" aria-label="Included benefits">
          {benefits.map((benefit, index) => (
            <li key={`${product.productId}-benefit-${index}`} className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">
                <Check className={`h-5 w-5 ${accent.check}`} aria-hidden="true" />
              </div>
              <span className="text-base font-medium leading-7 text-slate-600">{benefit}</span>
            </li>
          ))}
        </ul>
      )}

      {limits.length > 0 && (
        <div className="border-t border-slate-100 pt-5">
          <h5 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            Included limits
          </h5>
          <dl className="space-y-2 text-sm">
            {limits.map(([key, value]) => (
              <div key={`${product.productId}-limit-${key}`} className="flex justify-between gap-4">
                <dt className="text-slate-500">{formatCommercialLimitLabel(key)}</dt>
                <dd className="font-semibold text-slate-700">
                  {formatCommercialLimitValue(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: CommercialProduct }) {
  const price = getCommercialPricePresentation(product);
  const term = getCommercialTermPresentation(product);
  const action = getCommercialActionPresentation(product);
  const accent = productAccent(product.audience);
  const taxLabel =
    product.pricing.displayIncludesVat === true
      ? 'VAT included'
      : product.pricing.displayIncludesVat === false
        ? 'VAT excluded'
        : null;

  return (
    <motion.div
      data-testid="commercial-product-card"
      data-product-key={product.productKey}
      variants={staggerItem}
      className={`relative flex flex-col overflow-hidden rounded-3xl border bg-white shadow-xl transition-all duration-300 hover:-translate-y-1 ${accent.border} lg:my-4`}
    >
      <div className="flex-grow p-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-xl font-bold leading-tight text-slate-900 md:text-2xl">
            {product.displayName}
          </h4>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${accent.badge}`}
          >
            {formatCommercialAudience(product.audience)}
          </span>
        </div>
        {product.description && (
          <p className="mb-6 text-base leading-7 text-slate-500">{product.description}</p>
        )}

        <div
          data-testid="commercial-product-price"
          className="mb-8 flex items-baseline border-b border-slate-100 pb-8"
        >
          <span className="text-4xl font-extrabold text-slate-900">{price.label}</span>
          {price.period && <span className="ml-1 font-medium text-slate-500">{price.period}</span>}
        </div>

        <div className={`mb-8 rounded-2xl border p-4 ${accent.term}`}>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm font-medium">Access term</span>
            <span className="font-bold text-slate-900">{term.label}</span>
          </div>
          {term.renewalLabel && (
            <p className="mt-1 text-right text-xs font-medium">{term.renewalLabel}</p>
          )}
        </div>

        {taxLabel && <p className="-mt-5 mb-6 text-xs text-slate-500">{taxLabel}</p>}

        <ProductBenefits product={product} />

        {product.promotion.offer && product.promotion.status !== 'not_configured' && (
          <p className="mb-6 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            An active offer is available. Contact Property Listify for terms.
          </p>
        )}
      </div>

      <div className="mt-auto p-8 pt-0">
        {action.href ? (
          <a
            href={action.href}
            className={`flex w-full items-center justify-center rounded-xl px-6 py-4 font-semibold shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 hover:shadow-lg ${accent.button}`}
          >
            {action.label}
          </a>
        ) : (
          <button
            type="button"
            disabled={action.disabled}
            className="flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-100 px-6 py-4 font-semibold text-slate-500"
          >
            {action.label}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export const PricingPreviewSection: React.FC<PricingPreviewSectionProps> = ({
  title = 'Choose your 90-Day Launch Access',
  subtitle = 'Bring your inventory onto Property Listify, make it discoverable, capture enquiries and use the strongest supported business tools for 90 days.',
}) => {
  const { data: catalog, isLoading, isError, refetch } = useCommercialCatalog();
  const products = (catalog?.products ?? []).filter(
    product =>
      product.term.kind === 'paid_launch_access' &&
      ['agent', 'agency', 'developer'].includes(product.audience),
  );

  return (
    <section
      data-testid="pricing-preview-section"
      className="pricing-preview-section relative bg-slate-50 py-24"
      aria-labelledby="pricing-preview-heading"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="relative mb-16 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 p-8 text-center text-white shadow-2xl md:p-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <div className="pointer-events-none absolute right-0 top-0 -mr-10 -mt-10 opacity-20">
            <TrendingUp className="h-64 w-64 text-indigo-300" aria-hidden="true" />
          </div>
          <h2
            id="pricing-preview-heading"
            className="relative z-10 mb-6 text-3xl font-extrabold md:text-4xl"
          >
            Launch Access, clearly defined.
          </h2>
          <p className="relative z-10 mx-auto mb-10 max-w-3xl text-lg font-medium text-indigo-100 md:text-xl">
            Every product below is a once-off 90-day access term. Payment is manual EFT and access
            starts only after finance verifies the payment.
          </p>

          <div className="relative z-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/15 bg-blue-700/40 p-6 backdrop-blur-sm">
              <div className="mb-1 text-sm font-medium uppercase tracking-wider text-blue-100">
                Access term
              </div>
              <div className="text-3xl font-extrabold text-white">90 days</div>
              <div className="mt-2 text-xs text-blue-100">Starts after verified activation</div>
            </div>
            <div className="transform rounded-2xl border border-white/30 bg-white/10 p-6 backdrop-blur-sm md:-translate-y-2">
              <div className="mb-1 text-sm font-medium uppercase tracking-wider text-blue-100">
                Payment
              </div>
              <div className="text-4xl font-extrabold text-white">Once-off</div>
              <div className="mt-2 text-xs text-blue-100">Manual EFT with a payment reference</div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-indigo-700/40 p-6 backdrop-blur-sm">
              <div className="mb-1 text-sm font-medium uppercase tracking-wider text-indigo-100">
                Activation
              </div>
              <div className="text-3xl font-extrabold text-white">Verified</div>
              <div className="mt-2 text-xs text-indigo-100">No automatic renewal</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h3 className="mb-2 text-2xl font-bold text-slate-900 md:text-3xl">{title}</h3>
          <p className="text-slate-600">{subtitle}</p>
        </motion.div>

        {isLoading ? (
          <div
            data-testid="commercial-catalog-loading"
            className="grid grid-cols-1 gap-8 lg:grid-cols-3"
            aria-label="Loading commercial products"
          >
            {[0, 1, 2].map(index => (
              <LoadingCard key={index} />
            ))}
          </div>
        ) : isError ? (
          <CatalogErrorState onRetry={() => void refetch()} />
        ) : products.length === 0 ? (
          <CatalogEmptyState />
        ) : (
          <motion.div
            data-testid="commercial-catalog-products"
            className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-3"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-50px' }}
          >
            {products.map(product => (
              <ProductCard key={product.productId} product={product} />
            ))}
          </motion.div>
        )}

        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-sm text-slate-500">
            Product names, prices, terms, benefits and limits are read from
            billing.commercialCatalog. Payment is assisted through manual EFT and finance
            verification.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingPreviewSection;
