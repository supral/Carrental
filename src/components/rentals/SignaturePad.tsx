"use client";

import { useEffect, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  className?: string;
  label?: string;
};

export default function SignaturePad({ value, onChange, className, label = "Signature" }: Props) {
  const ref = useRef<SignatureCanvas | null>(null);

  useEffect(() => {
    if (value && ref.current && ref.current.isEmpty()) {
      ref.current.fromDataURL(value);
    }
  }, [value]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            ref.current?.clear();
            onChange(null);
          }}
        >
          Clear
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
        <SignatureCanvas
          ref={(instance) => {
            ref.current = instance;
          }}
          penColor="#0f172a"
          canvasProps={{
            className: "h-40 w-full touch-none",
            width: 600,
            height: 160,
          }}
          onEnd={() => {
            if (!ref.current || ref.current.isEmpty()) {
              onChange(null);
              return;
            }
            onChange(ref.current.toDataURL("image/png"));
          }}
        />
      </div>
    </div>
  );
}
