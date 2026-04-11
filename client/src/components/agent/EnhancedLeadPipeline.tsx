import { LeadPipeline } from '@/components/agent/LeadPipeline';

type EnhancedLeadPipelineProps = {
  className?: string;
  propertyId?: number;
};

export function EnhancedLeadPipeline({ className, propertyId }: EnhancedLeadPipelineProps) {
  return <LeadPipeline className={className} propertyId={propertyId} />;
}
