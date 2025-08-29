import React, { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export default function CollapsibleSection({ 
  title, 
  icon, 
  children, 
  defaultExpanded = false 
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <button className="flex w-full items-center justify-between rounded-lg  bg-card px-4 py-3 text-left text-sm font-medium text-card-foreground hover:bg-accent hover:text-accent-foreground [&[data-state=open]>svg]:rotate-180">
          <div className="flex items-center gap-2">
            {icon && <span className="text-lg">{icon}</span>}
            <span>{title}</span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2">
        <div className="px-4 pb-4 pt-2">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
