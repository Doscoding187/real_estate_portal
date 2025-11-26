import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { trpc } from '@/lib/trpc';
import { CalendarIcon, DollarSign, Clock, Zap } from 'lucide-react';
import { format } from 'date-fns';

interface Step4Props {
  data: any;
  updateData: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
  campaignId: number;
}

const Step4Budget: React.FC<Step4Props> = ({ data, updateData, onNext, onBack, campaignId }) => {
  const [budget, setBudget] = useState({
    budgetType: data.budgetType || 'daily',
    budgetAmount: data.budgetAmount || '',
    billingMethod: data.billingMethod || 'ppc',
    startDate: data.startDate || new Date(),
    endDate: data.endDate || null,
    frequency: data.frequency || 'continuous',
  });

  const updateBudgetMutation = trpc.marketing.updateBudget.useMutation();
  const updateScheduleMutation = trpc.marketing.updateSchedule.useMutation();

  const handleNext = async () => {
    try {
      // Update budget
      await updateBudgetMutation.mutateAsync({
        campaignId,
        budget: {
          budgetType: budget.budgetType as 'daily' | 'lifetime',
          budgetAmount: budget.budgetAmount,
          billingMethod: budget.billingMethod as any,
        },
      });

      // Update schedule
      await updateScheduleMutation.mutateAsync({
        campaignId,
        schedule: {
          startDate: budget.startDate,
          endDate: budget.endDate,
          frequency: budget.frequency as any,
          autoPacing: true,
        },
      });

      updateData(budget);
      onNext();
    } catch (error) {
      console.error('Failed to update budget/schedule');
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Budget & Schedule</h2>
        <p className="text-slate-500">Set your spending limits and campaign duration</p>
      </div>

      <div className="space-y-6">
        {/* Budget Type */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-600" />
            Budget Type
          </Label>
          <RadioGroup
            value={budget.budgetType}
            onValueChange={(value) => setBudget({ ...budget, budgetType: value })}
          >
            <div className="grid grid-cols-2 gap-4">
              <label
                className={`cursor-pointer border rounded-xl p-4 transition-all ${
                  budget.budgetType === 'daily'
                    ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                    : 'border-slate-200 hover:border-blue-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="daily" id="daily" className="mt-1" />
                  <div>
                    <p className="font-medium text-slate-900">Daily Budget</p>
                    <p className="text-sm text-slate-500 mt-1">Spend up to this amount per day</p>
                  </div>
                </div>
              </label>

              <label
                className={`cursor-pointer border rounded-xl p-4 transition-all ${
                  budget.budgetType === 'lifetime'
                    ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                    : 'border-slate-200 hover:border-blue-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="lifetime" id="lifetime" className="mt-1" />
                  <div>
                    <p className="font-medium text-slate-900">Lifetime Budget</p>
                    <p className="text-sm text-slate-500 mt-1">Total budget for entire campaign</p>
                  </div>
                </div>
              </label>
            </div>
          </RadioGroup>
        </div>

        {/* Budget Amount */}
        <div className="space-y-3">
          <Label>Budget Amount (ZAR)</Label>
          <Input
            type="number"
            placeholder="e.g. 5000"
            value={budget.budgetAmount}
            onChange={(e) => setBudget({ ...budget, budgetAmount: e.target.value })}
          />
        </div>

        {/* Billing Method */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            Billing Method
          </Label>
          <Select
            value={budget.billingMethod}
            onValueChange={(value) => setBudget({ ...budget, billingMethod: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ppc">Pay Per Click (PPC)</SelectItem>
              <SelectItem value="ppv">Pay Per View (PPV)</SelectItem>
              <SelectItem value="per_lead">Pay Per Lead</SelectItem>
              <SelectItem value="per_boost">Pay Per Boost</SelectItem>
              <SelectItem value="flat_fee">Flat Fee</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Schedule */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Campaign Schedule
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-slate-600">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {budget.startDate ? format(budget.startDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={budget.startDate}
                    onSelect={(date) => setBudget({ ...budget, startDate: date || new Date() })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-slate-600">End Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {budget.endDate ? format(budget.endDate, 'PPP') : 'No end date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={budget.endDate}
                    onSelect={(date) => setBudget({ ...budget, endDate: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!budget.budgetAmount || updateBudgetMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
        >
          {updateBudgetMutation.isPending ? 'Saving...' : 'Next Step'}
        </Button>
      </div>
    </div>
  );
};

export default Step4Budget;
