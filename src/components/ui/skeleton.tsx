import { cn } from "@/lib/utils";

/** Skeleton loading (item 3). */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-hairline/70", className)}
      {...props}
    />
  );
}

export { Skeleton };
