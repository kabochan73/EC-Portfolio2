type Props = {
  label: string;
  value: string | number;
};

export default function StatCard({ label, value }: Props) {
  return (
    <div className="border border-ink p-4">
      <p className="text-[11px] tracking-widest text-graphite uppercase">{label}</p>
      <p className="mt-2 text-2xl">{value}</p>
    </div>
  );
}
