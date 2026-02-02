import { Fragment } from 'react';

interface MentionHighlightProps {
  content: string;
  className?: string;
}

const MentionHighlight = ({ content, className = '' }: MentionHighlightProps) => {
  // Regex to match @mentions (@ followed by word characters)
  const mentionRegex = /(@\w+)/g;
  
  // Split content by mentions while keeping the mentions in the array
  const parts = content.split(mentionRegex);
  
  if (parts.length === 1) {
    // No mentions found, return plain text
    return <p className={className}>{content}</p>;
  }

  return (
    <p className={className}>
      {parts.map((part, index) => {
        if (mentionRegex.test(part)) {
          // Reset regex lastIndex for next test
          mentionRegex.lastIndex = 0;
          return (
            <span
              key={index}
              className="text-primary font-medium bg-primary/10 rounded px-0.5"
            >
              {part}
            </span>
          );
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </p>
  );
};

export default MentionHighlight;

