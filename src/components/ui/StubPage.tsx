import { Construction } from 'lucide-react';

interface Props { title: string; description?: string; }

export function StubPage({ title, description }: Props) {
  return (
    <div className="p-6 flex flex-col gap-4">
      <div>
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-subtitle">{description}</p>}
      </div>
      <div className="card p-12 flex flex-col items-center justify-center gap-3 text-center">
        <Construction size={32} className="text-text-tertiary" />
        <div className="text-sm font-medium text-text-secondary">Under Construction</div>
        <div className="text-xs text-text-tertiary max-w-xs">
          No verified operational data is available for this section.
        </div>
      </div>
    </div>
  );
}
