import girlImg from '../../../assets/images/community/communitygirl.jpg'

export const FEED_FILTERS = [
  'All',
  'Trending',
  'Creators',
  'My Feed',
  'Discover',
  'Notifications',
  'Profile',
]

const DEFAULT_COMMENTS = [
  {
    id: 'c1',
    name: 'Maya Chen',
    avatar: girlImg,
    time: '2h ago',
    text: 'This look is everything! Where did you get the earrings?',
  },
  {
    id: 'c2',
    name: 'Jordan Lee',
    avatar: girlImg,
    time: '4h ago',
    text: 'Need this set for summer travel. Obsessed with the drape.',
  },
  {
    id: 'c3',
    name: 'Priya Nair',
    avatar: girlImg,
    time: '1d ago',
    text: 'Gold accents were the perfect touch. Saving this for later!',
  },
]

const DEFAULT_PRODUCTS = [
  { id: 'p1', name: 'Linen Top', price: '₹2,499', image: girlImg },
  { id: 'p2', name: 'Wide Trouser', price: '₹3,299', image: girlImg },
]

export const MOCK_POSTS = [
  {
    id: '1',
    author: {
      name: 'Rhea Kapoor',
      handle: 'rheakapoor',
      role: 'CREATOR',
      avatar: girlImg,
    },
    image: girlImg,
    images: [girlImg, girlImg],
    likes: '1.2K',
    comments: '48',
    commentCount: 48,
    date: 'AUGUST 12',
    designedBy: 'Alice Mark',
    caption:
      'Minimalist black linen sets are the only way to survive this humidity. Pair it with gold accents for an elevated look.',
    taggedProducts: DEFAULT_PRODUCTS,
    commentList: DEFAULT_COMMENTS,
  },
  {
    id: '2',
    author: {
      name: 'Alex Riverton',
      handle: 'alexriverton',
      role: 'DESIGNER',
      avatar: girlImg,
    },
    image: girlImg,
    images: [girlImg, girlImg],
    likes: '3.4K',
    comments: '112',
    commentCount: 112,
    date: 'AUGUST 10',
    designedBy: 'Alex Riverton',
    caption:
      'Desert light and soft drapes — this editorial set was shot at golden hour for the Summer Edit collection.',
    taggedProducts: DEFAULT_PRODUCTS,
    commentList: DEFAULT_COMMENTS,
  },
  {
    id: '3',
    author: {
      name: 'Aditi Rao',
      handle: 'aditirao',
      role: 'CREATOR',
      avatar: girlImg,
    },
    image: girlImg,
    images: [girlImg, girlImg],
    likes: '890',
    comments: '36',
    commentCount: 36,
    date: 'AUGUST 08',
    designedBy: 'Alice Mark',
    caption:
      'Layering neutrals never fails. Swipe for the full look and shop the pieces tagged below.',
    taggedProducts: DEFAULT_PRODUCTS,
    commentList: DEFAULT_COMMENTS,
  },
  {
    id: '4',
    author: {
      name: 'Ishaan Dev',
      handle: 'ishaandev',
      role: 'CREATOR',
      avatar: girlImg,
    },
    image: girlImg,
    images: [girlImg, girlImg],
    likes: '2.1K',
    comments: '74',
    commentCount: 74,
    date: 'AUGUST 05',
    designedBy: 'Studio Khush',
    caption:
      'Texture over trends. This woven set is my go-to for travel days that still need to look intentional.',
    taggedProducts: DEFAULT_PRODUCTS,
    commentList: DEFAULT_COMMENTS,
  },
]

export const SUGGESTED_CREATORS = [
  {
    id: 's1',
    name: 'Alex Riverton',
    role: 'DESIGNER',
    roleTone: 'designer',
    avatar: girlImg,
  },
  {
    id: 's2',
    name: 'Aditi Rao',
    role: 'CREATOR',
    roleTone: 'creator',
    avatar: girlImg,
  },
  {
    id: 's3',
    name: 'Ishaan Dev',
    role: 'CREATOR',
    roleTone: 'creator',
    avatar: girlImg,
  },
]

