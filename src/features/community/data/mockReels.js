import girlImg from '../../../assets/images/community/communitygirl.jpg'
import reelVideo from '../../../assets/images/community/reels.mp4'
import topImg from '../../../assets/images/community/top.svg'

const PRODUCTS = [
  { id: 'rp1', name: 'Linen Blend Top', price: '₹2,499', image: topImg },
  { id: 'rp2', name: 'Linen Blend Top', price: '₹2,499', image: topImg },
  { id: 'rp3', name: 'Linen Blend Top', price: '₹2,499', image: topImg },
  { id: 'rp4', name: 'Linen Blend Top', price: '₹2,499', image: topImg },
]

/**
 * Mock community reels.
 * Same video asset reused with different metadata for pagination demos.
 */
export const MOCK_REELS = [
  {
    id: 'reel-1',
    video: reelVideo,
    poster: girlImg,
    author: {
      name: 'Rhea Kapoor',
      handle: 'rheakapoor',
      role: 'CREATOR',
      avatar: girlImg,
    },
    caption:
      'The humidity is real. Black linen is the only way to stay cool while looking chic.',
    likes: '1.2K',
    comments: '45',
    designedBy: 'Alice Mark',
    taggedProducts: PRODUCTS,
  },
  {
    id: 'reel-2',
    video: reelVideo,
    poster: girlImg,
    author: {
      name: 'Alex Riverton',
      handle: 'alexriverton',
      role: 'DESIGNER',
      avatar: girlImg,
    },
    caption:
      'Soft drapes, hard light. A quick walkthrough of the Summer Edit set.',
    likes: '3.4K',
    comments: '112',
    designedBy: 'Alex Riverton',
    taggedProducts: PRODUCTS,
  },
  {
    id: 'reel-3',
    video: reelVideo,
    poster: girlImg,
    author: {
      name: 'Aditi Rao',
      handle: 'aditirao',
      role: 'CREATOR',
      avatar: girlImg,
    },
    caption:
      'Layering neutrals never fails. Save this look for your next travel day.',
    likes: '890',
    comments: '36',
    designedBy: 'Studio Khush',
    taggedProducts: PRODUCTS,
  },
]
