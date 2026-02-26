
import { Cpu } from "lucide-react";

export default function NoCodeMessage() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <Cpu className="h-16 w-16 text-squadrun-primary mb-4" />
      <h2 className="text-2xl font-bold text-white mb-2">No Code Selected</h2>
      <p className="text-squadrun-gray text-center">
        Please upload a file or select a file from a repository to start.
      </p>
    </div>
  );
}
