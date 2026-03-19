import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { QUALIFICATION_DISCLAIMER_LINES, type AcceleratorFormValues } from './acceleratorTypes';

type Props = {
  values: AcceleratorFormValues;
  onChange: (next: Partial<AcceleratorFormValues>) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
};

export function AffordabilityForm({ values, onChange, onSubmit, isSubmitting }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Affordability Snapshot</CardTitle>
        <CardDescription>
          Add income details to generate an indicative affordability estimate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder="Buyer name (optional)"
            value={values.subjectName}
            onChange={event => onChange({ subjectName: event.target.value })}
          />
          <Input
            placeholder="Buyer phone (optional)"
            value={values.subjectPhone}
            onChange={event => onChange({ subjectPhone: event.target.value })}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder="Gross income monthly (required)"
            value={values.grossIncomeMonthly}
            onChange={event => onChange({ grossIncomeMonthly: event.target.value })}
            inputMode="numeric"
          />
          <Input
            placeholder="Deductions monthly"
            value={values.deductionsMonthly}
            onChange={event => onChange({ deductionsMonthly: event.target.value })}
            inputMode="numeric"
          />
          <Input
            placeholder="Deposit amount"
            value={values.depositAmount}
            onChange={event => onChange({ depositAmount: event.target.value })}
            inputMode="numeric"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder="Province filter"
            value={values.province}
            onChange={event => onChange({ province: event.target.value })}
          />
          <Input
            placeholder="City filter"
            value={values.city}
            onChange={event => onChange({ city: event.target.value })}
          />
          <Input
            placeholder="Suburb filter"
            value={values.suburb}
            onChange={event => onChange({ suburb: event.target.value })}
          />
        </div>

        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {QUALIFICATION_DISCLAIMER_LINES.map(line => (
            <p key={line}>{line}</p>
          ))}
        </div>

        <Button onClick={onSubmit} disabled={isSubmitting} className="w-full md:w-auto">
          {isSubmitting ? 'Calculating...' : 'Calculate Snapshot'}
        </Button>
      </CardContent>
    </Card>
  );
}
