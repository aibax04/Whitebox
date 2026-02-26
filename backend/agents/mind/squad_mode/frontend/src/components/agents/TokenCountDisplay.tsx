import { formatTokenCount, isTokenLimitExceeded, calculateTotalTokens } from "@/utils/aiUtils/tokenCounter";
import { FileEntry } from "./hooks/InspectRepoSelectorHook";

interface TokenCountDisplayProps {
  files: Array<{ content?: string }>;
  label: string;
}

export default function TokenCountDisplay({ files, label }: TokenCountDisplayProps) {
  const totalTokens = calculateTotalTokens(files);
  const formattedCount = formatTokenCount(totalTokens);
  const isExceeded = isTokenLimitExceeded(totalTokens);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-squadrun-gray">{label}:</span>
      <span className={`font-mono ${isExceeded ? 'text-red-500' : 'text-white'}`}>
        {formattedCount} tokens
      </span>
      {isExceeded && (
        <span className="text-red-500 text-xs">(Exceeds 4M token limit)</span>
      )}
    </div>
  );
} 