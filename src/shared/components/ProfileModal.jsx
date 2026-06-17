import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HandCoins, Gift } from 'lucide-react'
import { useAuth } from '../../app/context/AuthContext'
import { useCartWishlist } from '../../app/context/CartWishlistContext'
import { ROUTES } from '../../utils/constants'
import { HeartIcon, CartIcon } from '../ui/icons'

function CloseIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function LocationPinIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="32" viewBox="0 0 32 32" fill="none">
  <g clip-path="url(#clip0_13241_16031)">
    <path d="M15.7476 14.3203C18.6848 14.3203 21.0745 11.9307 21.0745 8.99344C21.0745 6.05619 18.6848 3.66656 15.7476 3.66656C12.8103 3.66656 10.4207 6.05619 10.4207 8.99344C10.4207 11.9307 12.8103 14.3203 15.7476 14.3203ZM15.7476 4.91656C17.9956 4.91656 19.8245 6.74544 19.8245 8.99344C19.8245 11.2414 17.9955 13.0703 15.7476 13.0703C13.4996 13.0703 11.6707 11.2414 11.6707 8.99344C11.6707 6.74544 13.4996 4.91656 15.7476 4.91656ZM31.717 31.1819L26.5147 15.1709C26.431 14.9134 26.191 14.739 25.9203 14.739H22.6291C23.6923 13.1407 24.7411 11.2197 24.7411 8.99344C24.7411 4.03444 20.7066 0 15.7476 0C10.7886 0 6.75408 4.03444 6.75408 8.99344C6.75408 11.2195 7.80283 13.1406 8.86602 14.739H5.79358C5.52283 14.739 5.28283 14.9134 5.19914 15.1709L-0.00310519 31.1819C-0.0649177 31.3721 -0.0319177 31.5805 0.0857073 31.7424C0.20327 31.9042 0.39127 32 0.591332 32H31.1226C31.3226 32 31.5106 31.9042 31.6282 31.7424C31.7458 31.5805 31.7788 31.3721 31.717 31.1819ZM15.7476 1.25C20.0173 1.25 23.4911 4.72369 23.4911 8.9935C23.4911 10.9579 22.5236 12.6623 21.4781 14.2115L15.7476 22.7031L10.0171 14.2114C8.97152 12.6621 8.00408 10.9576 8.00408 8.99344C8.00408 4.72369 11.4778 1.25 15.7476 1.25ZM1.45158 30.75L6.24771 15.989H9.70871L15.2295 24.1699C15.3457 24.3421 15.5399 24.4453 15.7476 24.4453C15.9553 24.4453 16.1495 24.3421 16.2656 24.1699L21.7865 15.989H25.4661L30.2623 30.75H1.45158Z" fill="black"/>
  </g>
  <defs>
    <clipPath id="clip0_13241_16031">
      <rect width="32" height="32" fill="white" transform="translate(-0.143066)"/>
    </clipPath>
  </defs>
</svg>
  )
}

function PackageIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
}

function TagIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="32" viewBox="0 0 32 32" fill="none">
    <path d="M19.8568 10.666L11.8568 18.666M14.3554 28.682L11.6488 27.0753C10.9608 26.6673 10.6181 26.4633 10.2354 26.4527C9.82477 26.4393 9.47544 26.6353 8.73277 27.0753C7.90077 27.5687 6.24744 28.9287 5.1781 28.2807C4.52344 27.8833 4.52344 26.8753 4.52344 24.8607V10.666C4.52344 6.89535 4.52344 5.00868 5.69544 3.83802C6.8661 2.66602 8.75277 2.66602 12.5234 2.66602H19.1901C22.9608 2.66602 24.8474 2.66602 26.0181 3.83802C27.1901 5.00868 27.1901 6.89535 27.1901 10.666V24.8607C27.1901 26.8753 27.1901 27.8833 26.5368 28.2807C25.4661 28.9287 23.8128 27.5687 22.9808 27.0753C22.2941 26.6673 21.9501 26.4633 21.5701 26.4527C21.1568 26.4393 20.8074 26.6353 20.0661 27.0753L17.3594 28.682C16.6288 29.1153 16.2634 29.3327 15.8568 29.3327C15.4501 29.3327 15.0848 29.1153 14.3554 28.682Z" stroke="black" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M19.8564 18.666H19.8444M11.8684 10.666H11.8564" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  )
}

function WalletIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="30" viewBox="0 0 28 28" fill="none">
  <path d="M4.70312 7.67577C8.68246 5.60911 13.7458 3.70244 18.4698 2.54044C19.8518 2.20044 21.2798 2.71177 21.9985 3.93977C22.5118 4.81711 23.1385 6.01977 23.8011 7.59177M19.2331 20.7478C19.2965 22.1678 20.3911 23.2258 21.8105 23.2824C22.5338 23.3118 23.4331 23.3324 24.5238 23.3324C25.6145 23.3324 26.5138 23.3118 27.2371 23.2824C28.6571 23.2258 29.7511 22.1678 29.8145 20.7478C29.8398 20.1698 29.8571 19.4784 29.8571 18.6658C29.8571 17.8531 29.8398 17.1618 29.8145 16.5838C29.7511 15.1638 28.6565 14.1058 27.2371 14.0491C26.3331 14.0144 25.4285 13.9977 24.5238 13.9991C23.4331 13.9991 22.5338 14.0198 21.8105 14.0491C20.3905 14.1058 19.2965 15.1638 19.2331 16.5838C19.2036 17.2774 19.1894 17.9715 19.1905 18.6658C19.1905 19.4791 19.2078 20.1698 19.2331 20.7478Z" stroke="black" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M27.1063 14.0434C27.0647 12.9283 26.9995 11.8143 26.9109 10.702C26.7723 9.00136 25.4516 7.72203 23.7496 7.60403C21.7896 7.46803 18.7656 7.33203 14.5236 7.33203C10.2816 7.33203 7.25693 7.46803 5.29693 7.60403C3.5956 7.72136 2.27493 9.00136 2.13627 10.702C1.99293 12.458 1.85693 15.074 1.85693 18.6654C1.85693 22.2567 1.99293 24.872 2.13627 26.6287C2.27493 28.3294 3.5956 29.6087 5.2976 29.7267C7.25693 29.8627 10.2816 29.9987 14.5236 29.9987C18.7656 29.9987 21.7903 29.8627 23.7496 29.7267C25.4516 29.6094 26.7723 28.3294 26.9109 26.6287C26.9836 25.74 27.0543 24.6314 27.1063 23.2874M23.8569 17.9987V19.332" stroke="black" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
  )
}

function CoinsIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="30" viewBox="0 0 28 28" fill="none">
      <path d="M25.1726 18.65C26.0581 17.261 26.5271 15.6473 26.524 14C26.524 9.21333 22.644 5.33333 17.8573 5.33333C16.146 5.33333 14.5506 5.82933 13.2073 6.68467C12.3133 6.73511 11.4285 6.89131 10.5713 7.15C11.2224 6.45691 11.969 5.86023 12.7886 5.378C14.3146 4.47884 16.0528 4.00314 17.824 4H17.8573C23.38 4 27.8573 8.47733 27.8573 14C27.8573 14.0898 27.8562 14.1793 27.854 14.2687L27.8526 14.3007C27.8056 15.9806 27.333 17.6211 26.4793 19.0687C25.9971 19.8883 25.4004 20.6349 24.7073 21.286C24.9613 20.444 25.1213 19.5613 25.1726 18.65Z" fill="black" />
      <path fill-rule="evenodd" clip-rule="evenodd" d="M17.0381 15.1107C16.8543 14.5906 16.5138 14.1404 16.0634 13.822C15.613 13.5035 15.075 13.3326 14.5234 13.3327V12.666H13.1901V13.3327C12.4829 13.3327 11.8046 13.6136 11.3045 14.1137C10.8044 14.6138 10.5234 15.2921 10.5234 15.9993C10.5234 16.7066 10.8044 17.3849 11.3045 17.885C11.8046 18.3851 12.4829 18.666 13.1901 18.666V21.3327C12.6101 21.3327 12.1161 20.9627 11.9321 20.444C11.9048 20.3592 11.8608 20.2806 11.8026 20.2131C11.7444 20.1456 11.6733 20.0904 11.5934 20.0508C11.5135 20.0112 11.4265 19.9881 11.3376 19.9827C11.2486 19.9774 11.1594 19.9899 11.0754 20.0196C10.9913 20.0493 10.9141 20.0955 10.8482 20.1556C10.7824 20.2157 10.7292 20.2883 10.6919 20.3693C10.6546 20.4503 10.634 20.5379 10.6311 20.627C10.6283 20.7161 10.6434 20.8048 10.6754 20.888C10.8592 21.4081 11.1998 21.8583 11.6502 22.1767C12.1005 22.4952 12.6385 22.6661 13.1901 22.666V23.3327H14.5234V22.666C15.2307 22.666 15.909 22.3851 16.4091 21.885C16.9092 21.3849 17.1901 20.7066 17.1901 19.9993C17.1901 19.2921 16.9092 18.6138 16.4091 18.1137C15.909 17.6136 15.2307 17.3327 14.5234 17.3327V14.666C15.1034 14.666 15.5974 15.036 15.7814 15.5547C15.8087 15.6395 15.8528 15.7181 15.911 15.7856C15.9691 15.8531 16.0403 15.9083 16.1201 15.9479C16.2 15.9875 16.287 16.0106 16.376 16.016C16.465 16.0213 16.5541 16.0088 16.6382 15.9791C16.7222 15.9494 16.7994 15.9032 16.8653 15.8431C16.9312 15.783 16.9843 15.7104 17.0216 15.6294C17.0589 15.5484 17.0796 15.4608 17.0824 15.3717C17.0852 15.2826 17.0702 15.1939 17.0381 15.1107ZM13.1901 14.666C12.8365 14.666 12.4973 14.8065 12.2473 15.0565C11.9972 15.3066 11.8568 15.6457 11.8568 15.9993C11.8568 16.353 11.9972 16.6921 12.2473 16.9422C12.4973 17.1922 12.8365 17.3327 13.1901 17.3327V14.666ZM14.5234 21.3327C14.8771 21.3327 15.2162 21.1922 15.4662 20.9422C15.7163 20.6921 15.8568 20.353 15.8568 19.9993C15.8568 19.6457 15.7163 19.3066 15.4662 19.0565C15.2162 18.8065 14.8771 18.666 14.5234 18.666V21.3327Z" fill="black" />
      <path fill-rule="evenodd" clip-rule="evenodd" d="M23.8569 18C23.8569 23.5227 19.3796 28 13.8569 28C8.33427 28 3.85693 23.5227 3.85693 18C3.85693 12.4773 8.33427 8 13.8569 8C19.3796 8 23.8569 12.4773 23.8569 18ZM22.5236 18C22.5236 22.7867 18.6436 26.6667 13.8569 26.6667C9.07027 26.6667 5.19027 22.7867 5.19027 18C5.19027 13.2133 9.07027 9.33333 13.8569 9.33333C18.6436 9.33333 22.5236 13.2133 22.5236 18Z" fill="black" />
    </svg>
  )
}

function PhoneIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="32" viewBox="0 0 32 32" fill="none">
    <path d="M6.5236 28.513C6.33427 28.513 6.1756 28.449 6.0476 28.321C5.92049 28.1939 5.85693 28.0357 5.85693 27.8463C5.85693 27.6561 5.92049 27.4974 6.0476 27.3703C6.1756 27.2423 6.33427 27.1783 6.5236 27.1783H25.1903C25.3805 27.1783 25.5392 27.2423 25.6663 27.3703C25.7934 27.4974 25.8569 27.6561 25.8569 27.8463C25.8569 28.0357 25.7934 28.1939 25.6663 28.321C25.5392 28.449 25.3805 28.513 25.1903 28.513H6.5236ZM6.5236 4.81966C6.33427 4.81966 6.1756 4.75611 6.0476 4.62899C5.92049 4.50188 5.85693 4.34366 5.85693 4.15433C5.85693 3.96411 5.92049 3.80544 6.0476 3.67833C6.1756 3.55033 6.33427 3.48633 6.5236 3.48633H25.1903C25.3805 3.48633 25.5392 3.55033 25.6663 3.67833C25.7934 3.80544 25.8569 3.96411 25.8569 4.15433C25.8569 4.34366 25.7934 4.50188 25.6663 4.62899C25.5392 4.75699 25.3805 4.82099 25.1903 4.82099L6.5236 4.81966ZM6.0116 25.333C5.39738 25.333 4.88493 25.1277 4.47427 24.717C4.0636 24.3063 3.85782 23.7934 3.85693 23.1783V8.82099C3.85693 8.20677 4.06271 7.69433 4.47427 7.28366C4.88582 6.87299 5.39782 6.66722 6.01027 6.66633H25.7036C26.3169 6.66633 26.8289 6.87211 27.2396 7.28366C27.6503 7.69522 27.856 8.20766 27.8569 8.82099V23.1797C27.8569 23.793 27.6512 24.3054 27.2396 24.717C26.828 25.1285 26.316 25.3339 25.7036 25.333H6.0116ZM9.2676 23.9997H11.4569H20.2569H22.4476H25.7036C25.908 23.9997 26.096 23.9143 26.2676 23.7437C26.4392 23.573 26.5245 23.3846 26.5236 23.1783V8.82099C26.5236 8.61566 26.4383 8.42722 26.2676 8.25566C26.0969 8.08411 25.9089 7.99877 25.7036 7.99966H6.01027C5.80582 7.99966 5.61782 8.08499 5.44627 8.25566C5.27471 8.42633 5.18938 8.61477 5.19027 8.82099V23.1797C5.19027 23.3841 5.2756 23.5721 5.44627 23.7437C5.61693 23.9152 5.80493 24.0005 6.01027 23.9997H9.2676Z" fill="black"/>
    <path d="M13.1904 10.666L10.1907 10.9993C10.1907 10.9993 9.85736 13.9991 13.1904 17.3321C16.5235 20.6652 19.5239 20.3325 19.5239 20.3325L19.8572 17.3328L17.5234 15.9996L16.3572 17.1658C16.3572 17.1658 15.5239 16.9992 14.524 15.9992C13.5241 14.9993 13.3574 14.1661 13.3574 14.1661L14.5236 12.9998L13.1904 10.666Z" stroke="black" stroke-width="0.933333"/>
  </svg>
  )
}

function DocumentIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function ChevronRightIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}
function PrivacyPolicyIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M15.1916 21.6409H16.5249V14.1035H15.1916V21.6409ZM15.8582 12.0008C16.0911 12.0008 16.2862 11.9222 16.4436 11.7648C16.6 11.6075 16.6782 11.4128 16.6782 11.1809C16.6782 10.948 16.5996 10.7528 16.4422 10.5955C16.2849 10.4382 16.0902 10.36 15.8582 10.3608C15.6262 10.3617 15.4316 10.4404 15.2742 10.5968C15.1169 10.7533 15.0382 10.9484 15.0382 11.1822C15.0382 11.416 15.1169 11.6106 15.2742 11.7662C15.4316 11.9217 15.6262 12 15.8582 12.0008ZM15.8582 27.9502C13.1791 27.1546 10.9538 25.532 9.18224 23.0822C7.41068 20.6324 6.5249 17.872 6.5249 14.8008V7.59018L15.8582 4.10352L25.1916 7.59018V14.8008C25.1916 17.8711 24.3058 20.6311 22.5342 23.0808C20.7627 25.5306 18.5373 27.1528 15.8582 27.9502ZM15.8582 26.5355C18.1693 25.8022 20.0805 24.3355 21.5916 22.1355C23.1027 19.9355 23.8582 17.4911 23.8582 14.8022V8.50085L15.8582 5.52752L7.85824 8.50085V14.8008C7.85824 17.4897 8.61379 19.9342 10.1249 22.1342C11.636 24.3342 13.5471 25.8022 15.8582 26.5355Z" fill="black" />
    </svg>
  )
}

function DeleteAccountIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="27" viewBox="0 0 25 27" fill="none">
      <path d="M10.4624 9.99414C10.4624 9.86982 10.413 9.75059 10.3251 9.66268C10.2372 9.57478 10.118 9.52539 9.99365 9.52539C9.86933 9.52539 9.7501 9.57478 9.6622 9.66268C9.57429 9.75059 9.5249 9.86982 9.5249 9.99414V20.3066C9.5249 20.431 9.57429 20.5502 9.6622 20.6381C9.7501 20.726 9.86933 20.7754 9.99365 20.7754C10.118 20.7754 10.2372 20.726 10.3251 20.6381C10.413 20.5502 10.4624 20.431 10.4624 20.3066V9.99414ZM14.6812 9.52539C14.8055 9.52539 14.9247 9.57478 15.0126 9.66268C15.1005 9.75059 15.1499 9.86982 15.1499 9.99414V20.3066C15.1499 20.431 15.1005 20.5502 15.0126 20.6381C14.9247 20.726 14.8055 20.7754 14.6812 20.7754C14.5568 20.7754 14.4376 20.726 14.3497 20.6381C14.2618 20.5502 14.2124 20.431 14.2124 20.3066V9.99414C14.2124 9.86982 14.2618 9.75059 14.3497 9.66268C14.4376 9.57478 14.5568 9.52539 14.6812 9.52539ZM16.5562 4.36914V4.83789H24.0562C24.1805 4.83789 24.2997 4.88728 24.3876 4.97518C24.4755 5.06309 24.5249 5.18232 24.5249 5.30664C24.5249 5.43096 24.4755 5.55019 24.3876 5.6381C24.2997 5.726 24.1805 5.77539 24.0562 5.77539H21.6721L20.1458 22.5632C20.0506 23.6118 19.5667 24.5869 18.7892 25.2969C18.0117 26.0069 16.9969 26.4005 15.944 26.4004H8.73084C7.67794 26.4005 6.66306 26.0069 5.88557 25.2969C5.10808 24.5869 4.62419 23.6118 4.52896 22.5632L3.00272 5.77539H0.618652C0.494332 5.77539 0.375104 5.726 0.287196 5.6381C0.199288 5.55019 0.149902 5.43096 0.149902 5.30664C0.149902 5.18232 0.199288 5.06309 0.287196 4.97518C0.375104 4.88728 0.494332 4.83789 0.618652 4.83789H8.11865V4.36914C8.11865 3.25026 8.56313 2.1772 9.3543 1.38603C10.1455 0.594865 11.2185 0.150391 12.3374 0.150391C13.4563 0.150391 14.5293 0.594865 15.3205 1.38603C16.1117 2.1772 16.5562 3.25026 16.5562 4.36914ZM9.05615 4.36914V4.83789H15.6187V4.36914C15.6187 3.4989 15.273 2.6643 14.6576 2.04895C14.0422 1.43359 13.2076 1.08789 12.3374 1.08789C11.4672 1.08789 10.6326 1.43359 10.0172 2.04895C9.40185 2.6643 9.05615 3.4989 9.05615 4.36914ZM3.9449 5.77539L5.46365 22.4788C5.53779 23.294 5.91392 24.052 6.51823 24.6041C7.12253 25.1562 7.91137 25.4625 8.7299 25.4629H15.943C16.7619 25.463 17.5512 25.1569 18.1559 24.6048C18.7606 24.0526 19.137 23.2943 19.2112 22.4788L20.7308 5.77539H3.9449Z" fill="black" stroke="black" strokeWidth="0.3" />
    </svg>
  )
}


const NAV_ITEMS = [
  { label: 'Address', to: ROUTES.ADDRESS, icon: LocationPinIcon },
  { label: 'Orders', to: ROUTES.ORDERS, icon: PackageIcon },
 
  { label: 'Coupons', to: ROUTES.COUPONS, icon: TagIcon },
  { label: 'Wallet', to: ROUTES.WALLET, icon: WalletIcon },
  { label: 'Gift Card', to: ROUTES.GIFTCARD, icon: Gift },
  { label: 'Refer and Earn', to: ROUTES.REFER_EARN, icon: HandCoins },
  { label: 'Redeem Coins', to: ROUTES.REDEEM_COINS, icon: CoinsIcon },

  { label: 'Contact Us', to: ROUTES.CONTACT_US, icon: PhoneIcon },
  { label: 'Terms & Conditions', to: ROUTES.TERMS_CONDITIONS, icon: DocumentIcon },
  { label: 'Privacy Policy', to: ROUTES.PRIVACY_POLICY, icon: PrivacyPolicyIcon },
  { label: 'Delete Account', to: ROUTES.DELETE_ACCOUNT, icon: DeleteAccountIcon },
]

