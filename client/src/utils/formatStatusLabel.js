const preservedInitialisms = new Set(["API", "ID", "QR", "URL"]);

export function formatStatusLabel(status) {
  const normalizedStatus = String(status ?? "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();

  if (!normalizedStatus) {
    return "Unknown";
  }

  return normalizedStatus
    .split("_")
    .filter(Boolean)
    .map((word, index) => {
      if (preservedInitialisms.has(word)) {
        return word;
      }

      const lowerCaseWord = word.toLowerCase();
      return index === 0
        ? `${lowerCaseWord.charAt(0).toUpperCase()}${lowerCaseWord.slice(1)}`
        : lowerCaseWord;
    })
    .join(" ");
}