export const TRENDING_HASHTAGS = [
  { tag: '#SummerEdit', posts: '1.2k posts' },
  { tag: '#LinenLook', posts: '1.2k posts' },
  { tag: '#Minimalism', posts: '1.2k posts' },
  { tag: '#DesignInspiration', posts: '1.2k posts' },
]

export const SEARCH_FILTERS = [
  'All',
  'Fashion',
  'Trending',
  'Creators',
  'Design',
  'Lifestyle',
]

const SEARCH_ASPECTS = [
  'aspect-[3/4]',
  'aspect-[4/5]',
  'aspect-[3/5]',
  'aspect-[4/5]',
  'aspect-[3/4]',
  'aspect-[2/3]',
  'aspect-[4/5]',
  'aspect-[3/4]',
  'aspect-[3/5]',
]

export const MOCK_SEARCH_RESULTS = Array.from({ length: 9 }, (_, i) => ({
  id: `search-${i + 1}`,
  image: girlImg,
  userName: 'User Name',
  avatar: girlImg,
  likes: '1.2K',
  category: SEARCH_FILTERS[(i % (SEARCH_FILTERS.length - 1)) + 1],
  aspect: SEARCH_ASPECTS[i % SEARCH_ASPECTS.length],
}))

const SAVED_STYLES = [
  'bg-[linear-gradient(145deg,#f6f7f5_0%,#d9ddd8_100%)]',
  'bg-[linear-gradient(145deg,#a23eea_0%,#e94cc1_34%,#00c3e8_68%,#086acf_100%)]',
  'bg-[radial-gradient(circle_at_35%_30%,#ffffff_0_13%,transparent_14%),radial-gradient(circle_at_68%_62%,#ffffff_0_14%,transparent_15%),linear-gradient(135deg,#f4f4f4,#d7d7d7)]',
  'bg-[linear-gradient(135deg,#dde7eb_0%,#f7fbfc_45%,#b8d7e4_100%)]',
  'bg-[linear-gradient(155deg,#1b7cc1_0%,#2ad3d1_45%,#7356e8_100%)]',
  'bg-[linear-gradient(160deg,#0f0f10_0%,#2a2a2e_55%,#6b5cff_100%)]',
  'bg-[linear-gradient(135deg,#f4d4b8_0%,#e8a87c_50%,#c38d9e_100%)]',
  'bg-[linear-gradient(145deg,#e8f5e9_0%,#81c784_45%,#2e7d32_100%)]',
  'bg-[linear-gradient(145deg,#fff3e0_0%,#ffb74d_50%,#ef6c00_100%)]',
  'bg-[linear-gradient(145deg,#e3f2fd_0%,#64b5f6_45%,#1565c0_100%)]',
  'bg-[linear-gradient(145deg,#fce4ec_0%,#f06292_50%,#ad1457_100%)]',
  'bg-[linear-gradient(145deg,#efebe9_0%,#a1887f_50%,#5d4037_100%)]',
]

/** Dense mosaic for Saved / Favourites grid — each item links to a feed post */
export const MOCK_SAVED_ITEMS = Array.from({ length: 21 }, (_, i) => {
  const usePhoto = i % 5 === 0
  const post = MOCK_POSTS[i % MOCK_POSTS.length]
  return {
    id: `saved-${i + 1}`,
    type: 'image',
    postId: post.id,
    image: usePhoto ? post.image : null,
    style: SAVED_STYLES[i % SAVED_STYLES.length],
  }
})

export const MOCK_SAVED_REELS = Array.from({ length: 8 }, (_, i) => {
  const post = MOCK_POSTS[i % MOCK_POSTS.length]
  return {
    id: `saved-reel-${i + 1}`,
    type: 'reel',
    postId: post.id,
    image: post.image,
    style: SAVED_STYLES[(i + 3) % SAVED_STYLES.length],
  }
})

