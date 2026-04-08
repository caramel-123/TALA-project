type EmptyDiagnoseStateProps = {
  title: string;
  description: string;
};

export function EmptyDiagnoseState({ title, description }: EmptyDiagnoseStateProps) {
  return (
    <section className="rounded-xl border border-[var(--light-gray)] bg-white p-8">
      <h3 className="text-base font-semibold text-[var(--navy-blue)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--mid-gray)]">{description}</p>
    </section>
  );
}
