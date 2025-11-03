import { toast } from "sonner"

// Simple wrapper to maintain compatibility with existing code
export const useToast = () => {
  return {
    toast: (props: {
      title?: string;
      description?: string;
      variant?: "default" | "destructive";
    }) => {
      if (props.variant === "destructive") {
        // For error toasts, show title if available, otherwise description
        const message = props.title ? 
          (props.description ? `${props.title}: ${props.description}` : props.title) :
          (props.description || "An error occurred");
        return toast.error(message);
      }
      
      // For success toasts, show title if available, otherwise description
      const message = props.title ? 
        (props.description ? `${props.title}: ${props.description}` : props.title) :
        (props.description || "Success");
      return toast.success(message);
    },
    dismiss: toast.dismiss,
  };
};

// Export the toast function directly for convenience
export { toast };
