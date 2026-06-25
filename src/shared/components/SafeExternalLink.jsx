import { getSafeHttpHref } from '../../utils/safeUrl.util.js';

/**
 * Renders an external link only when href is http(s). Blocks javascript: / data: URLs from API payloads.
 */
export default function SafeExternalLink({ href, children, className, ...rest }) {
  const safeHref = getSafeHttpHref(href);
  if (!safeHref) return null;
  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      {...rest}
    >
      {children}
    </a>
  );
}
