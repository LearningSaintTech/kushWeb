import girlImg from '../../../assets/images/community/communitygirl.jpg'
import bannerImg from '../../../assets/images/community/Banners.jpeg'
import menImg from '../../../assets/images/home/category-men.jpg'
import womenImg from '../../../assets/images/home/category-women.jpg'
import unisexImg from '../../../assets/images/home/category-unisex.jpg'

const GRID_STYLES = [
  'bg-[linear-gradient(145deg,#a23eea_0%,#e94cc1_34%,#00c3e8_68%,#086acf_100%)]',
  'bg-[radial-gradient(circle_at_35%_30%,#ffffff_0_13%,transparent_14%),radial-gradient(circle_at_68%_62%,#ffffff_0_14%,transparent_15%),linear-gradient(135deg,#f4f4f4,#d7d7d7)]',
  'bg-[linear-gradient(135deg,#dde7eb_0%,#f7fbfc_45%,#b8d7e4_100%)]',
  'bg-[linear-gradient(155deg,#1b7cc1_0%,#2ad3d1_45%,#7356e8_100%)]',
  'bg-[linear-gradient(160deg,#0f0f10_0%,#2a2a2e_55%,#6b5cff_100%)]',
  'bg-[linear-gradient(135deg,#f4d4b8_0%,#e8a87c_50%,#c38d9e_100%)]',
  'bg-[linear-gradient(145deg,#e8f5e9_0%,#81c784_45%,#2e7d32_100%)]',
  'bg-[linear-gradient(145deg,#fff3e0_0%,#ffb74d_50%,#ef6c00_100%)]',
  'bg-[linear-gradient(145deg,#e3f2fd_0%,#64b5f6_45%,#1565c0_100%)]',
]

export const CREATOR_PROFILE = {
  name: 'Maya Chen',
  handle: 'maya.creates',
  role: 'CREATOR',
  avatar: girlImg,
  bio: 'Exploring the intersection of art and tech. 🎨\nNew video every Sunday! ✨',
  website: 'mayacreates.com',
  stats: {
    posts: '482',
    followers: '124k',
    following: '854',
  },
}

export const CREATOR_DASHBOARD = {
  range: 'Last 30 days',
  earnings: {
    total: '$4,620.00',
    change: '+19.8%',
    creator: '$2,840',
    royalties: '$1,780',
  },
  summary: [
    { label: 'Likes', value: '1.2M' },
    { label: 'Views', value: '8.4M' },
    { label: 'Posts', value: '48' },
  ],
  earningsPerPost: [
    {
      id: 'ep1',
      rank: 1,
      title: 'Summer Drip Collection',
      views: '1.2M views',
      earnings: '+$840',
      image: menImg,
    },
    {
      id: 'ep2',
      rank: 2,
      title: 'Behind the Seams: Making...',
      views: '542K views',
      earnings: '+$620',
      image: bannerImg,
    },
    {
      id: 'ep3',
      rank: 3,
      title: 'Street Style Lookbook',
      views: '380K views',
      earnings: '+$480',
      image: unisexImg,
    },
    {
      id: 'ep4',
      rank: 4,
      title: 'Fabric & Color Theory',
      views: '210K views',
      earnings: '+$540',
      image: womenImg,
    },
    {
      id: 'ep5',
      rank: 5,
      title: 'Monday Fit Check',
      views: '98K views',
      earnings: '+$360',
      image: girlImg,
    },
  ],
  topPosts: [
    { id: 'tp1', rank: '1ST', views: '1.2M views', image: unisexImg, style: GRID_STYLES[0] },
    { id: 'tp2', rank: '2ND', views: '842K views', image: menImg, style: GRID_STYLES[3] },
    { id: 'tp3', rank: '3RD', views: '650K views', image: womenImg, style: GRID_STYLES[4] },
  ],
}

export const CREATOR_MEDIA = {
  Posts: Array.from({ length: 9 }, (_, i) => ({
    id: `cp-${i + 1}`,
    type: 'post',
    image: i % 3 === 0 ? girlImg : null,
    style: GRID_STYLES[i % GRID_STYLES.length],
  })),
  Reels: Array.from({ length: 6 }, (_, i) => ({
    id: `cr-${i + 1}`,
    type: 'reel',
    image: girlImg,
    style: GRID_STYLES[(i + 2) % GRID_STYLES.length],
  })),
  Tagged: Array.from({ length: 6 }, (_, i) => ({
    id: `ct-${i + 1}`,
    type: 'tagged',
    image: i % 2 === 0 ? girlImg : null,
    style: GRID_STYLES[(i + 4) % GRID_STYLES.length],
  })),
}

export const DESIGNER_PROFILE = {
  name: 'Alex Riverton',
  handle: 'ariverton_ui',
  badge: 'UI DESIGNER',
  openToWork: true,
  avatar: girlImg,
  tagline: 'San Francisco-based designer crafting quiet luxury interfaces.',
  bio: 'I design digital products with a focus on clarity, craft, and calm motion. Currently open to collaborations.',
  location: 'San Francisco, CA',
  stats: {
    followers: '24',
    following: '112',
    posts: '8',
  },
  skills: [
    { name: 'UI Design', level: 95 },
    { name: 'Brand Identity', level: 88 },
    { name: 'Web Design', level: 78 },
  ],
  links: [
    { platform: 'website', label: 'Website', url: 'ariverton.design' },
    { platform: 'twitter', label: 'Twitter', url: 'twitter.com/ariverton' },
    { platform: 'behance', label: 'Behance', url: 'behance.net/ariverton' },
    { platform: 'dribbble', label: 'Dribbble', url: 'dribbble.com/ariverton' },
  ],
}

