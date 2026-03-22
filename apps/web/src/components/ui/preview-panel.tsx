export function PreviewPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="preview-panel">
      <div className="preview-panel__title">{title}</div>
      <div className="preview-panel__body">{children}</div>
    </div>
  );
}
