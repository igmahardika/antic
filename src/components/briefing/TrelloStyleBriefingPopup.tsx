import React from 'react';

type Props = {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  briefing?: any;
  onSave?: (v: any) => void;
  onDelete?: (id: string | number) => void;
};

// Temporary shim to satisfy imports; replace with the real implementation later.
export default function TrelloStyleBriefingPopup({ open, onOpenChange, briefing, onSave, onDelete }: Props) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', zIndex: 50 }}>
      <div style={{ background: 'white', padding: 16, maxWidth: 720, width: '90%', borderRadius: 12 }}>
        <h3 style={{ margin: 0, marginBottom: 8 }}>Briefing (placeholder)</h3>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(briefing, null, 2)}</pre>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button onClick={() => onOpenChange?.(false)}>Close</button>
          <button onClick={() => onSave?.(briefing)}>Save</button>
          <button onClick={() => onDelete?.(briefing?.id ?? '')}>Delete</button>
        </div>
      </div>
    </div>
  );
}
