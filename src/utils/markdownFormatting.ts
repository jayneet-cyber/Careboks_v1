export const hasMarkdownFormatting = (value: string): boolean => {
  return /(\*\*[^*]+\*\*)|(^\s*[-*+]\s)|(^\s*\d+\.\s)/m.test(value);
};

export const formatPlainTextAsMarkdown = (value: string): string => {
  const normalized = value
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();
  if (!normalized || hasMarkdownFormatting(normalized)) {
    return normalized;
  }

  const sourceLines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const candidateLines = sourceLines.length > 1
    ? sourceLines
    : normalized
        .replace(/\s+/g, " ")
        .split(/(?<=[.!?])\s+(?=[A-Z0-9])/) 
        .map((line) => line.trim())
        .filter(Boolean);

  if (candidateLines.length <= 1) {
    return normalized;
  }

  const formattedLines = candidateLines.map((line) => {
    const lineWithoutLeadingBullet = line.replace(/^[-*+]\s+/, "").trim();
    return lineWithoutLeadingBullet.replace(/^([^:\n]{2,80}:)\s*/, "**$1** ");
  });

  return formattedLines.map((line) => `- ${line}`).join("\n");
};