export default function ProfileModal({ open, onClose }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { wishlistCount, cartCount } = useCartWishlist()
  const displayName = user?.name ?? [user?.firstName, user?.lastName].filter(Boolean).join(' ') ?? 'User'
  const avatarUrl = user?.profileImage ?? user?.avatar ?? user?.image ?? null

  const handleUpdateProfile = () => {
    onClose()
    navigate(ROUTES.PROFILE_UPDATE)
  }

  const [logoutToast, setLogoutToast] = useState(false)

  useEffect(() => {
    if (!logoutToast) return
    const id = setTimeout(() => setLogoutToast(false), 2000)
    return () => clearTimeout(id)
  }, [logoutToast])

  const handleLogout = () => {
    logout()
    onClose()
    setLogoutToast(true)
  }

  const handleNavClick = () => {
    onClose()
  }

  const [entered, setEntered] = useState(false)
  useEffect(() => {
    if (open) {
      setEntered(false)
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true))
      })
      return () => cancelAnimationFrame(id)
    } else {
      setEntered(false)
    }
  }, [open])

  if (!open && !logoutToast) return null

  return (
    <>
      {logoutToast && (
        <div className="fixed top-4 sm:top-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[60] flex justify-center">
          <div className="px-4 py-2 rounded-full bg-black text-white text-xs font-medium">
            Logged out successfully
          </div>
        </div>
      )}
      {open && (
      <>
      <div
        className="fixed inset-0 z-40 bg-black/30 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[400px] bg-white flex flex-col shadow-2xl transition-transform duration-300 ease-out"
        style={{ transform: entered ? 'translateX(0)' : 'translateX(100%)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Profile"
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 py-4 px-4 border-b border-gray-200">
          <h2 className="font-inter text-xl font-semibold uppercase tracking-wide text-black">Profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center text-black hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-8 pb-6">
          {/* User card */}
          <div className="rounded-xl bg-black p-4 flex items-center gap-4 mb-6">
            <div className="shrink-0 w-14 h-14 rounded-full overflow-hidden border-2 border-white bg-gray-700">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="font-inter w-full h-full flex items-center justify-center text-white text-lg font-semibold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-['Roboto'] font-bold text-white uppercase tracking-wide truncate">
                {displayName}
              </p>
              {/* <p className="font-inter text-sm text-white/90 truncate">Style Preference Here</p> */}
            </div>
          </div>

          {/* Wishlist & Cart (primary on mobile/tablet where they’re not in header) */}
          <div className="flex flex-col gap-2 mb-6 md:hidden">
            <Link
              to={ROUTES.WISHLIST}
              onClick={handleNavClick}
              className="font-inter flex items-center gap-3 py-3 px-4 rounded-lg border border-gray-200 text-black text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <HeartIcon className="h-5 w-5 shrink-0 text-gray-600" />
              <span className="flex-1">Wishlist</span>
              {wishlistCount > 0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-black text-white text-xs font-medium px-1.5">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
              <ChevronRightIcon className="h-5 w-5 shrink-0 text-gray-400" />
            </Link>
            <Link
              to={ROUTES.CART}
              onClick={handleNavClick}
              className="font-inter flex items-center gap-3 py-3 px-4 rounded-lg border border-gray-200 text-black text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <CartIcon className="h-5 w-5 shrink-0 text-gray-600" />
              <span className="flex-1">Cart</span>
              {cartCount > 0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-black text-white text-xs font-medium px-1.5">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
              <ChevronRightIcon className="h-5 w-5 shrink-0 text-gray-400" />
            </Link>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 mb-6">
            <button
              type="button"
              onClick={handleUpdateProfile}
              className="font-inter w-full py-3 px-4  bg-black text-white text-sm font-semibold uppercase tracking-wide hover:bg-gray-800 transition-colors"
            >
              Update Profile
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="font-inter w-full py-3 px-4 bg-white border border-black text-black text-sm font-semibold uppercase tracking-wide hover:bg-gray-50 transition-colors"
            >
              Log Out
            </button>
          </div>

          {/* Account nav list */}
          <nav className="flex flex-col uppercase">
            {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
              <Link
                key={label}
                to={to}
                onClick={handleNavClick}
                className="font-inter flex items-center gap-3 py-4 text-black text-sm hover:bg-gray-50/80 transition-colors border-b border-gray-100 last:border-0 w-full text-left"
              >
                <Icon className="h-5 w-5 shrink-0 text-gray-600" />
                <span className="flex-1">{label}</span>
                <ChevronRightIcon className="h-5 w-5 shrink-0 text-gray-400" />
              </Link>
            ))}
          </nav>
        </div>
      </div>
      </>
      )}
    </>
  )
}
