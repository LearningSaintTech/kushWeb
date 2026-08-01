/**
 * Shared SVG icons for header and other components.
 * Use with className for size/color, e.g. <SearchIcon className="h-5 w-5 text-black" />
 */

export function SearchIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      className={className}
    >
      <path
        d="M8.7751 16.8751C13.2486 16.8751 16.8751 13.2486 16.8751 8.77505C16.8751 4.30152 13.2486 0.675003 8.7751 0.675003C4.30156 0.675003 0.675049 4.30152 0.675049 8.77505C0.675049 13.2486 4.30156 16.8751 8.7751 16.8751Z"
        stroke="currentColor"
        strokeWidth="1.35001"
      />
      <path
        d="M18.6759 18.675L15.78 15.7791"
        stroke="currentColor"
        strokeWidth="1.35001"
      />
    </svg>
  )
}

export function HeartIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="37"
      height="32"
      viewBox="0 0 37 32"
      fill="none"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M27.1444 15.6345C28.0228 14.7326 28.5108 13.515 28.501 12.2495C28.4912 10.984 27.9845 9.77421 27.0923 8.88635C26.6505 8.44672 26.1273 8.09936 25.5527 7.86408C24.9781 7.62881 24.3633 7.51024 23.7434 7.51513C22.4914 7.52502 21.2945 8.03724 20.4161 8.93909C20.1776 9.18018 19.8745 9.47611 19.5067 9.82687L18.4843 10.8L17.4619 9.82687C17.0934 9.47527 16.7898 9.17934 16.5513 8.93909C15.666 8.04423 14.4652 7.54151 13.2132 7.54151C11.9612 7.54151 10.7605 8.04423 9.87514 8.93909C8.05143 10.7837 8.03031 13.766 9.80805 15.6194L18.4843 24.3892L27.1444 15.6345ZM8.82042 7.87425C9.39723 7.29107 10.0821 6.82845 10.8358 6.51282C11.5895 6.19719 12.3974 6.03474 13.2132 6.03474C14.0291 6.03474 14.8369 6.19719 15.5906 6.51282C16.3444 6.82845 17.0292 7.29107 17.606 7.87425C17.8321 8.10363 18.1249 8.38909 18.4843 8.73064C18.8421 8.38909 19.1349 8.10321 19.3626 7.873C20.5186 6.68657 22.0935 6.0129 23.7409 6.00018C25.3883 5.98747 26.9732 6.63675 28.147 7.80519C29.3208 8.97363 29.9872 10.5655 29.9998 12.2307C30.0124 13.8958 29.37 15.4978 28.2141 16.6842L19.3626 25.6324C19.1297 25.8678 18.8137 26 18.4843 26C18.1549 26 17.839 25.8678 17.606 25.6324L8.75209 16.683C7.61667 15.4994 6.98741 13.9118 7.00019 12.2632C7.01298 10.6146 7.66678 9.03723 8.82042 7.87174V7.87425Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function CartIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="37"
      height="31"
      viewBox="0 0 37 31"
      fill="none"
      className={className}
    >
      <path
        d="M5.5 4.92186H8.75L13.625 19.9219H28.25L31.5 7.92186H12.8125"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M16.0625 22.2969C16.9927 22.2969 17.625 22.9771 17.625 23.6719C17.625 24.3666 16.9927 25.0469 16.0625 25.0469C15.1323 25.0469 14.5 24.3666 14.5 23.6719C14.5 22.9771 15.1323 22.2969 16.0625 22.2969Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M25.8125 22.2969C26.7427 22.2969 27.375 22.9771 27.375 23.6719C27.375 24.3666 26.7427 25.0469 25.8125 25.0469C24.8823 25.0469 24.25 24.3666 24.25 23.6719C24.25 22.9771 24.8823 22.2969 25.8125 22.2969Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  )
}

export function NotificationIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M6 9.5a6 6 0 1 1 12 0c0 3.2.86 5.05 1.5 6.1.28.46-.05 1.05-.6 1.05H5.1c-.55 0-.88-.59-.6-1.05.64-1.05 1.5-2.9 1.5-6.1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 18.5a2.5 2.5 0 0 0 5 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ProfileIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="8"
        r="3.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M5.75 19.25c.9-2.85 3.1-4.25 6.25-4.25s5.35 1.4 6.25 4.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function GiftCardIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M11.5 6.5V20M11.5 6.5C11.15 5.25 10.6 4.2 9.9 3.45C9.2 2.7 8.35 2.25 7.5 2.25C6.85 2.25 6.2 2.5 5.7 2.95C5.2 3.4 4.9 4 4.9 4.65C4.9 5.3 5.2 5.9 5.7 6.35C6.2 6.8 6.85 7.05 7.5 7.05M11.5 6.5C11.85 5.25 12.4 4.2 13.1 3.45C13.8 2.7 14.65 2.25 15.5 2.25C16.15 2.25 16.8 2.5 17.3 2.95C17.8 3.4 18.1 4 18.1 4.65C18.1 5.3 17.8 5.9 17.3 6.35C16.8 6.8 16.15 7.05 15.5 7.05M19 10.5V18.25C19 18.65 18.85 19.05 18.55 19.35C18.25 19.65 17.85 19.8 17.45 19.8H5.55C5.15 19.8 4.75 19.65 4.45 19.35C4.15 19.05 4 18.65 4 18.25V10.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 6.75H4C3.59 6.75 3.25 7.09 3.25 7.5V9.25C3.25 9.66 3.59 10 4 10H19C19.41 10 19.75 9.66 19.75 9.25V7.5C19.75 7.09 19.41 6.75 19 6.75Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LocationIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      className={className}
    >
      <path
        d="M5.16607 3.9875C8.3875 0.766069 13.6125 0.766069 16.8339 3.9875C20.0554 7.20893 20.0554 12.4339 16.8339 15.6554L16.8261 15.6632L12.4976 19.8236C12.0949 20.2101 11.5583 20.4259 11.0001 20.4256C10.4419 20.4253 9.90548 20.209 9.50321 19.822L5.17393 15.664L5.16607 15.6554C1.94464 12.4339 1.94464 7.20893 5.16607 3.9875ZM11 6.67857C10.1665 6.67857 9.36706 7.00969 8.77766 7.59909C8.18826 8.18849 7.85714 8.98789 7.85714 9.82143C7.85714 10.655 8.18826 11.4544 8.77766 12.0438C9.36706 12.6332 10.1665 12.9643 11 12.9643C11.8335 12.9643 12.6329 12.6332 13.2223 12.0438C13.8117 11.4544 14.1429 10.655 14.1429 9.82143C14.1429 8.98789 13.8117 8.18849 13.2223 7.59909C12.6329 7.00969 11.8335 6.67857 11 6.67857Z"
        fill="currentColor"
      />
    </svg>
  )
}
