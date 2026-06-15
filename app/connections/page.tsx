// Right-pane placeholder when no chat is selected (desktop). On mobile this main
// pane is hidden by the layout — the sidebar (the list) shows instead.

export default function ConnectionsIndex() {
  return (
    <div className="flex-1 flex items-center justify-center text-center px-6">
      <div>
        <div className="text-4xl">💘</div>
        <p className="mt-3 font-display text-2xl text-ink">your connections</p>
        <p className="mt-1 font-sans text-[13px] text-ink-mute">pick someone on the left to talk to.</p>
      </div>
    </div>
  );
}
