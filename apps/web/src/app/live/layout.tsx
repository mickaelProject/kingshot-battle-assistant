export default function LivePlayerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="live-player-root" data-app-surface="live">
      {children}
    </div>
  );
}
