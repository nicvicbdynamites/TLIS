import { useToast } from "@/hooks/use-toast";

export function useNotify() {
  const { toast } = useToast();

  return {
    success(title: string, description?: string) {
      toast({
        title,
        description,
        className: "border-emerald-500/30 bg-emerald-950/80 text-emerald-200",
      });
    },
    error(title: string, description?: string) {
      toast({
        title,
        description,
        variant: "destructive",
      });
    },
    warning(title: string, description?: string) {
      toast({
        title,
        description,
        className: "border-amber-500/30 bg-amber-950/80 text-amber-200",
      });
    },
    info(title: string, description?: string) {
      toast({
        title,
        description,
        className: "border-primary/30 bg-primary/10 text-foreground",
      });
    },
    loading(title: string, description?: string) {
      toast({
        title,
        description,
        className: "border-muted/40 bg-muted/20 text-muted-foreground",
        duration: 30000,
      });
    },
  };
}
