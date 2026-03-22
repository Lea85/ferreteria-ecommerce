import Link from "next/link";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1 as const, href: "/checkout/datos", label: "Datos" },
  { id: 2 as const, href: "/checkout/envio", label: "Envío" },
  { id: 3 as const, href: "/checkout/pago", label: "Pago" },
];

type CheckoutStepperProps = {
  currentStep: 1 | 2 | 3;
};

export function CheckoutStepper({ currentStep }: CheckoutStepperProps) {
  return (
    <nav aria-label="Progreso del checkout" className="w-full border-b border-border bg-muted/30 py-4">
      <ol className="mx-auto flex max-w-3xl items-center justify-between px-4">
        {STEPS.map((step, index) => {
          const done = step.id < currentStep;
          const active = step.id === currentStep;
          return (
            <li key={step.id} className="flex flex-1 items-center">
              <Link
                href={step.href}
                className="group flex flex-col items-center gap-1.5 text-center"
              >
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                    done &&
                      "border-primary bg-primary text-primary-foreground",
                    active &&
                      !done &&
                      "border-store-orange bg-store-orange text-store-orange-foreground shadow-md",
                    !active &&
                      !done &&
                      "border-border bg-background text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-5" /> : step.id}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold sm:text-sm",
                    active || done
                      ? "text-foreground"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {step.label}
                </span>
              </Link>
              {index < STEPS.length - 1 ? (
                <div
                  className={cn(
                    "mx-1 hidden h-0.5 min-w-[2rem] flex-1 sm:mx-3 sm:block",
                    currentStep > step.id ? "bg-primary/50" : "bg-border",
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