export const DESIGNER_DASHBOARD = {
  range: 'Last 30 days',
  earnings: {
    total: '$4,620.00',
    change: '+19.8%',
    creator: '$2,840',
    royalties: '$1,780',
  },
  summary: [
    { label: 'Likes', value: '1.2M' },
    { label: 'Views', value: '8.4M' },
    { label: 'Posts', value: '48' },
  ],
  earningsPerPost: [
    {
      id: 'dp1',
      rank: 1,
      title: 'Summer Drip Collection',
      views: '1.2M views',
      earnings: '+$840',
      image: menImg,
    },
    {
      id: 'dp2',
      rank: 2,
      title: 'Behind the Seams: Making...',
      views: '542K views',
      earnings: '+$620',
      image: bannerImg,
    },
    {
      id: 'dp3',
      rank: 3,
      title: 'Street Style Lookbook',
      views: '380K views',
      earnings: '+$480',
      image: unisexImg,
    },
    {
      id: 'dp4',
      rank: 4,
      title: 'Fabric & Color Theory',
      views: '210K views',
      earnings: '+$540',
      image: womenImg,
    },
    {
      id: 'dp5',
      rank: 5,
      title: 'Monday Fit Check',
      views: '98K views',
      earnings: '+$360',
      image: girlImg,
    },
  ],
  topPosts: [
    { id: 'dt1', views: '1.2M views', image: unisexImg, style: GRID_STYLES[0] },
    { id: 'dt2', views: '380K views', image: menImg, style: GRID_STYLES[3] },
    { id: 'dt3', views: '210K views', image: womenImg, style: GRID_STYLES[5] },
  ],
}

export const PROJECT_CATEGORIES = [
  'UI/UX Design',
  'Fashion',
  'Luxury Brand',
  'Editorial',
  'Streetwear',
]

export const PROJECT_CATEGORY_COLORS = {
  Fashion: 'text-[#FF5CA8]',
  'Luxury Brand': 'text-[#E8B84A]',
  Editorial: 'text-[#C44DFF]',
  Streetwear: 'text-[#FF8A3D]',
  'UI/UX Design': 'text-[#7C5CFF]',
}

export const DESIGNER_PROJECTS = [
  {
    id: 'proj-1',
    title: 'Street Style Lookbook',
    category: 'Fashion',
    views: '14k',
    image: girlImg,
    style: GRID_STYLES[4],
    description: 'Urban fashion lookbook exploring silhouette and texture.',
    tools: ['Figma', 'After Effects'],
    status: 'published',
  },
  {
    id: 'proj-2',
    title: 'Maison Lumière',
    category: 'Luxury Brand',
    views: '8k',
    image: girlImg,
    style: GRID_STYLES[5],
    description: 'Identity system for a quiet-luxury house.',
    tools: ['Figma', 'Spline'],
    status: 'published',
  },
  {
    id: 'proj-3',
    title: 'Street Style Lookbook',
    category: 'Fashion',
    views: '14k',
    image: girlImg,
    style: GRID_STYLES[0],
    description: 'Editorial street looks for SS campaign.',
    tools: ['Figma'],
    status: 'published',
  },
  {
    id: 'proj-4',
    title: 'Vogue Covers',
    category: 'Editorial',
    views: '12k',
    image: girlImg,
    style: GRID_STYLES[3],
    description: 'Magazine cover concepts and layouts.',
    tools: ['Figma', 'After Effects'],
    status: 'published',
  },
  {
    id: 'proj-5',
    title: 'Urban Threads',
    category: 'Streetwear',
    views: '5k',
    image: girlImg,
    style: GRID_STYLES[7],
    description: 'Streetwear drop visuals and product story.',
    tools: ['Figma', 'Spline'],
    status: 'published',
  },
  {
    id: 'proj-6',
    title: 'Vogue Covers',
    category: 'Editorial',
    views: '12k',
    image: girlImg,
    style: GRID_STYLES[6],
    description: 'Secondary cover series.',
    tools: ['Figma'],
    status: 'published',
  },
  {
    id: 'proj-7',
    title: 'Couture SS25',
    category: 'Fashion',
    views: '9k',
    image: girlImg,
    style: GRID_STYLES[8],
    description: 'Runway lookbook for couture SS25.',
    tools: ['Figma', 'After Effects', 'Spline'],
    status: 'published',
  },
  {
    id: 'proj-8',
    title: 'Noir Collection',
    category: 'Luxury Brand',
    views: '11k',
    image: girlImg,
    style: GRID_STYLES[4],
    description: 'Monochrome luxury collection campaign.',
    tools: ['Figma'],
    status: 'published',
  },
  {
    id: 'proj-9',
    title: 'Couture SS25',
    category: 'Fashion',
    views: '9k',
    image: girlImg,
    style: GRID_STYLES[5],
    description: 'Additional couture frames.',
    tools: ['Figma', 'After Effects'],
    status: 'published',
  },
]

