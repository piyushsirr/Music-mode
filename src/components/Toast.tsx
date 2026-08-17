import { useToastStore } from '../store/useToastStore';

export function Toast() {
  const { message } = useToastStore();

  if (!message) return null;

  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 transition-all duration-300">
      <div className="bg-neutral-800 text-white px-6 py-3 rounded-md shadow-lg font-medium text-sm border border-white/10 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        {message}
      </div>
    </div>
  );
}
