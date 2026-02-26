
import { Upload } from "lucide-react";

export default function NoFileMessage() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-squadrun-gray">
      <Upload className="h-16 w-16 mb-4 text-squadrun-primary/50" />
      <h3 className="text-xl font-medium text-white mb-2">No Code File Selected</h3>
      <p className="text-center max-w-md mb-6">
        Upload a code file using the file uploader above to start refactoring your code.
      </p>
      <div className="text-sm bg-squadrun-primary/10 p-4 rounded-md max-w-lg">
        <p className="mb-2">The refactoring agent can improve your code by:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Breaking down complex functions into smaller, focused ones</li>
          <li>Using descriptive variable and function names</li>
          <li>Replacing magic numbers with named constants</li>
          <li>Implementing safer resource management</li>
          <li>Abstracting logic into reusable components</li>
        </ul>
      </div>
    </div>
  );
}
