import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface DeploymentStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
}

export interface DeploymentProgressProps {
  steps: DeploymentStep[];
  currentStep?: number;
  className?: string;
}

export function DeploymentProgress({ steps, className }: DeploymentProgressProps) {
  const completedSteps = steps.filter((s) => s.status === 'success').length;
  const totalSteps = steps.length;
  const progress = (completedSteps / totalSteps) * 100;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <p className="text-label font-medium">Deployment Progress</p>
        <p className="text-caption text-muted">
          {completedSteps}/{totalSteps} steps
        </p>
      </div>
      <Progress value={progress} />
      <ol className="space-y-2">
        {steps.map((step, idx) => (
          <li
            key={idx}
            className={cn(
              'flex items-center gap-2 text-label',
              step.status === 'pending' && 'text-muted',
              step.status === 'running' && 'text-primary',
              step.status === 'success' && 'text-success',
              step.status === 'failed' && 'text-error',
            )}
          >
            <span className="w-4 text-center">
              {step.status === 'success' && '✓'}
              {step.status === 'failed' && '✕'}
              {step.status === 'running' && '●'}
              {step.status === 'pending' && '○'}
            </span>
            <span>{step.name}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
