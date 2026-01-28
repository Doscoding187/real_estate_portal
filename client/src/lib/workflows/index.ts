import { WizardWorkflow, WizardData, WizardStep } from '../types/wizard-workflows';
import { residentialSaleWorkflow } from './residential-sale';
import { residentialRentWorkflow } from './residential-rent';
import { residentialAuctionWorkflow } from './residential-auction';

export const WORKFLOWS: Record<string, WizardWorkflow> = {
  residential_sale: residentialSaleWorkflow,
  residential_rent: residentialRentWorkflow,
  residential_auction: residentialAuctionWorkflow,
};

export function getWorkflow(data: Partial<WizardData>): WizardWorkflow | null {
  if (data.developmentType === 'residential' && data.transactionType === 'for_sale') {
    return residentialSaleWorkflow;
  }
  if (data.developmentType === 'residential' && data.transactionType === 'for_rent') {
    return residentialRentWorkflow;
  }
  if (data.developmentType === 'residential' && data.transactionType === 'auction') {
    return residentialAuctionWorkflow;
  }
  // Add more conditions here as we implement more workflows
  return null;
}

export function getVisibleSteps(workflow: WizardWorkflow, data: WizardData): WizardStep[] {
  return workflow.steps.filter(step => !step.shouldShow || step.shouldShow(data));
}
