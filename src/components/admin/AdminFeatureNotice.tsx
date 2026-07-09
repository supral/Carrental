import { Info } from "lucide-react";

export default function AdminFeatureNotice({
  title = "Coming soon",
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
      <Info className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-amber-900/90">{description}</p>
      </div>
    </div>
  );
}
