import { CheckCircleIcon } from "./icons";

type ToastProps = {
  message: string;
  visible: boolean;
};

export function Toast({ message, visible }: ToastProps) {
  return (
    <div
      className={`pointer-events-none fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-neutral-900 px-4 py-3 text-sm text-white shadow-xl transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"
      }`}
    >
      <CheckCircleIcon className="h-4 w-4 text-[#FACC15]" />
      <span>{message}</span>
    </div>
  );
}
