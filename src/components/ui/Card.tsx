import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export default function Card({ hoverable, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-card",
        hoverable && "transition-shadow hover:shadow-card-hover cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-4 border-b border-slate-100 dark:border-slate-700", className)} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-xl", className)} {...props}>
      {children}
    </div>
  );
}
