/**
 * Public commercial product preview.
 *
 * Marketing copy belongs on this page, but sellable product facts come from
 * the canonical billing.commercialCatalog query through the typed client
 * boundary below.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Star, TrendingUp } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/animations/advertiseAnimations';
import {
  formatCommercialAudience,
  formatCommercialLimitLabel,
  getCommercialActionPresentation,
  getCommercialPricePresentation,
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

function ProductBenefits({ product }: { product: CommercialProduct }) {
  const benefits = product.benefits.filter(Boolean);
  const limits = Object.entries(product.limits).filter(([, value]) => value !== null);

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
                <Check
                  className={`h-5 w-5 ${product.popular ? 'text-indigo-500' : 'text-emerald-500'}`}
                  aria-hidden="true"
                />
              </div>
              <span className="text-sm font-medium text-slate-600">{benefit}</span>
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
                <dd className="font-semibold text-slate-700">{String(value)}</dd>
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
  const action = getCommercialActionPresentation(product);
  const taxLabel =
    product.pricing.displayIncludesVat === true
      ? 'VAT included'
      : product.pricing.displayIncludesVat === false
        ? 'VAT excluded'
        : null;

  return (
    <motion.div
      data-testid="commercial-product-card"
      variants={staggerItem}
      className={`relative flex flex-col overflow-hidden rounded-3xl border bg-white shadow-xl transition-all duration-300 hover:-translate-y-1 ${
        product.popular
          ? 'z-10 border-indigo-500 shadow-indigo-100 ring-2 ring-indigo-500/20 lg:scale-105'
          : 'border-slate-200 lg:my-4'
      }`}
    >
      {product.popular && (
        <div className="flex items-center justify-center gap-1 bg-indigo-500 py-1.5 text-center text-xs font-bold uppercase tracking-wider text-white">
          <Star className="h-3 w-3 fill-current" aria-hidden="true" />
          Most Popular
        </div>
      )}

      <div className="flex-grow p-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-xl font-bold text-slate-900">{product.displayName}</h4>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">
            {formatCommercialAudience(product.audience)}
          </span>
        </div>
        {product.description && (
          <p className="mb-6 text-sm text-slate-500">{product.description}</p>
        )}

        <div
          data-testid="commercial-product-price"
          className="mb-8 flex items-baseline border-b border-slate-100 pb-8"
        >
          <span className="text-4xl font-extrabold text-slate-900">{price.label}</span>
          {price.period && <span className="ml-1 font-medium text-slate-500">{price.period}</span>}
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
            className={`flex w-full items-center justify-center rounded-xl px-6 py-4 font-semibold shadow-md transition-all hover:shadow-lg ${
              product.popular
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
            }`}
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
  title = 'Commercial options for your business',
  subtitle = 'Current products, prices and next actions come from the Property Listify commercial catalogue.',
}) => {
  const { data: catalog, isLoading, isError, refetch } = useCommercialCatalog();
  const products = catalog?.products ?? [];

  return (
    <section
      data-testid="pricing-preview-section"
      className="pricing-preview-section relative bg-slate-50 py-24"
      aria-labelledby="pricing-preview-heading"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="relative mb-16 overflow-hidden rounded-3xl bg-indigo-600 p-8 text-center text-white shadow-2xl md:p-12"
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
            Make your next commercial step clear.
          </h2>
          <p className="relative z-10 mx-auto mb-10 max-w-3xl text-lg font-medium text-indigo-100 md:text-xl">
            Product availability, pricing and activation paths are supplied by the canonical
            commercial catalogue.
          </p>

          <div className="relative z-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-700/50 p-6 backdrop-blur-sm">
              <div className="mb-1 text-sm font-medium uppercase tracking-wider text-indigo-200">
                Pricing authority
              </div>
              <div className="text-3xl font-extrabold text-white">Live catalogue</div>
              <div className="mt-2 text-xs text-indigo-300">Current server-side product data</div>
            </div>
            <div className="transform rounded-2xl border border-emerald-500/30 bg-emerald-600/50 p-6 backdrop-blur-sm md:-translate-y-2">
              <div className="mb-1 text-sm font-medium uppercase tracking-wider text-emerald-100">
                Product access
              </div>
              <div className="text-4xl font-extrabold text-emerald-400">Plan-backed</div>
              <div className="mt-2 text-xs text-emerald-200">
                Benefits and limits from entitlements
              </div>
            </div>
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-700/50 p-6 backdrop-blur-sm">
              <div className="mb-1 text-sm font-medium uppercase tracking-wider text-indigo-200">
                Activation
              </div>
              <div className="text-3xl font-extrabold text-white">Assisted</div>
              <div className="mt-2 text-xs text-indigo-300">
                Manual EFT and finance verification
              </div>
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
            className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-3"
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
            Promotions and tax terms appear only when configured by the canonical commercial
            authority. Payment is currently assisted through manual EFT and finance verification.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingPreviewSection;
