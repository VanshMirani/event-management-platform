export function ResilientImage({ fallbackSrc, onError, src, ...imageProps }) {
  function handleImageError(event) {
    const image = event.currentTarget;
    const resolvedFallback = new URL(fallbackSrc, document.baseURI).href;

    if (image.src !== resolvedFallback) {
      image.src = resolvedFallback;
    }

    onError?.(event);
  }

  return (
    <img
      {...imageProps}
      onError={handleImageError}
      src={src || fallbackSrc}
    />
  );
}
